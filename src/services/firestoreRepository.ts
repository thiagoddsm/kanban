import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { StorageService } from './storageService';
import { 
  Task, 
  ChurchEvent, 
  Organization, 
  Campus, 
  Membership, 
  User, 
  ActivityLog, 
  Comment,
  TaskQueryFilter,
  PagedResponse,
  Notification,
  AutomationRule
} from '../types';

function sanitizeForFirestore<T>(data: T): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        output[key] = sanitizeForFirestore(value);
      }
    }
    return output;
  }
  return data;
}

export class FirestoreRepository {
  /**
   * Fetch all organizations from Firestore
   */
  public static async fetchOrganizations(): Promise<Organization[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getOrganizations();
    }
    try {
      const orgsCol = collection(db, 'organizations');
      const snap = await getDocs(orgsCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Organization);
    } catch (e) {
      console.warn('Aviso: lendo organizações do cache local:', e);
      return StorageService.getOrganizations();
    }
  }

  /**
   * Save / Update Organization in Firestore
   */
  public static async saveOrganization(org: Organization): Promise<void> {
    StorageService.addOrganization(org);
    if (!isFirebaseConfigured || !db) return;

    try {
      const orgRef = doc(db, 'organizations', org.id);
      await setDoc(orgRef, org, { merge: true });
      console.log('✅ Organização gravada no Firestore:', org.id);
    } catch (e) {
      console.error('Erro ao gravar organização no Firestore:', e);
    }
  }

  /**
   * Realtime subscription for organizations
   */
  public static subscribeOrganizations(callback: (orgs: Organization[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const orgsCol = collection(db, 'organizations');
      return onSnapshot(orgsCol, (snap) => {
        const orgs = snap.docs.map((d) => d.data() as Organization);
        callback(orgs);
      }, (err) => {
        console.warn('Subscription error for organizations:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to organizations:', e);
      return () => {};
    }
  }

  /**
   * Delete Organization from Firestore
   */
  public static async deleteOrganization(orgId: string): Promise<void> {
    StorageService.deleteOrganization(orgId);
    if (!isFirebaseConfigured || !db) return;

    try {
      const orgRef = doc(db, 'organizations', orgId);
      await deleteDoc(orgRef);
      console.log('✅ Organização excluída do Firestore:', orgId);
    } catch (e) {
      console.error('Erro ao excluir organização do Firestore:', e);
    }
  }

  /**
   * Fetch all campuses for an organization from Firestore
   */
  public static async fetchCampuses(orgId: string): Promise<Campus[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getCampuses(orgId);
    }
    try {
      const campusCol = collection(db, 'organizations', orgId, 'campuses');
      const snap = await getDocs(campusCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Campus);
    } catch (e) {
      console.warn('Aviso: lendo campi do cache local:', e);
      return StorageService.getCampuses(orgId);
    }
  }

  /**
   * Realtime subscription for campuses
   */
  public static subscribeCampuses(orgId: string, callback: (campuses: Campus[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const campusCol = collection(db, 'organizations', orgId, 'campuses');
      return onSnapshot(campusCol, (snap) => {
        const campuses = snap.docs.map((d) => d.data() as Campus);
        callback(campuses);
      }, (err) => {
        console.warn('Subscription error for campuses:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to campuses:', e);
      return () => {};
    }
  }

  /**
   * Save / Update Campus in Firestore
   */
  public static async saveCampus(campus: Campus): Promise<void> {
    StorageService.updateCampus(campus);
    if (!isFirebaseConfigured || !db) return;

    try {
      const campusRef = doc(db, 'organizations', campus.organizationId, 'campuses', campus.id);
      const sanitized = sanitizeForFirestore(campus);
      await setDoc(campusRef, sanitized, { merge: true });
      console.log('✅ Campus gravado no Firestore:', campus.id);
    } catch (e) {
      console.error('Erro ao gravar campus no Firestore:', e);
    }
  }

  /**
   * Delete Campus from Firestore
   */
  public static async deleteCampus(orgId: string, campusId: string): Promise<void> {
    StorageService.deleteCampus(orgId, campusId);
    if (!isFirebaseConfigured || !db) return;

    try {
      const campusRef = doc(db, 'organizations', orgId, 'campuses', campusId);
      await deleteDoc(campusRef);
      console.log('✅ Campus excluído do Firestore:', campusId);
    } catch (e) {
      console.error('Erro ao excluir campus do Firestore:', e);
    }
  }

  /**
   * Save / Update Membership in Firestore
   */
  public static async saveMembership(membership: Membership): Promise<void> {
    StorageService.addMembership(membership);
    if (!isFirebaseConfigured || !db) return;

    try {
      // IMPORTANTE: O documento de membership é keyed por userId (não pelo membership.id).
      // As Firestore Rules fazem get() usando request.auth.uid como ID do documento,
      // portanto esta chave DEVE ser o userId para que as rules funcionem corretamente.
      const memRef = doc(db, 'organizations', membership.organizationId, 'memberships', membership.userId);
      const sanitized = sanitizeForFirestore(membership);
      await setDoc(memRef, sanitized, { merge: true });
      console.log('✅ Membership gravado no Firestore (doc key = userId):', membership.userId, '| membership.id:', membership.id);
    } catch (e) {
      console.error('Erro ao gravar membership no Firestore:', e);
    }
  }

  /**
   * Fetch all memberships for an organization from Firestore
   */
  public static async fetchMemberships(orgId: string): Promise<Membership[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getMemberships().filter((m) => m.organizationId === orgId);
    }
    try {
      const memCol = collection(db, 'organizations', orgId, 'memberships');
      const snap = await getDocs(memCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Membership);
    } catch (e) {
      console.warn('Aviso: lendo memberships do cache local:', e);
      return StorageService.getMemberships().filter((m) => m.organizationId === orgId);
    }
  }

  /**
   * Realtime subscription for memberships
   */
  public static subscribeMemberships(orgId: string, callback: (memberships: Membership[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const memCol = collection(db, 'organizations', orgId, 'memberships');
      return onSnapshot(memCol, (snap) => {
        const memberships = snap.docs.map((d) => d.data() as Membership);
        callback(memberships);
      }, (err) => {
        console.warn('Subscription error for memberships:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to memberships:', e);
      return () => {};
    }
  }

  /**
   * Delete Membership from Firestore
   */
  public static async deleteMembership(orgId: string, userId: string): Promise<void> {
    const mems = StorageService.getMemberships().filter((m) => !(m.organizationId === orgId && m.userId === userId));
    StorageService.saveMemberships(mems);
    if (!isFirebaseConfigured || !db) return;

    try {
      const memRef = doc(db, 'organizations', orgId, 'memberships', userId);
      await deleteDoc(memRef);
      console.log('✅ Membership excluído do Firestore:', userId);
    } catch (e) {
      console.error('Erro ao excluir membership do Firestore:', e);
    }
  }

  /**
   * Fetch all users from Firestore
   */
  public static async fetchUsers(): Promise<User[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getUsers();
    }
    try {
      const usersCol = collection(db, 'users');
      const snap = await getDocs(usersCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as User);
    } catch (e) {
      console.warn('Aviso: lendo usuários do cache local:', e);
      return StorageService.getUsers();
    }
  }

  /**
   * Realtime subscription for users
   */
  public static subscribeUsers(callback: (users: User[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const usersCol = collection(db, 'users');
      return onSnapshot(usersCol, (snap) => {
        const users = snap.docs.map((d) => d.data() as User);
        callback(users);
      }, (err) => {
        console.warn('Subscription error for users:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to users:', e);
      return () => {};
    }
  }

  /**
   * Fetch tasks for an organization from Firestore with filtering and ordering
   */
  public static async fetchTasks(orgId: string, filter?: TaskQueryFilter): Promise<Task[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getTasks(orgId);
    }
    try {
      const tasksCol = collection(db, 'organizations', orgId, 'tasks');
      const snap = await getDocs(tasksCol);

      if (snap.empty) {
        return [];
      }
      let tasks = snap.docs.map((d) => d.data() as Task);

      if (filter?.isArchived !== undefined) {
        tasks = tasks.filter((t) => !!t.isArchived === filter.isArchived);
      }
      if (filter?.campusId) {
        tasks = tasks.filter((t) => t.campusId === filter.campusId);
      }
      if (filter?.status) {
        tasks = tasks.filter((t) => t.status === filter.status);
      }
      if (filter?.eventId) {
        tasks = tasks.filter((t) => t.eventId === filter.eventId);
      }

      tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

      if (filter?.limitCount && filter.limitCount > 0) {
        tasks = tasks.slice(0, filter.limitCount);
      }

      return tasks;
    } catch (e) {
      console.warn('Aviso: lendo tarefas do cache local:', e);
      return StorageService.getTasks(orgId);
    }
  }

  /**
   * Realtime subscription for tasks with filtering
   */
  public static subscribeTasks(
    orgId: string, 
    callback: (tasks: Task[]) => void,
    filter?: TaskQueryFilter
  ): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const tasksCol = collection(db, 'organizations', orgId, 'tasks');

      return onSnapshot(tasksCol, (snap) => {
        let tasks = snap.docs.map((d) => d.data() as Task);

        if (filter?.isArchived !== undefined) {
          tasks = tasks.filter((t) => !!t.isArchived === filter.isArchived);
        }
        if (filter?.campusId) {
          tasks = tasks.filter((t) => t.campusId === filter.campusId);
        }
        if (filter?.status) {
          tasks = tasks.filter((t) => t.status === filter.status);
        }
        if (filter?.eventId) {
          tasks = tasks.filter((t) => t.eventId === filter.eventId);
        }

        tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

        if (filter?.limitCount && filter.limitCount > 0) {
          tasks = tasks.slice(0, filter.limitCount);
        }

        callback(tasks);
      }, (err) => {
        console.warn('Subscription error for tasks:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to tasks:', e);
      return () => {};
    }
  }

  /**
   * Fetch all active events for an organization from Firestore (ordered by startDate)
   */
  public static async fetchEvents(orgId: string, isArchived: boolean = false): Promise<ChurchEvent[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getEvents(orgId);
    }
    try {
      const eventsCol = collection(db, 'organizations', orgId, 'events');
      const snap = await getDocs(eventsCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs
        .map((d) => d.data() as ChurchEvent)
        .filter((e) => (isArchived ? !!e.isArchived : !e.isArchived))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } catch (e) {
      console.warn('Aviso: lendo eventos do cache local:', e);
      return StorageService.getEvents(orgId);
    }
  }

  /**
   * Realtime subscription for events
   */
  public static subscribeEvents(
    orgId: string, 
    callback: (events: ChurchEvent[]) => void,
    isArchived: boolean = false
  ): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const eventsCol = collection(db, 'organizations', orgId, 'events');
      return onSnapshot(eventsCol, (snap) => {
        const events = snap.docs
          .map((d) => d.data() as ChurchEvent)
          .filter((e) => (isArchived ? !!e.isArchived : !e.isArchived))
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        callback(events);
      }, (err) => {
        console.warn('Subscription error for events:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to events:', e);
      return () => {};
    }
  }

  /**
   * Save / Update Task to /organizations/{orgId}/tasks/{taskId} com controle de concorrência otimista
   */
  public static async saveTask(
    task: Task, 
    expectedVersion?: number
  ): Promise<{ success: boolean; conflict?: boolean; remoteTask?: Task }> {
    if (!isFirebaseConfigured || !db) {
      StorageService.updateTask(task);
      return { success: true };
    }
    
    try {
      const taskRef = doc(db, 'organizations', task.organizationId, 'tasks', task.id);

      // Verificação de versão se expectedVersion foi fornecido
      if (expectedVersion !== undefined) {
        const snap = await getDoc(taskRef);
        if (snap.exists()) {
          const remote = snap.data() as Task;
          const remoteVersion = remote.version || 1;
          if (remoteVersion > expectedVersion) {
            console.warn(`⚠️ Conflito de concorrência na tarefa ${task.id}: v${expectedVersion} local vs v${remoteVersion} remoto`);
            return { success: false, conflict: true, remoteTask: remote };
          }
        }
      }

      // Excluir campos legados desnormalizados antes de gravar no Firestore.
      // A fonte de verdade no Firestore é exclusivamente `assigneeIds`.
      const { assigneeId, assigneeName, assigneeAvatar, assignees, ...taskWithoutLegacy } = task;

      const nextVersion = (task.version || 0) + 1;
      const taskToSave = {
        ...taskWithoutLegacy,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };

      const sanitized = sanitizeForFirestore(taskToSave);
      await setDoc(taskRef, sanitized, { merge: true });
      
      StorageService.updateTask({ ...task, version: nextVersion, updatedAt: taskToSave.updatedAt });
      console.log(`✅ Tarefa gravada no Firestore (v${nextVersion}):`, task.id);
      return { success: true };
    } catch (e) {
      console.error('Erro ao sincronizar tarefa com Firestore:', e);
      StorageService.updateTask(task);
      return { success: false };
    }
  }

  /**
   * Delete Task from /organizations/{orgId}/tasks/{taskId}
   */
  public static async deleteTask(orgId: string, taskId: string): Promise<void> {
    StorageService.deleteTask(orgId, taskId);
    if (!isFirebaseConfigured || !db) return;

    try {
      const taskRef = doc(db, 'organizations', orgId, 'tasks', taskId);
      await deleteDoc(taskRef);
      console.log('✅ Tarefa excluída do Firestore:', taskId);
    } catch (e) {
      console.error('Erro ao excluir tarefa do Firestore:', e);
    }
  }

  /**
   * Save / Update Event to /organizations/{orgId}/events/{eventId} com controle de concorrência otimista
   */
  public static async saveEvent(
    event: ChurchEvent,
    expectedVersion?: number
  ): Promise<{ success: boolean; conflict?: boolean; remoteEvent?: ChurchEvent }> {
    if (!isFirebaseConfigured || !db) {
      StorageService.updateEvent(event);
      return { success: true };
    }

    try {
      const eventRef = doc(db, 'organizations', event.organizationId, 'events', event.id);

      if (expectedVersion !== undefined) {
        const snap = await getDoc(eventRef);
        if (snap.exists()) {
          const remote = snap.data() as ChurchEvent;
          const remoteVersion = remote.version || 1;
          if (remoteVersion > expectedVersion) {
            console.warn(`⚠️ Conflito de concorrência no evento ${event.id}: v${expectedVersion} local vs v${remoteVersion} remoto`);
            return { success: false, conflict: true, remoteEvent: remote };
          }
        }
      }

      const nextVersion = (event.version || 0) + 1;
      const eventToSave = {
        ...event,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };

      const sanitized = sanitizeForFirestore(eventToSave);
      await setDoc(eventRef, sanitized, { merge: true });

      StorageService.updateEvent(eventToSave);
      console.log(`✅ Evento gravado no Firestore (v${nextVersion}):`, event.id);
      return { success: true };
    } catch (e) {
      console.error('Erro ao sincronizar evento com Firestore:', e);
      StorageService.updateEvent(event);
      return { success: false };
    }
  }

  /**
   * Delete Event from /organizations/{orgId}/events/{eventId}
   */
  public static async deleteEvent(orgId: string, eventId: string): Promise<void> {
    StorageService.deleteEvent(orgId, eventId);
    if (!isFirebaseConfigured || !db) return;

    try {
      const eventRef = doc(db, 'organizations', orgId, 'events', eventId);
      await deleteDoc(eventRef);
      console.log('✅ Evento excluído do Firestore:', eventId);
    } catch (e) {
      console.error('Erro ao excluir evento do Firestore:', e);
    }
  }

  /**
   * Sync User Profile with /users/{userId}
   */
  public static async syncUser(user: User): Promise<void> {
    StorageService.addUser(user);
    if (!isFirebaseConfigured || !db) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
    } catch (e) {
      console.error('Erro ao gravar usuário no Firestore:', e);
    }
  }

  /**
   * Record Audit Activity to /organizations/{orgId}/activities/{activityId}
   */
  public static async recordActivity(activity: ActivityLog): Promise<void> {
    StorageService.addActivity(activity);
    if (!isFirebaseConfigured || !db) return;

    try {
      const actRef = doc(db, 'organizations', activity.organizationId, 'activities', activity.id);
      await setDoc(actRef, activity);
    } catch (e) {
      console.error('Erro ao gravar auditoria no Firestore:', e);
    }
  }

  /**
   * Save Comment to /organizations/{orgId}/comments/{commentId}
   */
  public static async saveComment(comment: Comment): Promise<void> {
    StorageService.addComment(comment);
    if (!isFirebaseConfigured || !db) return;

    try {
      const commentRef = doc(db, 'organizations', comment.organizationId, 'comments', comment.id);
      const sanitized = sanitizeForFirestore(comment);
      await setDoc(commentRef, sanitized, { merge: true });
    } catch (e) {
      console.error('Erro ao gravar comentário no Firestore:', e);
    }
  }

  /**
   * Fetch all comments for an organization from Firestore
   */
  public static async fetchComments(orgId: string): Promise<Comment[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getComments(orgId);
    }
    try {
      const commentsCol = collection(db, 'organizations', orgId, 'comments');
      const snap = await getDocs(commentsCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Comment);
    } catch (e) {
      console.warn('Aviso: lendo comentários do cache local:', e);
      return StorageService.getComments(orgId);
    }
  }

  /**
   * Realtime subscription for comments
   */
  public static subscribeComments(orgId: string, callback: (comments: Comment[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const commentsCol = collection(db, 'organizations', orgId, 'comments');
      return onSnapshot(commentsCol, (snap) => {
        const comments = snap.docs.map((d) => d.data() as Comment);
        callback(comments);
      }, (err) => {
        console.warn('Subscription error for comments:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to comments:', e);
      return () => {};
    }
  }

  /**
   * Save Organization Custom Configuration Lists (Demand Types, Event Categories, Departments)
   */
  public static async saveOrgConfig(orgId: string, config: { demandTypes?: any[]; eventCategories?: any[]; departments?: any[] }): Promise<void> {
    if (!isFirebaseConfigured || !db) return;

    try {
      const configRef = doc(db, 'organizations', orgId, 'settings', 'config');
      const sanitized = sanitizeForFirestore(config);
      await setDoc(configRef, sanitized, { merge: true });
    } catch (e) {
      console.error('Erro ao gravar configurações no Firestore:', e);
    }
  }

  /**
   * Fetch Organization Custom Configuration Lists from Firestore
   */
  public static async fetchOrgConfig(orgId: string): Promise<{ demandTypes?: any[]; eventCategories?: any[]; departments?: any[] } | null> {
    if (!isFirebaseConfigured || !db) return null;

    try {
      const configRef = doc(db, 'organizations', orgId, 'settings', 'config');
      const snap = await getDoc(configRef);
      if (!snap.exists()) return null;
      return snap.data() as any;
    } catch (e) {
      console.warn('Aviso: erro ao ler configurações do Firestore:', e);
      return null;
    }
  }

  /**
   * Realtime subscription for organization custom configuration
   */
  public static subscribeOrgConfig(orgId: string, callback: (config: { demandTypes?: any[]; eventCategories?: any[]; departments?: any[] }) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const configRef = doc(db, 'organizations', orgId, 'settings', 'config');
      return onSnapshot(configRef, (snap) => {
        if (snap.exists()) {
          callback(snap.data() as any);
        }
      }, (err) => {
        console.warn('Subscription error for config:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to config:', e);
      return () => {};
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // NOTIFICAÇÕES & AUTOMAÇÕES (FASE 7)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Grava uma notificação no Firestore em /organizations/{orgId}/notifications/{notifId}
   */
  public static async saveNotification(notification: Notification): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const notifRef = doc(db, 'organizations', notification.organizationId, 'notifications', notification.id);
      const sanitized = sanitizeForFirestore(notification);
      await setDoc(notifRef, sanitized, { merge: true });
    } catch (e) {
      console.error('Erro ao salvar notificação no Firestore:', e);
    }
  }

  /**
   * Busca notificações do usuário logado na organização
   */
  public static async fetchNotifications(orgId: string, userId: string): Promise<Notification[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const notifsCol = collection(db, 'organizations', orgId, 'notifications');
      const q = query(
        notifsCol,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Notification);
    } catch (e) {
      console.warn('Aviso ao carregar notificações do Firestore:', e);
      return [];
    }
  }

  /**
   * Escuta notificações do usuário logado em tempo real
   */
  public static subscribeNotifications(
    orgId: string, 
    userId: string, 
    callback: (notifs: Notification[]) => void
  ): () => void {
    if (!isFirebaseConfigured || !db) return () => {};
    try {
      const notifsCol = collection(db, 'organizations', orgId, 'notifications');
      const q = query(
        notifsCol,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      return onSnapshot(q, (snap) => {
        const notifs = snap.docs.map((d) => d.data() as Notification);
        callback(notifs);
      }, (err) => {
        console.warn('Subscription error for notifications:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to notifications:', e);
      return () => {};
    }
  }

  /**
   * Marca uma notificação como lida no Firestore
   */
  public static async markNotificationRead(orgId: string, notifId: string): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const notifRef = doc(db, 'organizations', orgId, 'notifications', notifId);
      await updateDoc(notifRef, { readAt: new Date().toISOString() });
    } catch (e) {
      console.error('Erro ao marcar notificação como lida:', e);
    }
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  public static async markAllNotificationsRead(orgId: string, userId: string, notifIds: string[]): Promise<void> {
    if (!isFirebaseConfigured || !db || notifIds.length === 0) return;
    try {
      const now = new Date().toISOString();
      const promises = notifIds.map((id) => {
        const notifRef = doc(db, 'organizations', orgId, 'notifications', id);
        return updateDoc(notifRef, { readAt: now }).catch(() => {});
      });
      await Promise.all(promises);
    } catch (e) {
      console.error('Erro ao marcar todas as notificações como lidas:', e);
    }
  }

  /**
   * Grava as regras de automação da organização no Firestore
   */
  public static async saveAutomationRules(orgId: string, rules: AutomationRule[]): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      const rulesDocRef = doc(db, 'organizations', orgId, 'settings', 'automations');
      await setDoc(rulesDocRef, { rules: sanitizeForFirestore(rules), updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('Erro ao salvar regras de automação no Firestore:', e);
    }
  }

  /**
   * Busca as regras de automação da organização
   */
  public static async fetchAutomationRules(orgId: string): Promise<AutomationRule[] | null> {
    if (!isFirebaseConfigured || !db) return null;
    try {
      const rulesDocRef = doc(db, 'organizations', orgId, 'settings', 'automations');
      const snap = await getDoc(rulesDocRef);
      if (!snap.exists()) return null;
      return (snap.data() as any)?.rules || null;
    } catch (e) {
      console.warn('Aviso ao ler regras de automação:', e);
      return null;
    }
  }

  /**
   * Escuta as regras de automação da organização em tempo real
   */
  public static subscribeAutomationRules(
    orgId: string, 
    callback: (rules: AutomationRule[]) => void
  ): () => void {
    if (!isFirebaseConfigured || !db) return () => {};
    try {
      const rulesDocRef = doc(db, 'organizations', orgId, 'settings', 'automations');
      return onSnapshot(rulesDocRef, (snap) => {
        if (snap.exists()) {
          const rules = (snap.data() as any)?.rules;
          if (Array.isArray(rules)) {
            callback(rules);
          }
        }
      }, (err) => {
        console.warn('Subscription error for automations:', err);
      });
    } catch (e) {
      console.warn('Failed to subscribe to automations:', e);
      return () => {};
    }
  }
}

