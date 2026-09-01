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
  Comment 
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
   * Fetch all tasks for an organization from Firestore
   */
  public static async fetchTasks(orgId: string): Promise<Task[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getTasks(orgId);
    }
    try {
      const tasksCol = collection(db, 'organizations', orgId, 'tasks');
      const snap = await getDocs(tasksCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as Task);
    } catch (e) {
      console.warn('Aviso: lendo tarefas do cache local:', e);
      return StorageService.getTasks(orgId);
    }
  }

  /**
   * Realtime subscription for tasks
   */
  public static subscribeTasks(orgId: string, callback: (tasks: Task[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const tasksCol = collection(db, 'organizations', orgId, 'tasks');
      return onSnapshot(tasksCol, (snap) => {
        const tasks = snap.docs.map((d) => d.data() as Task);
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
   * Fetch all events for an organization from Firestore
   */
  public static async fetchEvents(orgId: string): Promise<ChurchEvent[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getEvents(orgId);
    }
    try {
      const eventsCol = collection(db, 'organizations', orgId, 'events');
      const snap = await getDocs(eventsCol);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as ChurchEvent);
    } catch (e) {
      console.warn('Aviso: lendo eventos do cache local:', e);
      return StorageService.getEvents(orgId);
    }
  }

  /**
   * Realtime subscription for events
   */
  public static subscribeEvents(orgId: string, callback: (events: ChurchEvent[]) => void): () => void {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const eventsCol = collection(db, 'organizations', orgId, 'events');
      return onSnapshot(eventsCol, (snap) => {
        const events = snap.docs.map((d) => d.data() as ChurchEvent);
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
   * Save / Update Task to /organizations/{orgId}/tasks/{taskId}
   */
  public static async saveTask(task: Task): Promise<void> {
    StorageService.updateTask(task);
    if (!isFirebaseConfigured || !db) return;
    
    try {
      const taskRef = doc(db, 'organizations', task.organizationId, 'tasks', task.id);

      // Excluir campos legados desnormalizados antes de gravar no Firestore.
      // Esses campos ficam apenas no estado React para compatibilidade de UI.
      // A fonte de verdade no Firestore é exclusivamente `assigneeIds`.
      const { assigneeId, assigneeName, assigneeAvatar, assignees, ...taskWithoutLegacy } = task;

      const sanitized = sanitizeForFirestore(taskWithoutLegacy);
      await setDoc(taskRef, sanitized, { merge: true });
      console.log('✅ Tarefa gravada no Firestore (sem campos legados de assignee):', task.id);
    } catch (e) {
      console.error('Erro ao sincronizar tarefa com Firestore:', e);
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
   * Save / Update Event to /organizations/{orgId}/events/{eventId}
   */
  public static async saveEvent(event: ChurchEvent): Promise<void> {
    StorageService.updateEvent(event);
    if (!isFirebaseConfigured || !db) return;

    try {
      const eventRef = doc(db, 'organizations', event.organizationId, 'events', event.id);
      const sanitized = sanitizeForFirestore(event);
      await setDoc(eventRef, sanitized, { merge: true });
      console.log('✅ Evento gravado no Firestore com sucesso:', event.id);
    } catch (e) {
      console.error('Erro ao sincronizar evento com Firestore:', e);
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
}
