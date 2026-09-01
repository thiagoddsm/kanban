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
   * Save / Update Campus in Firestore
   */
  public static async saveCampus(campus: Campus): Promise<void> {
    StorageService.addCampus(campus);
    if (!isFirebaseConfigured || !db) return;

    try {
      const campusRef = doc(db, 'organizations', campus.organizationId, 'campuses', campus.id);
      await setDoc(campusRef, campus, { merge: true });
      console.log('✅ Campus gravado no Firestore:', campus.id);
    } catch (e) {
      console.error('Erro ao gravar campus no Firestore:', e);
    }
  }

  /**
   * Save / Update Membership in Firestore
   */
  public static async saveMembership(membership: Membership): Promise<void> {
    StorageService.addMembership(membership);
    if (!isFirebaseConfigured || !db) return;

    try {
      const memRef = doc(db, 'organizations', membership.organizationId, 'memberships', membership.userId);
      await setDoc(memRef, membership, { merge: true });
      console.log('✅ Membership gravado no Firestore:', membership.id);
    } catch (e) {
      console.error('Erro ao gravar membership no Firestore:', e);
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
      const sanitized = sanitizeForFirestore(task);
      await setDoc(taskRef, sanitized, { merge: true });
      console.log('✅ Tarefa gravada no Firestore com sucesso:', task.id);
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
}
