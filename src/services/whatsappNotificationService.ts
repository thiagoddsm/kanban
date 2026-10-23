import { EvolutionApiService, DEFAULT_EVOLUTION_CONFIG } from './evolutionApiService';
import { Organization, Task, User, ChecklistItem } from '../types';
import { WhatsAppReplyService } from './whatsappReplyService';
import { StorageService } from './storageService';
import { FirestoreRepository } from './firestoreRepository';

// Debounce map para notificações de checklist por tarefa
const checklistDebounceTimers = new Map<string, NodeJS.Timeout>();

export class WhatsAppNotificationService {
  /**
   * Resolve de forma resiliente o número de WhatsApp/telefone de um usuário,
   * buscando inclusive em registros duplicados com o mesmo e-mail ou no Firestore caso o user passado seja um placeholder usr_...
   */
  public static async resolveUserPhone(user?: User | null): Promise<string | undefined> {
    if (!user) return undefined;
    const direct = (user.whatsapp || user.phone || '').trim();
    if (direct) return direct;

    const cleanEmail = (user.email || '').trim().toLowerCase();
    const cleanName = (user.name || '').trim().toLowerCase();

    // 1. Procura no cache local (StorageService) por qualquer conta com mesmo ID, e-mail ou nome exato
    const localUsers = StorageService.getUsers();
    for (const lu of localUsers) {
      const luPhone = (lu.whatsapp || lu.phone || '').trim();
      if (!luPhone) continue;
      if (lu.id === user.id) return luPhone;
      if (cleanEmail && (lu.email || '').trim().toLowerCase() === cleanEmail) return luPhone;
      if (cleanName && cleanName.length > 2 && (lu.name || '').trim().toLowerCase() === cleanName) return luPhone;
    }

    // 2. Fallback assíncrono direto no Firestore (caso o membro tenha acabado de salvar o número em outro dispositivo)
    try {
      const freshById = await FirestoreRepository.getUser(user.id);
      const byIdPhone = (freshById?.whatsapp || freshById?.phone || '').trim();
      if (byIdPhone) return byIdPhone;

      if (cleanEmail) {
        const matches = await FirestoreRepository.getUsersByEmail(cleanEmail);
        for (const m of matches) {
          const mPhone = (m.whatsapp || m.phone || '').trim();
          if (mPhone) return mPhone;
        }
      }
    } catch {
      // ignore
    }

    return undefined;
  }

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

    return `\n\n⚡ *Acesso Rápido:* ${quickUrl}\n\n💬 *Como responder:* Digite citando esta mensagem ou envie \`#T-${shortRef}: seu comentário\`\n⚡ *Ações rápidas:* *#T-${shortRef} 1* (Andamento) | *#T-${shortRef} 3* (Concluir) | *#T-${shortRef} C1* (Subtarefa)\n🔖 Ref: #T-${shortRef}`;
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

    const phone = await this.resolveUserPhone(assigneeUser);
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

    const phone = await this.resolveUserPhone(mentionedUser);
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

    const phone = await this.resolveUserPhone(targetUser);
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

    const phone = await this.resolveUserPhone(targetUser);
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
    // Por padrão NÃO envia mensagem a cada check para evitar spam; o progresso entra no Resumo do Dia
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnChecklistUpdate !== true) {
      return;
    }

    // Debounce de 7 segundos para agrupar múltiplos checks seguidos em uma só mensagem caso ativado
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
        const phone = await this.resolveUserPhone(targetUser);
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
   * Resumo Consolidado do Dia (Briefing Diário - Manhã e Tarde)
   * Agrupa em UMA mensagem por membro os 3 pilares solicitados:
   * 1. 🚨 O que está vencendo (Hoje, atrasadas e em breve)
   * 2. 🆕 O que foi criado recentemente
   * 3. 📝 O que foi alterado / progresso recente
   */
  public static async notifyDailyDigest({
    organization,
    tasks,
    users,
    actorUser,
    period = 'morning',
  }: {
    organization: Organization;
    tasks: Task[];
    users: User[];
    actorUser?: User | null;
    period?: 'morning' | 'evening' | 'manual';
  }): Promise<{ sentCount: number }> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnDeadlineApproaching === false) {
      return { sentCount: 0 };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split('T')[0];

    // Tarefas ativas da organização
    const activeTasks = tasks.filter((t) => !t.isArchived);

    interface UserDigestData {
      user: User;
      todayDue: Task[];
      soonDue: Task[];
      overdue: Task[];
      createdRecent: Task[];
      updatedRecent: Task[];
    }

    const userDigestMap = new Map<string, UserDigestData>();

    const getOrCreateUserData = (u: User): UserDigestData => {
      let data = userDigestMap.get(u.id);
      if (!data) {
        data = {
          user: u,
          todayDue: [],
          soonDue: [],
          overdue: [],
          createdRecent: [],
          updatedRecent: [],
        };
        userDigestMap.set(u.id, data);
      }
      return data;
    };

    for (const task of activeTasks) {
      const uids =
        task.assigneeIds && task.assigneeIds.length > 0
          ? task.assigneeIds
          : task.assigneeId
          ? [task.assigneeId]
          : [];

      if (uids.length === 0) continue;

      const isCompleted = task.status === 'DONE';
      const deadline = task.deadline;
      const isDueToday = !isCompleted && deadline === todayStr;
      const isDueSoon = !isCompleted && deadline && deadline > todayStr && deadline <= in2DaysStr;
      const isOverdue = !isCompleted && deadline && deadline < todayStr;

      const taskCreatedTime = task.createdAt ? new Date(task.createdAt).getTime() : 0;
      const isCreatedRecent = taskCreatedTime >= twentyFourHoursAgo;

      const taskUpdatedTime = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
      const isUpdatedRecent = taskUpdatedTime >= twentyFourHoursAgo && !isCreatedRecent;

      for (const uid of uids) {
        const user = users.find((u) => u.id === uid) || StorageService.getUsers().find((u) => u.id === uid);
        if (!user || user.notifyWhatsApp === false) continue;

        const data = getOrCreateUserData(user);

        if (isDueToday && !data.todayDue.some((t) => t.id === task.id)) {
          data.todayDue.push(task);
        } else if (isOverdue && !data.overdue.some((t) => t.id === task.id)) {
          data.overdue.push(task);
        } else if (isDueSoon && !data.soonDue.some((t) => t.id === task.id)) {
          data.soonDue.push(task);
        }

        if (isCreatedRecent && !data.createdRecent.some((t) => t.id === task.id)) {
          data.createdRecent.push(task);
        } else if (isUpdatedRecent && !data.updatedRecent.some((t) => t.id === task.id)) {
          data.updatedRecent.push(task);
        }
      }
    }

    // Agrupa tarefas por TELEFONE normalizado (garante 1 única mensagem consolidada por número físico)
    const phoneDigestMap = new Map<string, { user: User; originalPhone: string; data: UserDigestData }>();

    for (const [, data] of userDigestMap.entries()) {
      const phone = await this.resolveUserPhone(data.user);
      if (!phone) continue;
      const clean = WhatsAppReplyService.cleanPhone(phone);
      if (!clean) continue;

      const existing = phoneDigestMap.get(clean);
      if (!existing) {
        phoneDigestMap.set(clean, { user: data.user, originalPhone: phone, data });
      } else {
        const merged = existing.data;
        data.todayDue.forEach((t) => { if (!merged.todayDue.some((mt) => mt.id === t.id)) merged.todayDue.push(t); });
        data.overdue.forEach((t) => { if (!merged.overdue.some((mt) => mt.id === t.id)) merged.overdue.push(t); });
        data.soonDue.forEach((t) => { if (!merged.soonDue.some((mt) => mt.id === t.id)) merged.soonDue.push(t); });
        data.createdRecent.forEach((t) => { if (!merged.createdRecent.some((mt) => mt.id === t.id)) merged.createdRecent.push(t); });
        data.updatedRecent.forEach((t) => { if (!merged.updatedRecent.some((mt) => mt.id === t.id)) merged.updatedRecent.push(t); });
      }
    }

    let sentCount = 0;
    const instanceName = this.resolveInstanceName(organization, actorUser);

    for (const [, { user, originalPhone, data }] of phoneDigestMap.entries()) {
      const firstName = (user.name || (user.email ? user.email.split('@')[0] : 'Membro')).split(' ')[0];
      const sections: string[] = [];

      // 1. O QUE ESTÁ VENCENDO
      const expiringList = [...data.overdue, ...data.todayDue, ...data.soonDue];
      if (expiringList.length > 0) {
        const expiringItems = expiringList
          .slice(0, 5)
          .map((t, idx) => {
            const isToday = t.deadline === todayStr;
            const isLate = t.deadline && t.deadline < todayStr;
            const badge = isLate ? '🚨 *ATRASADA*' : isToday ? '⏰ *HOJE*' : '⏳ *EM BREVE*';
            const chk = t.checklist || [];
            const chkDone = chk.filter((i: any) => typeof i === 'object' && i.completed).length;
            const chkInfo = chk.length > 0 ? ` (${chkDone}/${chk.length} subtarefas)` : '';
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            const shortRef = t.id.length > 8 ? t.id.slice(-6) : t.id;
            return `${idx + 1}. ${badge} *${t.title}* [Ref: \`#T-${shortRef}\`]${chkInfo}\n   👉 Acesso Rápido: ${quickUrl}`;
          })
          .join('\n');
        sections.push(`🚨 *O QUE ESTÁ VENCENDO (${expiringList.length}):*\n${expiringItems}`);
      }

      // 2. O QUE FOI CRIADO RECENTEMENTE
      if (data.createdRecent.length > 0) {
        const createdItems = data.createdRecent
          .slice(0, 4)
          .map((t, idx) => {
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            const shortRef = t.id.length > 8 ? t.id.slice(-6) : t.id;
            return `${idx + 1}. *${t.title}* [Ref: \`#T-${shortRef}\` • ${t.status}]\n   👉 Ver Demanda: ${quickUrl}`;
          })
          .join('\n');
        sections.push(`🆕 *DEMANDAS CRIADAS / ATRIBUÍDAS (${data.createdRecent.length}):*\n${createdItems}`);
      }

      // 3. O QUE FOI ALTERADO / PROGRESSO RECENTE
      if (data.updatedRecent.length > 0) {
        const updatedItems = data.updatedRecent
          .slice(0, 4)
          .map((t, idx) => {
            const chk = t.checklist || [];
            const chkDone = chk.filter((i: any) => typeof i === 'object' && i.completed).length;
            const chkInfo = chk.length > 0 ? ` (${chkDone}/${chk.length} etapas)` : '';
            const quickUrl = this.resolveQuickTaskUrl(organization, t.id);
            const shortRef = t.id.length > 8 ? t.id.slice(-6) : t.id;
            return `${idx + 1}. *${t.title}* [${t.status}]${chkInfo}\n   👉 Acesso Rápido: ${quickUrl}`;
          })
          .join('\n');
        sections.push(`📝 *ALTERAÇÕES & PROGRESSO RECENTE (${data.updatedRecent.length}):*\n${updatedItems}`);
      }

      // Se não há nada vencendo, nem criado, nem alterado para este usuário, não envia mensagem para evitar spam
      if (sections.length === 0) continue;

      let greeting = `☀️ *Briefing Matinal - Kanban Oiko*\n\nBom dia, *${firstName}*! Aqui está o resumo das suas demandas:`;
      if (period === 'evening') {
        greeting = `🌇 *Balanço do Dia - Kanban Oiko*\n\nBoa tarde, *${firstName}*! Aqui está o balanço das entregas e atividades de hoje:`;
      } else if (period === 'manual') {
        greeting = `📊 *Resumo Consolidado - Kanban Oiko*\n\nOlá, *${firstName}*! Aqui está o resumo das suas demandas:`;
      }

      const primeTask = expiringList[0] || data.createdRecent[0] || data.updatedRecent[0];
      const primeRef = primeTask?.id ? (primeTask.id.length > 8 ? primeTask.id.slice(-6) : primeTask.id) : '';

      const footerGuide =
        `\n\n💬 *Como responder a uma demanda específica:*\n` +
        `• Envie: *#T-código:* seu comentário (ex: *#T-${primeRef}:* Atualizado!)\n` +
        `• Ou deslize para responder citando esta mensagem\n` +
        `• Ações rápidas: *#T-código 1* (Andamento) | *#T-código 3* (Concluir) | *#T-código C1* (Subtarefa)\n\n` +
        `📋 *Acessar Quadro Kanban:* ${this.resolveTaskUrl(organization)}`;

      const text = `${greeting}\n\n${sections.join('\n\n')}${footerGuide}`;

      try {
        const res = await EvolutionApiService.sendTextMessage({
          instanceName,
          to: originalPhone,
          text,
          configOverride: orgConfig,
        });

        if (res.success) {
          sentCount++;
          if (primeTask) {
            WhatsAppReplyService.recordTaskContext(
              organization.id,
              originalPhone,
              primeTask.id,
              primeTask.title,
              res.messageId
            );
          }
        }
      } catch (err) {
        console.warn(`[WhatsAppNotify] Erro ao enviar resumo diário para ${user.name}:`, err);
      }
    }

    return { sentCount };
  }

  /**
   * Mantém retrocompatibilidade chamando notifyDailyDigest
   */
  public static async notifyDeadlineReminders(params: {
    organization: Organization;
    tasks: Task[];
    users: User[];
    actorUser?: User | null;
  }): Promise<{ sentCount: number }> {
    return this.notifyDailyDigest({ ...params, period: 'morning' });
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
            const shortRef = t.id.length > 8 ? t.id.slice(-6) : t.id;
            return `${idx + 1}️⃣ *${t.title}* [Ref: \`#T-${shortRef}\`]\n   📅 Prazo: ${deadlineFormatted} • Prioridade: ${t.priority || 'Média'}${subInfo}\n   👉 Editar: ${quickUrl}`;
          })
          .join('\n\n');

        const primeShort = userTasks[0]?.id ? (userTasks[0].id.length > 8 ? userTasks[0].id.slice(-6) : userTasks[0].id) : '';
        const guideText = `\n\n💬 *Como responder a uma demanda específica:*\n• Envie *#T-código:* seu comentário (ex: *#T-${primeShort}:* Já recebi a demanda)\n• Ou responda citando esta mensagem\n• Ações rápidas: *#T-código 1* (Andamento) | *#T-código 3* (Concluir)`;

        const text = `📋 *Novas Demandas Atribuídas - Kanban Oiko*\n\nOlá, *${firstName}*!\n*${actorName}* importou/atribuiu *${userTasks.length} demandas* para você:\n\n${taskItemsText}${guideText}\n\n👉 *Acesse todas as suas demandas:* ${taskUrl}`;

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
