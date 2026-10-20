import { EvolutionApiService } from './evolutionApiService';
import { FirestoreRepository } from './firestoreRepository';
import { Organization, Task, User, Comment, ActivityLog, ChecklistItem, WhatsAppTaskContext } from '../types';
import { StorageService } from './storageService';

const PROCESSED_MSGS_KEY = 'oiko_wa_processed_messages_v1';
const CONTEXT_LOCAL_KEY_PREFIX = 'oiko_wa_context_';

export class WhatsAppReplyService {
  private static processedMessageIds = new Set<string>();
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();
  private static lastCheckTimestamps = new Map<string, number>();

  /**
   * Limpa telefone para apenas dígitos
   */
  public static cleanPhone(phone: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  /**
   * Extrai os últimos 8 ou 9 dígitos para matching flexível (ignora 55, DDD e dígito 9)
   */
  public static matchPhone(phoneA: string, phoneB: string): boolean {
    const a = this.cleanPhone(phoneA);
    const b = this.cleanPhone(phoneB);
    if (!a || !b) return false;
    if (a === b) return true;

    // Compara os últimos 8 dígitos (número base sem DDD e sem 9 adicional)
    const suffixA = a.slice(-8);
    const suffixB = b.slice(-8);
    return suffixA.length >= 8 && suffixA === suffixB;
  }

  /**
   * Salva o contexto da última tarefa notificada para um número de telefone
   */
  public static recordTaskContext(
    organizationId: string,
    phone: string,
    taskId: string,
    taskTitle: string,
    messageId?: string
  ): void {
    const clean = this.cleanPhone(phone);
    if (!clean) return;

    const ctx: WhatsAppTaskContext = {
      phone: clean,
      taskId,
      organizationId,
      taskTitle,
      messageId,
      updatedAt: new Date().toISOString(),
    };

    const keysToSave = new Set<string>();
    keysToSave.add(clean);
    if (clean.startsWith('55')) {
      keysToSave.add(clean.slice(2)); // ex: 21989001302
    } else {
      keysToSave.add(`55${clean}`);
    }
    if (clean.length >= 8) {
      keysToSave.add(clean.slice(-8)); // ex: 89001302
      keysToSave.add(clean.slice(-9)); // ex: 989001302
    }

    for (const k of keysToSave) {
      try {
        localStorage.setItem(`${CONTEXT_LOCAL_KEY_PREFIX}${k}`, JSON.stringify(ctx));
      } catch {}
      FirestoreRepository.saveWhatsAppContext(organizationId, k, ctx);
    }
  }

  /**
   * Obtém o contexto da última tarefa associada a um número de telefone
   */
  public static async getTaskContext(
    organizationId: string,
    phone: string
  ): Promise<WhatsAppTaskContext | null> {
    const clean = this.cleanPhone(phone);
    if (!clean) return null;

    const keysToTry = new Set<string>();
    keysToTry.add(clean);
    if (clean.startsWith('55')) {
      keysToTry.add(clean.slice(2));
    } else {
      keysToTry.add(`55${clean}`);
    }
    if (clean.length >= 8) {
      keysToTry.add(clean.slice(-8));
      keysToTry.add(clean.slice(-9));
    }

    for (const key of keysToTry) {
      try {
        const remote = await FirestoreRepository.fetchWhatsAppContext(organizationId, key);
        if (remote && remote.taskId) return remote;
      } catch {}

      try {
        const raw = localStorage.getItem(`${CONTEXT_LOCAL_KEY_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.taskId) return parsed;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Tenta extrair o ID da tarefa do texto da mensagem ou da mensagem citada
   */
  public static extractTaskIdFromText(text?: string): string | null {
    if (!text) return null;

    // Procura por #T-[codigo]
    const tagMatch = text.match(/#T-([a-zA-Z0-9_-]+)/i);
    if (tagMatch && tagMatch[1]) {
      return tagMatch[1];
    }

    // Procura por /wa/[taskId]
    const urlMatch = text.match(/\/wa\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    return null;
  }

  private static resolveTaskUrl(org: Organization): string {
    const slug = org.slug || 'ib';
    return `https://studio-5589719834-7481b.web.app/${slug}/tasks`;
  }

  /**
   * Identifica o usuário da organização pelo número de WhatsApp
   */
  public static findUserByPhone(users: User[], senderPhone: string): User | undefined {
    return users.find((u) => {
      const targetPhone = u.whatsapp || u.phone || '';
      return this.matchPhone(targetPhone, senderPhone);
    });
  }

  /**
   * Processa uma mensagem recebida e executa a ação correspondente no Kanban
   */
  public static async processIncomingMessage({
    organization,
    senderPhone,
    messageText,
    quotedText,
    messageId,
    pushName,
    users,
    tasks,
    comments,
    onUpdateTask,
    onAddComment,
  }: {
    organization: Organization;
    senderPhone: string;
    messageText: string;
    quotedText?: string;
    messageId?: string;
    pushName?: string;
    users: User[];
    tasks: Task[];
    comments?: Comment[];
    onUpdateTask: (task: Task) => void;
    onAddComment: (taskId: string, content: string, author?: { id: string; name: string; avatar?: string }) => void;
  }): Promise<{ success: boolean; action?: string; replySent?: boolean }> {
    if (!messageText || !messageText.trim()) {
      return { success: false };
    }

    if (messageId && this.processedMessageIds.has(messageId)) {
      return { success: false };
    }

    const cleanSender = this.cleanPhone(senderPhone);
    const trimmedText = messageText.trim();

    // 1. Tenta identificar a tarefa através de referência no texto citado ou na própria mensagem
    let targetTaskId: string | null =
      this.extractTaskIdFromText(quotedText) || this.extractTaskIdFromText(trimmedText);

    // 2. Se não encontrou código expresso, busca o último contexto gravado para este telefone
    if (!targetTaskId) {
      const ctx = await this.getTaskContext(organization.id, cleanSender);
      if (ctx && ctx.taskId) {
        targetTaskId = ctx.taskId;
      }
    }

    // Localiza o usuário que enviou (por telefone ou por pushName do WhatsApp)
    let senderUser = this.findUserByPhone(users, cleanSender);
    if (!senderUser && pushName) {
      const cleanPush = pushName.trim().toLowerCase();
      senderUser = users.find((u) => {
        const uName = (u.name || '').trim().toLowerCase();
        return uName === cleanPush || uName.includes(cleanPush) || cleanPush.includes(uName);
      });
    }

    // 3. Fallback inteligente: se ainda não encontrou tarefa específica mas o usuário é identificado
    let task: Task | undefined;
    if (targetTaskId) {
      task = tasks.find(
        (t) => t.id === targetTaskId || t.id.endsWith(targetTaskId!) || t.id.includes(targetTaskId!)
      );
    }

    if (!task && senderUser) {
      const userFirstName = senderUser.name ? senderUser.name.toLowerCase().split(' ')[0] : '';

      // Tarefas onde o usuário foi mencionado recentemente em comentários
      const tasksWithMentions = tasks.filter((t) => {
        if (t.isArchived) return false;
        const taskComments = (comments || []).filter((c) => c.taskId === t.id);
        return taskComments.some(
          (c) =>
            (userFirstName && c.content?.toLowerCase().includes(`@${userFirstName}`)) ||
            c.userId === senderUser!.id
        );
      });

      // Tarefas ativas atribuídas a este usuário
      const userActiveTasks = tasks.filter(
        (t) =>
          !t.isArchived &&
          t.status !== 'DONE' &&
          ((t.assigneeIds || []).includes(senderUser!.id) || t.assigneeId === senderUser!.id)
      );

      const candidateTasks = [...tasksWithMentions, ...userActiveTasks];
      if (candidateTasks.length > 0) {
        candidateTasks.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        task = candidateTasks[0];
      }
    }

    if (!task) {
      console.warn(`[WhatsAppReply] Nenhuma tarefa identificada para ${cleanSender} (${pushName || 'sem nome'}).`);
      return { success: false };
    }

    const senderName = senderUser?.name || pushName || 'Membro via WhatsApp';
    const cleanLower = trimmedText.toLowerCase();
    const instanceName = organization.evolutionConfig?.instanceName || 'Oiko_Gestao';

    // ── COMANDO 1: Mover para Em Andamento (1, /andamento, andamento) ──
    if (cleanLower === '1' || cleanLower === '/andamento' || cleanLower === 'andamento') {
      const updated: Task = {
        ...task,
        status: 'IN_PROGRESS',
        updatedAt: new Date().toISOString(),
      };
      onUpdateTask(updated);

      if (messageId) {
        this.processedMessageIds.add(messageId);
      }

      await EvolutionApiService.sendTextMessage({
        instanceName,
        to: senderPhone,
        text: `🚀 *Status Atualizado com Sucesso!*\n\nA demanda *"${task.title}"* foi movida para: *Em Andamento*.\n\n👉 Acompanhe no Kanban: ${this.resolveTaskUrl(organization)}`,
        configOverride: organization.evolutionConfig,
      });

      return { success: true, action: 'STATUS_IN_PROGRESS', replySent: true };
    }

    // ── COMANDO 2: Mover para Revisão (2, /revisao, revisao) ──
    if (cleanLower === '2' || cleanLower === '/revisao' || cleanLower === 'revisao') {
      const updated: Task = {
        ...task,
        status: 'REVIEW',
        updatedAt: new Date().toISOString(),
      };
      onUpdateTask(updated);

      if (messageId) {
        this.processedMessageIds.add(messageId);
      }

      await EvolutionApiService.sendTextMessage({
        instanceName,
        to: senderPhone,
        text: `📋 *Enviada para Revisão!*\n\nA entrega de *"${task.title}"* foi enviada para validação da liderança.\n\nAssim que for aprovada você receberá o aviso! 👍`,
        configOverride: organization.evolutionConfig,
      });

      return { success: true, action: 'STATUS_REVIEW', replySent: true };
    }

    // ── COMANDO 3: Marcar como Concluído (3, /concluir, concluir, concluido) ──
    if (
      cleanLower === '3' ||
      cleanLower === '/concluir' ||
      cleanLower === 'concluir' ||
      cleanLower === 'concluido' ||
      cleanLower === 'concluído'
    ) {
      const updated: Task = {
        ...task,
        status: 'DONE',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateTask(updated);

      if (messageId) {
        this.processedMessageIds.add(messageId);
      }

      await EvolutionApiService.sendTextMessage({
        instanceName,
        to: senderPhone,
        text: `🎉 *Demanda Concluída com Sucesso!*\n\n*${task.title}* foi finalizada no Kanban. Parabéns pelo trabalho concluído! 🏆`,
        configOverride: organization.evolutionConfig,
      });

      return { success: true, action: 'STATUS_DONE', replySent: true };
    }

    // ── COMANDO CHECKLIST: Marcar Subtarefa (c1, c2, /c1, check 1, ok 1...) ──
    const checkMatch = cleanLower.match(/^(?:\/)?(?:c|check|ok)\s*(\d+)$/);
    if (checkMatch && checkMatch[1]) {
      const itemIndex = parseInt(checkMatch[1], 10) - 1;
      const currentList: ChecklistItem[] = (task.checklist || []).map((item, idx) =>
        typeof item === 'string' ? { id: `chk_${idx}`, text: item, completed: false } : item
      );

      if (itemIndex >= 0 && itemIndex < currentList.length) {
        const targetItem = currentList[itemIndex];
        const newCompleted = !targetItem.completed;
        const updatedList = currentList.map((item, idx) =>
          idx === itemIndex ? { ...item, completed: newCompleted } : item
        );

        const updatedTask: Task = {
          ...task,
          checklist: updatedList,
          updatedAt: new Date().toISOString(),
        };
        onUpdateTask(updatedTask);

        if (messageId) {
          this.processedMessageIds.add(messageId);
        }

        const completedCount = updatedList.filter((i) => i.completed).length;
        const totalCount = updatedList.length;

        await EvolutionApiService.sendTextMessage({
          instanceName,
          to: senderPhone,
          text: `${newCompleted ? '✅' : '↩️'} *Subtarefa #${itemIndex + 1} ${newCompleted ? 'Concluída' : 'Desmarcada'}!*\n\n📌 *Demanda:* ${task.title}\n☑️ *Item:* "${targetItem.text}"\n📊 *Progresso:* ${completedCount} de ${totalCount} concluídas (${Math.round((completedCount / totalCount) * 100)}%)`,
          configOverride: organization.evolutionConfig,
        });

        return { success: true, action: 'CHECKLIST_TOGGLE', replySent: true };
      }
    }

    // ── TEXTO LIVRE: Gravar como Comentário na Tarefa ──
    const authorData = senderUser
      ? { id: senderUser.id, name: senderUser.name, avatar: senderUser.avatar }
      : { id: `wa_${cleanSender.slice(-8)}`, name: senderName };

    onAddComment(task.id, trimmedText, authorData);

    if (messageId) {
      this.processedMessageIds.add(messageId);
    }

    // Responde no WhatsApp confirmando que o comentário foi adicionado
    await EvolutionApiService.sendTextMessage({
      instanceName,
      to: senderPhone,
      text: `💬 *Comentário Registrado!*\n\nSua resposta foi inserida na demanda *"${task.title}"*:\n\n_${trimmedText.slice(0, 150)}${trimmedText.length > 150 ? '...' : ''}_\n\n👉 A equipe já pode visualizar seu comentário no Kanban.`,
      configOverride: organization.evolutionConfig,
    });

    return { success: true, action: 'ADD_COMMENT', replySent: true };
  }

  /**
   * Inicia o polling leve no frontend para capturar mensagens recebidas quando o app está aberto
   */
  public static startListening({
    organization,
    users,
    tasks,
    comments,
    getUsers,
    getTasks,
    getComments,
    onUpdateTask,
    onAddComment,
  }: {
    organization: Organization;
    users?: User[];
    tasks?: Task[];
    comments?: Comment[];
    getUsers?: () => User[];
    getTasks?: () => Task[];
    getComments?: () => Comment[];
    onUpdateTask: (task: Task) => void;
    onAddComment: (taskId: string, content: string, author?: { id: string; name: string; avatar?: string }) => void;
  }): () => void {
    const orgId = organization.id;
    if (this.pollingIntervals.has(orgId)) {
      return () => this.stopListening(orgId);
    }

    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.enableWhatsAppReplies === false) {
      return () => {};
    }

    const instanceName = orgConfig?.instanceName || 'Oiko_Gestao';
    // Ouve mensagens recebidas nos últimos 45 minutos para capturar respostas recém enviadas
    if (!this.lastCheckTimestamps.has(orgId)) {
      this.lastCheckTimestamps.set(orgId, Date.now() - 45 * 60 * 1000);
    }

    const poll = async () => {
      try {
        const messages = await EvolutionApiService.fetchRecentIncomingMessages(
          instanceName,
          orgConfig,
          50
        );

        const lastCheck = this.lastCheckTimestamps.get(orgId) || 0;
        let newestTimestamp = lastCheck;

        for (const msg of messages) {
          const key = msg.key || {};
          const msgId = key.id;

          // Se for mensagem enviada pelo próprio sistema ou sem ID, ignora
          if (Boolean(key.fromMe) || !msgId) continue;

          // Extrai todos os JIDs possíveis (suporta WhatsApp Web / Multi-device com LID e @s.whatsapp.net)
          const candidateJids = [
            key.remoteJidAlt,
            key.remoteJid,
            key.participant,
          ].filter(Boolean) as string[];

          // Ignora mensagens originadas em grupos (@g.us)
          if (candidateJids.some((j) => j.includes('@g.us'))) continue;

          // Encontra o JID com número real de telefone (@s.whatsapp.net)
          const phoneJid = candidateJids.find((j) => j.includes('@s.whatsapp.net')) || candidateJids[0] || '';
          const senderPhone = phoneJid.replace(/@.+$/, '');
          if (!senderPhone) continue;

          // Extrai timestamp (segundos ou milissegundos)
          const ts = msg.messageTimestamp
            ? typeof msg.messageTimestamp === 'number' && msg.messageTimestamp < 10000000000
              ? msg.messageTimestamp * 1000
              : Number(msg.messageTimestamp)
            : Date.now();

          if (ts <= lastCheck) continue;
          if (ts > newestTimestamp) newestTimestamp = ts;

          // Extrai texto da mensagem
          const msgBody =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';

          if (!msgBody.trim()) continue;

          const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
            '';

          const currentUsers = getUsers ? getUsers() : users || [];
          const currentTasks = getTasks ? getTasks() : tasks || [];
          const currentComments = getComments ? getComments() : comments || [];

          await this.processIncomingMessage({
            organization,
            senderPhone,
            messageText: msgBody,
            quotedText: quoted,
            messageId: msgId,
            pushName: msg.pushName,
            users: currentUsers,
            tasks: currentTasks,
            comments: currentComments,
            onUpdateTask,
            onAddComment,
          });
        }

        this.lastCheckTimestamps.set(orgId, newestTimestamp);
      } catch (err) {
        // Silencioso em caso de erro temporário de rede
      }
    };

    // Executa a primeira verificação após 1s e depois a cada 6 segundos
    const timer = setInterval(poll, 6000);
    setTimeout(poll, 1000);
    this.pollingIntervals.set(orgId, timer);

    return () => this.stopListening(orgId);
  }

  /**
   * Para o polling da organização
   */
  public static stopListening(organizationId: string): void {
    const timer = this.pollingIntervals.get(organizationId);
    if (timer) {
      clearInterval(timer);
      this.pollingIntervals.delete(organizationId);
    }
  }
}
