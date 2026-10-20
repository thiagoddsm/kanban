import { EvolutionApiService, DEFAULT_EVOLUTION_CONFIG } from './evolutionApiService';
import { Organization, Task, User, ChecklistItem } from '../types';
import { WhatsAppReplyService } from './whatsappReplyService';

// Debounce map para notificações de checklist por tarefa
const checklistDebounceTimers = new Map<string, NodeJS.Timeout>();

export class WhatsAppNotificationService {
  private static resolveBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return 'https://studio-5589719834-7481b.web.app';
      }
      return origin;
    }
    return 'https://studio-5589719834-7481b.web.app';
  }

  private static resolveTaskUrl(org: Organization): string {
    const baseUrl = this.resolveBaseUrl();
    const slug = org.slug || 'ib';
    return `${baseUrl}/${slug}/tasks`;
  }

  public static resolveQuickTaskUrl(org: Organization, taskId: string): string {
    const baseUrl = this.resolveBaseUrl();
    const slug = org.slug || 'ib';
    return `${baseUrl}/${slug}/wa/${taskId}`;
  }

  /**
   * Resolve a instância a ser utilizada para o envio:
   * Prioridade: Instância conectada do autor -> Instância da Organização (Oiko_Gestao)
   */
  private static resolveInstanceName(org: Organization, authorUser?: User | null): string {
    const orgInstance =
      org.evolutionConfig?.instanceName ||
      EvolutionApiService.buildOrgInstanceName(org?.name, org?.slug);

    if (authorUser?.whatsappConnected && authorUser?.whatsappInstanceName) {
      return authorUser.whatsappInstanceName;
    }
    return orgInstance;
  }

  /**
   * Formata visualmente o bloco de Checklist / Subtarefas (2/3)
   */
  public static formatChecklistBlock(task: Task): string {
    if (!task.checklist || task.checklist.length === 0) return '';

    const items: ChecklistItem[] = task.checklist.map((item, idx) =>
      typeof item === 'string' ? { id: `chk_${idx}`, text: item, completed: false } : item
    );

    const completed = items.filter((i) => i.completed).length;
    const total = items.length;

    const listText = items
      .slice(0, 8)
      .map((item, idx) => `${item.completed ? '✅' : '⬜'} *${idx + 1}.* ${item.text}`)
      .join('\n');

    const extra = total > 8 ? `\n_...e mais ${total - 8} subtarefa(s)_` : '';

    return `\n\n☑️ *Checklist / Subtarefas (${completed}/${total}):*\n${listText}${extra}`;
  }

  /**
   * Cria o rodapé interativo com código de referência, link de edição expressa e guia de resposta
   */
  private static buildInteractiveFooter(org: Organization, task: Task): string {
    const quickUrl = this.resolveQuickTaskUrl(org, task.id);
    const shortRef = task.id.length > 8 ? task.id.slice(-6) : task.id;

    return `\n\n⚡ *Editar Tarefa:* ${quickUrl}\n\n💬 _Responda no WhatsApp para comentar, ou envie:_\n*1* Em Andamento | *2* Revisão | *3* Concluído | *C1, C2...* Concluir Subtarefa\n🔖 Ref: #T-${shortRef}`;
  }

  /**
   * Notifica responsável quando uma demanda é atribuída a ele
   */
  public static async notifyTaskAssigned({
    organization,
    task,
    assigneeUser,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    assigneeUser?: User | null;
    actorUser?: User | null;
  }): Promise<boolean> {
    if (!assigneeUser) return false;

    // Verifica se a organização habilitou notificações no WhatsApp
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskCreated === false) {
      return false;
    }

    // Verifica se o usuário destinatário aceita receber WhatsApp
    if (assigneeUser.notifyWhatsApp === false) return false;

    const phone = assigneeUser.whatsapp || assigneeUser.phone;
    if (!phone) {
      console.warn(`[WhatsAppNotify] Usuário ${assigneeUser.name} não possui telefone/WhatsApp cadastrado.`);
      return false;
    }

    const actorName = actorUser?.name || 'Liderança';
    const deadlineFormatted = task.deadline
      ? new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'Sem prazo definido';

    const firstName = (assigneeUser.name || (assigneeUser.email ? assigneeUser.email.split('@')[0] : 'Membro')).split(' ')[0];
    const checklistBlock = this.formatChecklistBlock(task);
    const footer = this.buildInteractiveFooter(organization, task);

    const text = `📋 *Nova Demanda Atribuída - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* atribuiu uma nova demanda para você:\n\n📌 *Título:* ${task.title}\n📅 *Prazo:* ${deadlineFormatted}\n🏷️ *Prioridade:* ${task.priority || 'Média'}${checklistBlock}${footer}`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });

      if (res.success) {
        WhatsAppReplyService.recordTaskContext(
          organization.id,
          phone,
          task.id,
          task.title,
          res.messageId
        );
      }

      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de atribuição:', err);
      return false;
    }
  }

  /**
   * Notifica usuário mencionado em comentário (@Nome)
   */
  public static async notifyTaskMention({
    organization,
    task,
    mentionedUser,
    actorUser,
    content,
  }: {
    organization: Organization;
    task: Task;
    mentionedUser: User;
    actorUser?: User | null;
    content: string;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnMention === false) {
      return false;
    }

    if (mentionedUser.notifyWhatsApp === false) return false;

    const phone = mentionedUser.whatsapp || mentionedUser.phone;
    if (!phone) {
      console.warn(`[WhatsAppNotify] Usuário ${mentionedUser.name} não possui telefone cadastrado.`);
      return false;
    }

    const actorName = actorUser?.name || 'Um membro';
    const firstName = (mentionedUser.name || (mentionedUser.email ? mentionedUser.email.split('@')[0] : 'Membro')).split(' ')[0];
    const footer = this.buildInteractiveFooter(organization, task);
    const text = `💬 *Você foi mencionado(a) - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* mencionou você na demanda:\n📋 *"${task.title}"*\n\n💭 *Mensagem:* _"${content}"_${footer}`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });

      if (res.success) {
        WhatsAppReplyService.recordTaskContext(
          organization.id,
          phone,
          task.id,
          task.title,
          res.messageId
        );
      }

      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de menção:', err);
      return false;
    }
  }

  /**
   * Notifica quando uma demanda for bloqueada (gargalo)
   */
  public static async notifyTaskBlocked({
    organization,
    task,
    targetUser,
    reason,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    targetUser: User;
    reason: string;
    actorUser?: User | null;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskBlocked === false) {
      return false;
    }

    if (targetUser.notifyWhatsApp === false) return false;

    const phone = targetUser.whatsapp || targetUser.phone;
    if (!phone) return false;

    const actorName = actorUser?.name || 'Um membro';
    const footer = this.buildInteractiveFooter(organization, task);
    const text = `🚨 *Alerta de Demanda Bloqueada (Gargalo) - Kanban Oiko*\n\nA demanda *"${task.title}"* foi sinalizada como bloqueada por *${actorName}*.\n\n⚠️ *Motivo do Bloqueio:* _"${reason}"_${footer}`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });

      if (res.success) {
        WhatsAppReplyService.recordTaskContext(
          organization.id,
          phone,
          task.id,
          task.title,
          res.messageId
        );
      }

      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de bloqueio:', err);
      return false;
    }
  }

  /**
   * Notifica quando uma demanda for aprovada
   */
  public static async notifyTaskApproved({
    organization,
    task,
    targetUser,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    targetUser: User;
    actorUser?: User | null;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskApproved === false) {
      return false;
    }

    if (targetUser.notifyWhatsApp === false) return false;

    const phone = targetUser.whatsapp || targetUser.phone;
    if (!phone) return false;

    const actorName = actorUser?.name || 'Líder';
    const firstName = (targetUser.name || (targetUser.email ? targetUser.email.split('@')[0] : 'Membro')).split(' ')[0];
    const footer = this.buildInteractiveFooter(organization, task);
    const text = `🎉 *Demanda Aprovada pela Revisão! - Kanban Oiko*\n\nOlá, *${firstName}*!\nA entrega para a demanda *"${task.title}"* foi revisada e *APROVADA* por *${actorName}*. Parabéns pelo trabalho! 🚀\n\nA demanda já está na coluna *Aprovado pela Revisão*. Agora você pode realizar a ação final (postagem, envio, etc.) e depois mover para *Concluído*.${footer}`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });

      if (res.success) {
        WhatsAppReplyService.recordTaskContext(
          organization.id,
          phone,
          task.id,
          task.title,
          res.messageId
        );
      }

      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de aprovação:', err);
      return false;
    }
  }

  /**
   * Notifica avanço de Checklist / Subtarefas com debounce anti-spam
   */
  public static notifyChecklistProgress({
    organization,
    task,
    targetUsers,
    actorUser,
    completedItemText,
  }: {
    organization: Organization;
    task: Task;
    targetUsers: User[];
    actorUser?: User | null;
    completedItemText?: string;
  }): void {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnChecklistUpdate === false) {
      return;
    }

    // Debounce de 7 segundos para agrupar múltiplos checks seguidos em uma só mensagem
    const existing = checklistDebounceTimers.get(task.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      checklistDebounceTimers.delete(task.id);

      const items: ChecklistItem[] = (task.checklist || []).map((item, idx) =>
        typeof item === 'string' ? { id: `chk_${idx}`, text: item, completed: false } : item
      );

      const completed = items.filter((i) => i.completed).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const actorName = actorUser?.name || 'Um membro';
      const checklistBlock = this.formatChecklistBlock(task);
      const footer = this.buildInteractiveFooter(organization, task);

      const instanceName = this.resolveInstanceName(organization, actorUser);

      for (const targetUser of targetUsers) {
        if (targetUser.notifyWhatsApp === false) continue;
        const phone = targetUser.whatsapp || targetUser.phone;
        if (!phone) continue;

        const firstName = (targetUser.name || (targetUser.email ? targetUser.email.split('@')[0] : 'Membro')).split(' ')[0];
        const text = `☑️ *Progresso de Subtarefas (${completed}/${total}) - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* atualizou etapas da demanda *"${task.title}"*:\n${completedItemText ? `\n✅ _${completedItemText}_\n` : ''}📊 *Andamento Geral:* ${completed} de ${total} concluídas (${pct}%)${checklistBlock}${footer}`;

        try {
          const res = await EvolutionApiService.sendTextMessage({
            instanceName,
            to: phone,
            text,
            configOverride: orgConfig,
          });

          if (res.success) {
            WhatsAppReplyService.recordTaskContext(
              organization.id,
              phone,
              task.id,
              task.title,
              res.messageId
            );
          }
        } catch (err) {
          console.warn('[WhatsAppNotify] Falha ao enviar aviso de checklist:', err);
        }
      }
    }, 7000);

    checklistDebounceTimers.set(task.id, timer);
  }

  /**
   * Alerta Matinal Consolidado de Prazos (2 dias antes e no dia do vencimento)
   * Agrupa todas as demandas de cada responsável em UMA única mensagem
   */
  public static async notifyDeadlineReminders({
    organization,
    tasks,
    users,
    actorUser,
  }: {
    organization: Organization;
    tasks: Task[];
    users: User[];
    actorUser?: User | null;
  }): Promise<{ sentCount: number }> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnDeadlineApproaching === false) {
      return { sentCount: 0 };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    // Filtra tarefas ativas não concluídas com prazo Hoje ou Daqui a 2 Dias
    const activeTasks = tasks.filter((t) => !t.isArchived && t.status !== 'DONE' && !!t.deadline);
    const todayTasks = activeTasks.filter((t) => t.deadline === todayStr);
    const soonTasks = activeTasks.filter((t) => t.deadline === in2DaysStr);

    if (todayTasks.length === 0 && soonTasks.length === 0) {
      return { sentCount: 0 };
    }

    // Agrupa por responsável
    const userGroups = new Map<string, { today: Task[]; soon: Task[] }>();

    const assignToGroup = (task: Task, isToday: boolean) => {
      const uids =
        task.assigneeIds && task.assigneeIds.length > 0
          ? task.assigneeIds
          : task.assigneeId
          ? [task.assigneeId]
          : [];

      uids.forEach((uid) => {
        const group = userGroups.get(uid) || { today: [], soon: [] };
        if (isToday) {
          if (!group.today.some((t) => t.id === task.id)) group.today.push(task);
        } else {
          if (!group.soon.some((t) => t.id === task.id)) group.soon.push(task);
        }
        userGroups.set(uid, group);
      });
    };

    todayTasks.forEach((t) => assignToGroup(t, true));
    soonTasks.forEach((t) => assignToGroup(t, false));

    let sentCount = 0;
    const instanceName = this.resolveInstanceName(organization, actorUser);

    for (const [userId, group] of userGroups.entries()) {
      const user = users.find((u) => u.id === userId);
      if (!user || user.notifyWhatsApp === false) continue;
      const phone = user.whatsapp || user.phone;
      if (!phone) continue;

      const firstName = (user.name || (user.email ? user.email.split('@')[0] : 'Membro')).split(' ')[0];
      const sections: string[] = [];

      if (group.today.length > 0) {
        const todayItems = group.today
          .map((t, idx) => {
            const chk = t.checklist || [];
            const chkDone = chk.filter((i: any) => typeof i === 'object' && i.completed).length;
            const chkInfo = chk.length > 0 ? ` [Subtarefas: ${chkDone}/${chk.length}]` : '';
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            return `${idx + 1}. *${t.title}*${chkInfo}\n   👉 Editar: ${quickUrl}`;
          })
          .join('\n');
        sections.push(`🚨 *VENCENDO HOJE (${group.today.length}):*\n${todayItems}`);
      }

      if (group.soon.length > 0) {
        const soonItems = group.soon
          .map((t, idx) => {
            const chk = t.checklist || [];
            const chkDone = chk.filter((i: any) => typeof i === 'object' && i.completed).length;
            const chkInfo = chk.length > 0 ? ` [Subtarefas: ${chkDone}/${chk.length}]` : '';
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            return `${idx + 1}. *${t.title}*${chkInfo}\n   👉 Editar: ${quickUrl}`;
          })
          .join('\n');
        sections.push(`⏳ *VENCEM EM 2 DIAS (${group.soon.length}):*\n${soonItems}`);
      }

      const kanbanUrl = this.resolveTaskUrl(organization);
      const primeTask = group.today[0] || group.soon[0];
      const shortRef = primeTask?.id ? (primeTask.id.length > 8 ? primeTask.id.slice(-6) : primeTask.id) : '';

      let footerGuide = '';
      if (primeTask) {
        footerGuide =
          `\n\n💬 *Como responder ou alterar via WhatsApp:*\n` +
          `• Responda esta mensagem com seu comentário (ex: "Gravando hoje!")\n` +
          `• Ou digite: *1* (Em Andamento) | *2* (Revisão) | *3* (Concluir)\n` +
          `• Digite: *C1*, *C2*... para marcar subtarefa\n` +
          `🔖 _Demanda ativa: #T-${shortRef} - ${primeTask.title}_`;
      }

      const text = `⏰ *Resumo Matinal de Prazos - Kanban Oiko*\n\nBom dia, *${firstName}*! Aqui está o status das suas entregas:\n\n${sections.join('\n\n')}${footerGuide}\n\n📋 *Acessar Kanban Completo:* ${kanbanUrl}`;

      try {
        const res = await EvolutionApiService.sendTextMessage({
          instanceName,
          to: phone,
          text,
          configOverride: orgConfig,
        });

        if (res.success) {
          sentCount++;
          // Se tiver ao menos uma tarefa hoje, salva como contexto ativo
          const primeTask = group.today[0] || group.soon[0];
          if (primeTask) {
            WhatsAppReplyService.recordTaskContext(
              organization.id,
              phone,
              primeTask.id,
              primeTask.title,
              res.messageId
            );
          }
        }
      } catch (err) {
        console.warn(`[WhatsAppNotify] Erro ao enviar lembrete de prazo para ${user.name}:`, err);
      }
    }

    return { sentCount };
  }

  /**
   * Notifica solicitante quando uma demanda pública for registrada com sucesso
   */
  public static async notifyPublicDemandSubmitted({
    organization,
    task,
    requesterPhone,
    requesterName,
    protocolCode,
  }: {
    organization: Organization;
    task: Task;
    requesterPhone: string;
    requesterName: string;
    protocolCode: string;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false) return false;

    const instanceName = this.resolveInstanceName(organization);
    const orgSlug = organization.slug || 'ib';
    const cleanProtocol = protocolCode.replace(/^#+/, '');
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio-5589719834-7481b.web.app';
    const trackingUrl = `${baseUrl}/${orgSlug}/protocolo/${encodeURIComponent(cleanProtocol)}`;

    const text = `📋 *Demanda Registrada com Sucesso! - ${organization.name}*\n\nOlá, *${requesterName.split(' ')[0]}*!\nSua solicitação foi recebida e já está na esteira de triagem inicial.\n\n📌 *Demanda:* ${task.title}\n🔢 *Protocolo:* \`${protocolCode}\`\n⏳ *SLA de Triagem:* Até 24 horas úteis\n\n👉 *Acompanhe em tempo real:* ${trackingUrl}\n\nVocê receberá avisos automáticos a cada avanço de fase!`;

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: requesterPhone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar confirmação de protocolo ao solicitante:', err);
      return false;
    }
  }

  /**
   * Notifica responsáveis com um resumo consolidado de múltiplas demandas criadas (ex: via JSON / Importação em lote)
   */
  public static async notifyBatchTasksAssigned({
    organization,
    tasks,
    allUsers,
    actorUser,
  }: {
    organization: Organization;
    tasks: Task[];
    allUsers: User[];
    actorUser?: User | null;
  }): Promise<{ sentCount: number }> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskCreated === false) {
      return { sentCount: 0 };
    }

    // Agrupa tarefas por responsável
    const userTasksMap = new Map<string, Task[]>();

    tasks.forEach((task) => {
      const targetUserIds: string[] =
        task.assigneeIds && task.assigneeIds.length > 0
          ? task.assigneeIds
          : task.assigneeId
          ? [task.assigneeId]
          : [];

      targetUserIds.forEach((uid) => {
        const currentList = userTasksMap.get(uid) || [];
        if (!currentList.some((t) => t.id === task.id)) {
          currentList.push(task);
        }
        userTasksMap.set(uid, currentList);
      });
    });

    let sentCount = 0;
    const actorName = actorUser?.name || 'Liderança';
    const instanceName = this.resolveInstanceName(organization, actorUser);

    for (const [userId, userTasks] of userTasksMap.entries()) {
      const targetUser = allUsers.find((u) => u.id === userId);
      if (!targetUser || targetUser.notifyWhatsApp === false) continue;

      const phone = targetUser.whatsapp || targetUser.phone;
      if (!phone) continue;

      const firstName = (targetUser.name || (targetUser.email ? targetUser.email.split('@')[0] : 'Membro')).split(' ')[0];
      const taskUrl = this.resolveTaskUrl(organization);

      if (userTasks.length === 1) {
        const singleTask = userTasks[0];
        const deadlineFormatted = singleTask.deadline
          ? new Date(singleTask.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
          : 'Sem prazo definido';
        const checklistBlock = this.formatChecklistBlock(singleTask);
        const footer = this.buildInteractiveFooter(organization, singleTask);

        const text = `📋 *Nova Demanda Atribuída - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* atribuiu uma nova demanda para você:\n\n📌 *Título:* ${singleTask.title}\n📅 *Prazo:* ${deadlineFormatted}\n🏷️ *Prioridade:* ${singleTask.priority || 'Média'}${checklistBlock}${footer}`;

        try {
          const res = await EvolutionApiService.sendTextMessage({
            instanceName,
            to: phone,
            text,
            configOverride: orgConfig,
          });
          if (res.success) {
            sentCount++;
            WhatsAppReplyService.recordTaskContext(
              organization.id,
              phone,
              singleTask.id,
              singleTask.title,
              res.messageId
            );
          }
        } catch (err) {
          console.warn('[WhatsAppNotify] Erro ao enviar mensagem de tarefa única:', err);
        }
      } else {
        // Mensagem consolidada (Resumo de Múltiplas Tarefas)
        const taskItemsText = userTasks
          .map((t, idx) => {
            const deadlineFormatted = t.deadline
              ? new Date(t.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
              : 'Sem prazo';
            const subCount = t.checklist?.length || 0;
            const subInfo = subCount > 0 ? `\n   ☑️ _${subCount} subtarefa(s)_` : '';
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            return `${idx + 1}️⃣ *${t.title}*\n   📅 Prazo: ${deadlineFormatted} • Prioridade: ${t.priority || 'Média'}${subInfo}\n   👉 Editar: ${quickUrl}`;
          })
          .join('\n\n');

        const text = `📋 *Novas Demandas Atribuídas - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* importou/atribuiu *${userTasks.length} demandas* para você:\n\n${taskItemsText}\n\n👉 *Acesse todas as suas demandas:* ${taskUrl}`;

        try {
          const res = await EvolutionApiService.sendTextMessage({
            instanceName,
            to: phone,
            text,
            configOverride: orgConfig,
          });
          if (res.success) {
            sentCount++;
            WhatsAppReplyService.recordTaskContext(
              organization.id,
              phone,
              userTasks[0].id,
              userTasks[0].title,
              res.messageId
            );
          }
        } catch (err) {
          console.warn(`[WhatsAppNotify] Erro ao enviar resumo em lote para ${targetUser.name}:`, err);
        }
      }
    }

    return { sentCount };
  }
}
