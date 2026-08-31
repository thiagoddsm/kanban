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
  orderBy 
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

export class FirestoreRepository {
  /**
   * Fetch all organizations from Firestore (seeds initial orgs if empty)
   */
  public static async fetchOrganizations(): Promise<Organization[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getOrganizations();
    }
    try {
      const orgsCol = collection(db, 'organizations');
      const snap = await getDocs(orgsCol);
      if (snap.empty) {
        const local = StorageService.getOrganizations();
        // Seed initial organizations to Firestore
        Promise.all(local.map((o) => setDoc(doc(db, 'organizations', o.id), o))).catch((err) => {
          console.warn('Erro ao semear organizações no Firestore:', err);
        });
        return local;
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
        const local = StorageService.getCampuses(orgId);
        Promise.all(local.map((c) => setDoc(doc(db, 'organizations', orgId, 'campuses', c.id), c))).catch(() => {});
        return local;
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
   * Fetch all tasks for an organization from Firestore (with automatic initial seeding)
   */
  public static async fetchTasks(orgId: string): Promise<Task[]> {
    if (!isFirebaseConfigured || !db) {
      return StorageService.getTasks(orgId);
    }
    try {
      const tasksCol = collection(db, 'organizations', orgId, 'tasks');
      const snap = await getDocs(tasksCol);
      if (snap.empty) {
        const local = StorageService.getTasks(orgId);
        // Seed initial tasks to Firestore in background
        Promise.all(local.map((t) => setDoc(doc(db, 'organizations', orgId, 'tasks', t.id), t))).catch(() => {});
        return local;
      }
      const remote = snap.docs.map((d) => d.data() as Task);
      return remote;
    } catch (e) {
      console.warn('Aviso: lendo do cache local enquanto conecta ao Firestore:', e);
      return StorageService.getTasks(orgId);
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
        const local = StorageService.getEvents(orgId);
        Promise.all(local.map((ev) => setDoc(doc(db, 'organizations', orgId, 'events', ev.id), ev))).catch(() => {});
        return local;
      }
      return snap.docs.map((d) => d.data() as ChurchEvent);
    } catch (e) {
      console.warn('Aviso: lendo do cache local enquanto conecta ao Firestore:', e);
      return StorageService.getEvents(orgId);
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
      await setDoc(taskRef, task, { merge: true });
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
      await setDoc(eventRef, event, { merge: true });
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
