import { EvolutionApiService } from './evolutionApiService';
import { FirestoreRepository } from './firestoreRepository';
import { Organization, Task, User, Comment, ActivityLog, ChecklistItem, WhatsAppTaskContext } from '../types';
import { StorageService } from './storageService';

const PROCESSED_MSGS_KEY = 'oiko_wa_processed_messages_v1';
const CONTEXT_LOCAL_KEY_PREFIX = 'oiko_wa_context_';
const LEADER_KEY_PREFIX = 'oiko_wa_poll_leader_';
const LAST_POLL_TS_KEY = 'oiko_wa_last_poll_ts_';
const TAB_SESSION_ID = Math.random().toString(36).substring(2, 9);

export class WhatsAppReplyService {
  private static processedMessageIds = new Set<string>();
  private static recentProcessedFingerprints = new Map<string, number>();
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();
  private static lastCheckTimestamps = new Map<string, number>();
  private static isPollingMap = new Map<string, boolean>();
  private static isInitialized = new Map<string, boolean>();

  static {
    try {
      const stored = localStorage.getItem(PROCESSED_MSGS_KEY);
      if (stored) {
        const list: string[] = JSON.parse(stored);
        list.forEach((id) => WhatsAppReplyService.processedMessageIds.add(id));
      }
    } catch {}
  }

  /**
   * Verifica de forma síncrona se a mensagem já foi processada ou está em processamento
   */
  public static isMessageAlreadyProcessed(messageId?: string): boolean {
    if (!messageId) return false;
    if (this.processedMessageIds.has(messageId)) return true;
    try {
      if (localStorage.getItem(`oiko_wa_proc_${messageId}`)) {
        this.processedMessageIds.add(messageId);
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Trava imediatamente a mensagem tanto em memória quanto no localStorage entre abas
   */
  public static markMessageAsProcessed(messageId?: string): void {
    if (!messageId) return;
    this.processedMessageIds.add(messageId);
    try {
      localStorage.setItem(`oiko_wa_proc_${messageId}`, Date.now().toString());
      const stored = localStorage.getItem(PROCESSED_MSGS_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(messageId)) {
        list.push(messageId);
        if (list.length > 300) list.shift();
        localStorage.setItem(PROCESSED_MSGS_KEY, JSON.stringify(list));
      }
    } catch {}
  }

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

    const MAX_CONTEXT_AGE_MS = 2 * 60 * 60 * 1000; // 2 horas

    for (const key of keysToTry) {
      try {
        const remote = await FirestoreRepository.fetchWhatsAppContext(organizationId, key);
        if (remote && remote.taskId) {
          const age = Date.now() - new Date(remote.updatedAt || 0).getTime();
          if (age >= 0 && age < MAX_CONTEXT_AGE_MS) {
            return remote;
          }
        }
      } catch {}

      try {
        const raw = localStorage.getItem(`${CONTEXT_LOCAL_KEY_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.taskId) {
            const age = Date.now() - new Date(parsed.updatedAt || 0).getTime();
            if (age >= 0 && age < MAX_CONTEXT_AGE_MS) {
              return parsed;
            }
          }
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
    onAddComment: (taskId: string, content: string, author?: { id: string; name: string; avatar?: string }) => boolean | void;
  }): Promise<{ success: boolean; action?: string; replySent?: boolean }> {
    if (!messageText || !messageText.trim()) {
      return { success: false };
    }

    // 🔒 TRAVA ATÔMICA SÍNCRONA: se não tiver ID ou já foi processada (memória ou outra aba), aborta imediatamente
    if (!messageId || this.isMessageAlreadyProcessed(messageId)) {
      return { success: false };
    }

    // Trava IMEDIATAMENTE antes de qualquer operação assíncrona para eliminar qualquer race condition
    this.markMessageAsProcessed(messageId);

    // 🔒 TRAVA DISTRIBUÍDA GLOBAL NO FIRESTORE (ACID Transaction):
    // Impede que múltiplos navegadores/origens (localhost + web.app + celular + outros membros da equipe)
    // processem ou enviem resposta duplicada no WhatsApp para o mesmo messageId.
    const claimed = await FirestoreRepository.claimWhatsAppMessage(
      organization.id,
      messageId,
      TAB_SESSION_ID
    );
    if (!claimed) {
      return { success: false };
    }

    const cleanSender = this.cleanPhone(senderPhone);
    const trimmedText = messageText.trim();

    // 🔒 Trava de duplicatas instantâneas de conteúdo (elimina disparos múltiplos de abas/Evolution)
    const contentFingerprint = `${cleanSender}_${trimmedText}`;
    const lastSeenTime = WhatsAppReplyService.recentProcessedFingerprints.get(contentFingerprint) || 0;
    if (Date.now() - lastSeenTime < 6000) {
      return { success: false };
    }
    WhatsAppReplyService.recentProcessedFingerprints.set(contentFingerprint, Date.now());

    // 1. Identificação da demanda e extração da ação/texto
    let targetTaskId: string | null = null;
    let actionText = trimmedText;
    let hasExplicitTaskRef = false;

    // A) Verifica se a mensagem começa com #T-xxxxxx ou contém #T-xxxxxx
    const prefixMatch = trimmedText.match(/^#T-([a-zA-Z0-9_-]+)(?::|\s+)?(.*)/is);
    if (prefixMatch) {
      targetTaskId = prefixMatch[1];
      actionText = (prefixMatch[2] || '').trim();
      hasExplicitTaskRef = true;
    } else {
      // B) Procura citação de mensagem (Swipe to Reply no WhatsApp) ou menção no corpo
      const inQuoteId = this.extractTaskIdFromText(quotedText);
      const inTextId = this.extractTaskIdFromText(trimmedText);

      if (inQuoteId) {
        targetTaskId = inQuoteId;
        hasExplicitTaskRef = true;
        actionText = trimmedText;
      } else if (inTextId) {
        targetTaskId = inTextId;
        hasExplicitTaskRef = true;
        actionText = trimmedText.replace(new RegExp(`#T-${inTextId}:?`, 'gi'), '').trim();
      }
    }

    // C) Se não houve menção explícita nem citação, busca o contexto recente (< 2h)
    if (!targetTaskId) {
      const ctx = await this.getTaskContext(organization.id, cleanSender);
      if (ctx && ctx.taskId) {
        targetTaskId = ctx.taskId;
      }
    }

    // Se ainda não identificou nenhuma tarefa, NÃO adivinha tarefa e NÃO grava comentário em demanda alheia!
    if (!targetTaskId) {
      console.log(`[WhatsAppReply] Mensagem ignorada de ${cleanSender}: nenhuma demanda referenciada.`);
      return { success: false };
    }

    // Localiza a tarefa pelo ID completo ou pelos caracteres finais (ex: #T-n05sih)
    const cleanTarget = targetTaskId.toLowerCase().trim();
    const task = tasks.find((t) => {
      const tid = t.id.toLowerCase();
      return (
        tid === cleanTarget ||
        tid.endsWith(cleanTarget) ||
        (cleanTarget.length >= 5 && tid.includes(cleanTarget))
      );
    });

    if (!task) {
      console.warn(`[WhatsAppReply] Demanda não encontrada para o código: ${targetTaskId}`);
      return { success: false };
    }

    // Localiza o usuário remetente
    let senderUser = this.findUserByPhone(users, cleanSender);
    if (!senderUser && pushName) {
      const cleanPush = pushName.trim().toLowerCase();
      senderUser = users.find((u) => {
        const uName = (u.name || '').trim().toLowerCase();
        return uName === cleanPush || uName.includes(cleanPush) || cleanPush.includes(uName);
      });
    }

    const senderName = senderUser?.name || pushName || 'Membro via WhatsApp';
    const cleanLower = actionText.toLowerCase();
    const instanceName = organization.evolutionConfig?.instanceName || 'Oiko_Gestao';

    // ── COMANDO 1: Mover para Em Andamento (1, /andamento, andamento) ──
    if (cleanLower === '1' || cleanLower === '/andamento' || cleanLower === 'andamento') {
      const updated: Task = {
        ...task,
        status: 'IN_PROGRESS',
        updatedAt: new Date().toISOString(),
      };
      onUpdateTask(updated);

      FirestoreRepository.recordActivity({
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: organization.id,
        campusId: task.campusId,
        userId: senderUser?.id || `wa_${cleanSender.slice(-8)}`,
        userName: `${senderName} (WhatsApp)`,
        action: 'moveu para Em Andamento via WhatsApp',
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      });

      if (messageId) {
        this.markMessageAsProcessed(messageId);
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

      FirestoreRepository.recordActivity({
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: organization.id,
        campusId: task.campusId,
        userId: senderUser?.id || `wa_${cleanSender.slice(-8)}`,
        userName: `${senderName} (WhatsApp)`,
        action: 'enviou para Revisão via WhatsApp',
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      });

      if (messageId) {
        this.markMessageAsProcessed(messageId);
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

      FirestoreRepository.recordActivity({
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: organization.id,
        campusId: task.campusId,
        userId: senderUser?.id || `wa_${cleanSender.slice(-8)}`,
        userName: `${senderName} (WhatsApp)`,
        action: 'marcou como Concluído via WhatsApp',
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      });

      if (messageId) {
        this.markMessageAsProcessed(messageId);
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

        FirestoreRepository.recordActivity({
          id: 'act_' + Math.random().toString(36).substring(2, 9),
          organizationId: organization.id,
          campusId: task.campusId,
          userId: senderUser?.id || `wa_${cleanSender.slice(-8)}`,
          userName: `${senderName} (WhatsApp)`,
          action: `${newCompleted ? 'concluiu' : 'desmarcou'} a subtarefa "${targetItem.text}" via WhatsApp`,
          targetType: 'task',
          targetId: task.id,
          targetTitle: task.title,
          timestamp: new Date().toISOString(),
        });

        if (messageId) {
          this.markMessageAsProcessed(messageId);
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

    // ── SEGURANÇA CONTRA ENQUETES DE GC E CONVERSAS PESSOAIS ──
    // Se a mensagem NÃO tem referência explícita (#T- nem citação de mensagem)
    // NÃO podemos interpretar textos livres como comentários (ex: "Elias - Emoções", "0", "Felipe, Sara")
    if (!hasExplicitTaskRef) {
      console.log(`[WhatsAppReply] Texto livre sem prefixo #T- e sem citação ignorado para evitar captura indevida de conversa.`);
      return { success: false };
    }

    if (!actionText || !actionText.trim()) {
      return { success: false };
    }

    // ── TEXTO LIVRE COM REF EXPLÍCITA: Gravar como Comentário na Tarefa ──
    const alreadyExistsInComments = (comments || []).some(
      (c) =>
        c.taskId === task!.id &&
        (c.content || '').trim() === actionText &&
        Math.abs(Date.now() - new Date(c.createdAt).getTime()) < 60000
    );
    if (alreadyExistsInComments) {
      return { success: false };
    }

    const authorData = senderUser
      ? { id: senderUser.id, name: senderUser.name, avatar: senderUser.avatar }
      : { id: `wa_${cleanSender.slice(-8)}`, name: senderName };

    const commentAdded = onAddComment(task.id, actionText, authorData);
    if (commentAdded === false) {
      return { success: false };
    }

    FirestoreRepository.recordActivity({
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: organization.id,
      campusId: task.campusId,
      userId: senderUser?.id || authorData.id,
      userName: `${authorData.name} (WhatsApp)`,
      action: `comentou via WhatsApp: "${actionText.slice(0, 80)}${actionText.length > 80 ? '...' : ''}"`,
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
      timestamp: new Date().toISOString(),
    });

    if (messageId) {
      this.markMessageAsProcessed(messageId);
    }

    // Responde no WhatsApp confirmando que o comentário foi adicionado (se não desativado)
    if (organization.evolutionConfig?.sendCommentReplyConfirmation !== false) {
      await EvolutionApiService.sendTextMessage({
        instanceName,
        to: senderPhone,
        text: `💬 *Comentário Registrado!*\n\nSua resposta foi inserida na demanda *"${task.title}"*:\n\n_${actionText.slice(0, 150)}${actionText.length > 150 ? '...' : ''}_\n\n👉 A equipe já pode visualizar seu comentário no Kanban.`,
        configOverride: organization.evolutionConfig,
      });
    }

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
    onAddComment: (taskId: string, content: string, author?: { id: string; name: string; avatar?: string }) => boolean | void;
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

    // 🔒 Inicializa timestamp: NUNCA olha 45 minutos no passado.
    // Começa exatamente em AGORA (Date.now()), ou recupera no máximo 30s se a página deu reload rápido
    if (!this.lastCheckTimestamps.has(orgId)) {
      const savedTs = Number(localStorage.getItem(`${LAST_POLL_TS_KEY}${orgId}`) || 0);
      const startTs = savedTs > 0 ? Math.max(savedTs, Date.now() - 30 * 1000) : Date.now();
      this.lastCheckTimestamps.set(orgId, startTs);
      try {
        localStorage.setItem(`${LAST_POLL_TS_KEY}${orgId}`, startTs.toString());
      } catch {}
    }

    const poll = async () => {
      // 🔒 1. Trava anti-concorrência de abas (Multi-Tab Leader Election)
      const leaderKey = `${LEADER_KEY_PREFIX}${orgId}`;
      const now = Date.now();
      try {
        const rawLeader = localStorage.getItem(leaderKey);
        if (rawLeader) {
          const leader = JSON.parse(rawLeader);
          if (leader.tabId !== TAB_SESSION_ID && now < leader.expiresAt) {
            // Outra aba do navegador está ativa e liderando o polling
            return;
          }
        }
        // Assume / renova a liderança desta aba por 15 segundos
        localStorage.setItem(
          leaderKey,
          JSON.stringify({ tabId: TAB_SESSION_ID, expiresAt: now + 15000 })
        );
      } catch {}

      // 🔒 2. Trava anti-sobreposição na mesma aba (In-flight guard)
      if (this.isPollingMap.get(orgId)) {
        return;
      }
      this.isPollingMap.set(orgId, true);

      try {
        const messages = await EvolutionApiService.fetchRecentIncomingMessages(
          instanceName,
          orgConfig,
          50
        );

        // 🛡️ 3. Dreno do histórico no primeiro boot: marca todas as mensagens preexistentes no WhatsApp
        // como já processadas para NUNCA re-executar mensagens antigas após refresh / reload!
        if (!this.isInitialized.get(orgId)) {
          this.isInitialized.set(orgId, true);
          for (const msg of messages) {
            const mId = msg.key?.id;
            if (mId) {
              this.markMessageAsProcessed(mId);
            }
          }
          const nowTs = Date.now();
          this.lastCheckTimestamps.set(orgId, nowTs);
          try {
            localStorage.setItem(`${LAST_POLL_TS_KEY}${orgId}`, nowTs.toString());
          } catch {}
          return;
        }

        const lastCheck = this.lastCheckTimestamps.get(orgId) || 0;
        let newestTimestamp = lastCheck;

        for (const msg of messages) {
          const key = msg.key || {};
          const msgId = key.id;

          // Se for mensagem enviada pelo próprio sistema ou sem ID, ignora
          if (Boolean(key.fromMe) || !msgId) continue;

          // 🔒 Se já processada, pula imediatamente
          if (this.isMessageAlreadyProcessed(msgId)) continue;

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

          // 🔒 Se a mensagem tiver mais de 10 minutos de idade, descarta para nunca reprocessar histórico antigo
          if (ts < Date.now() - 10 * 60 * 1000) {
            this.markMessageAsProcessed(msgId);
            continue;
          }

          if (ts <= lastCheck) continue;
          if (ts > newestTimestamp) {
            newestTimestamp = ts;
            this.lastCheckTimestamps.set(orgId, ts);
          }

          // 🔒 Verifica se o histórico da Evolution API já possui uma resposta enviada (fromMe: true)
          // para este remetente após o timestamp desta mensagem (por outro dispositivo/aba)
          const alreadyRepliedInEvolution = messages.some((m) => {
            if (!Boolean(m.key?.fromMe)) return false;
            const mJid = m.key?.remoteJidAlt || m.key?.remoteJid || '';
            const mPhone = mJid.replace(/@.+$/, '');
            if (!this.matchPhone(mPhone, senderPhone)) return false;
            const mTs = m.messageTimestamp
              ? typeof m.messageTimestamp === 'number' && m.messageTimestamp < 10000000000
                ? m.messageTimestamp * 1000
                : Number(m.messageTimestamp)
              : 0;
            return mTs >= ts;
          });
          if (alreadyRepliedInEvolution) {
            this.markMessageAsProcessed(msgId);
            continue;
          }

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
        try {
          localStorage.setItem(`${LAST_POLL_TS_KEY}${orgId}`, newestTimestamp.toString());
        } catch {}
      } catch (err) {
        // Silencioso em caso de erro temporário de rede
      } finally {
        this.isPollingMap.set(orgId, false);
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
