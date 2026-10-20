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

    try {
      localStorage.setItem(`${CONTEXT_LOCAL_KEY_PREFIX}${clean}`, JSON.stringify(ctx));
      if (clean.length > 8) {
        localStorage.setItem(`${CONTEXT_LOCAL_KEY_PREFIX}${clean.slice(-8)}`, JSON.stringify(ctx));
      }
    } catch {}

    // Salva no Firestore
    FirestoreRepository.saveWhatsAppContext(organizationId, clean, ctx);
    if (clean.length > 8) {
      FirestoreRepository.saveWhatsAppContext(organizationId, clean.slice(-8), ctx);
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

    const keysToTry = [clean];
    if (clean.length > 8) keysToTry.push(clean.slice(-8));

    for (const key of keysToTry) {
      try {
        const remote = await FirestoreRepository.fetchWhatsAppContext(organizationId, key);
        if (remote) return remote;
      } catch {}

      try {
        const raw = localStorage.getItem(`${CONTEXT_LOCAL_KEY_PREFIX}${key}`);
        if (raw) return JSON.parse(raw);
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
    users,
    tasks,
    onUpdateTask,
    onAddComment,
  }: {
    organization: Organization;
    senderPhone: string;
    messageText: string;
    quotedText?: string;
    messageId?: string;
    users: User[];
    tasks: Task[];
    onUpdateTask: (task: Task) => void;
    onAddComment: (taskId: string, content: string) => void;
  }): Promise<{ success: boolean; action?: string; replySent?: boolean }> {
    if (!messageText || !messageText.trim()) {
      return { success: false };
    }

    if (messageId) {
      if (this.processedMessageIds.has(messageId)) {
        return { success: false };
      }
      this.processedMessageIds.add(messageId);
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

    // Localiza o usuário que enviou
    const senderUser = this.findUserByPhone(users, cleanSender);

    // 3. Fallback inteligente: se ainda não encontrou tarefa específica mas o usuário é identificado
    let task: Task | undefined;
    if (targetTaskId) {
      task = tasks.find(
        (t) => t.id === targetTaskId || t.id.endsWith(targetTaskId!) || t.id.includes(targetTaskId!)
      );
    }

    if (!task && senderUser) {
      // Pega tarefas ativas atribuídas a este usuário
      const userActiveTasks = tasks.filter(
        (t) =>
          !t.isArchived &&
          t.status !== 'DONE' &&
          ((t.assigneeIds || []).includes(senderUser.id) || t.assigneeId === senderUser.id)
      );

      // Prioriza a que vence hoje ou a mais urgente
      if (userActiveTasks.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        task = userActiveTasks.find((t) => t.deadline === todayStr) || userActiveTasks[0];
      }
    }

    if (!task) {
      console.warn(`[WhatsAppReply] Nenhuma tarefa identificada para ${cleanSender}.`);
      return { success: false };
    }

    const senderName = senderUser?.name || 'Membro via WhatsApp';
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

      await EvolutionApiService.sendTextMessage({
        instanceName,
        to: senderPhone,
        text: `🚀 *Status Atualizado com Sucesso!*\n\nA demanda *"${task.title}"* foi movida para: *Em Andamento*.\n\n👉 Acompanhe no Kanban: ${EvolutionApiService.formatPhoneNumber(senderPhone)}`,
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
    onAddComment(task.id, trimmedText);

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
    getUsers,
    getTasks,
    onUpdateTask,
    onAddComment,
  }: {
    organization: Organization;
    users?: User[];
    tasks?: Task[];
    getUsers?: () => User[];
    getTasks?: () => Task[];
    onUpdateTask: (task: Task) => void;
    onAddComment: (taskId: string, content: string) => void;
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
    this.lastCheckTimestamps.set(orgId, Date.now() - 30000); // 30s atrás

    const poll = async () => {
      try {
        const messages = await EvolutionApiService.fetchRecentIncomingMessages(
          instanceName,
          orgConfig,
          30
        );

        const lastCheck = this.lastCheckTimestamps.get(orgId) || 0;
        let newestTimestamp = lastCheck;

        for (const msg of messages) {
          const key = msg.key || {};
          const msgId = key.id;
          const remoteJid = key.remoteJid || '';
          if (key.fromMe || !msgId || remoteJid.includes('@g.us')) continue;

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

          const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
            '';

          const senderPhone = remoteJid.replace(/@.+$/, '');
          if (!senderPhone || !msgBody.trim()) continue;

          const currentUsers = getUsers ? getUsers() : users || [];
          const currentTasks = getTasks ? getTasks() : tasks || [];

          await this.processIncomingMessage({
            organization,
            senderPhone,
            messageText: msgBody,
            quotedText: quoted,
            messageId: msgId,
            users: currentUsers,
            tasks: currentTasks,
            onUpdateTask,
            onAddComment,
          });
        }

        this.lastCheckTimestamps.set(orgId, newestTimestamp);
      } catch (err) {
        // Silencioso em caso de erro temporário de rede
      }
    };

    // Executa a primeira verificação após 1.5s e depois a cada 8 segundos
    const timer = setInterval(poll, 8000);
    setTimeout(poll, 1500);
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
