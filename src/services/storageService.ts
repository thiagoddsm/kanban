import { 
  Organization, 
  Campus, 
  Membership, 
  User, 
  Task, 
  ChurchEvent, 
  Comment, 
  ActivityLog 
} from '../types';
import { 
  INITIAL_ORGANIZATIONS, 
  INITIAL_CAMPUSES, 
  INITIAL_USERS, 
  INITIAL_MEMBERSHIPS, 
  INITIAL_EVENTS, 
  INITIAL_TASKS, 
  INITIAL_COMMENTS, 
  INITIAL_ACTIVITIES 
} from './mockData';

// Global keys
const ORGS_KEY = 'marketing_saas_organizations_v3';
const USERS_KEY = 'marketing_saas_global_users_v3';
const MEMBERSHIPS_KEY = 'marketing_saas_memberships_v3';

// Organization-scoped key generator
const getOrgKey = (orgId: string, entity: string) => `marketing_org_${orgId}_${entity}_v3`;

export class StorageService {
  // --- ORGANIZATIONS ---
  static getOrganizations(): Organization[] {
    const raw = localStorage.getItem(ORGS_KEY);
    if (!raw) {
      localStorage.setItem(ORGS_KEY, JSON.stringify(INITIAL_ORGANIZATIONS));
      return INITIAL_ORGANIZATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ORGANIZATIONS;
    }
  }

  static saveOrganizations(orgs: Organization[]): void {
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
  }

  static addOrganization(org: Organization): Organization[] {
    const orgs = this.getOrganizations();
    const updated = [...orgs, org];
    this.saveOrganizations(updated);
    return updated;
  }

  // --- CAMPUSES (Scoped to Org) ---
  static getCampuses(orgId: string): Campus[] {
    const key = getOrgKey(orgId, 'campuses');
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = INITIAL_CAMPUSES.filter((c) => c.organizationId === orgId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CAMPUSES.filter((c) => c.organizationId === orgId);
    }
  }

  static saveCampuses(orgId: string, campuses: Campus[]): void {
    localStorage.setItem(getOrgKey(orgId, 'campuses'), JSON.stringify(campuses));
  }

  static addCampus(campus: Campus): Campus[] {
    const list = this.getCampuses(campus.organizationId);
    const updated = [...list, campus];
    this.saveCampuses(campus.organizationId, updated);
    return updated;
  }

  // --- GLOBAL USERS ---
  static getUsers(): User[] {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static addUser(user: User): User[] {
    const users = this.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    let updated: User[];
    if (existingIndex >= 0) {
      updated = [...users];
      updated[existingIndex] = { ...updated[existingIndex], ...user };
    } else {
      updated = [...users, user];
    }
    this.saveUsers(updated);
    return updated;
  }

  static updateUser(user: User): User[] {
    return this.addUser(user);
  }

  // --- MEMBERSHIPS ---
  static getMemberships(orgId?: string): Membership[] {
    const raw = localStorage.getItem(MEMBERSHIPS_KEY);
    let all: Membership[] = [];
    if (!raw) {
      localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(INITIAL_MEMBERSHIPS));
      all = INITIAL_MEMBERSHIPS;
    } else {
      try {
        all = JSON.parse(raw);
      } catch {
        all = INITIAL_MEMBERSHIPS;
      }
    }
    return orgId ? all.filter((m) => m.organizationId === orgId) : all;
  }

  static saveMemberships(memberships: Membership[]): void {
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
  }

  static addMembership(membership: Membership): Membership[] {
    const all = this.getMemberships();
    const updated = [...all, membership];
    this.saveMemberships(updated);
    return updated;
  }

  static updateMembership(membership: Membership): Membership[] {
    const all = this.getMemberships();
    const updated = all.map((m) => (m.id === membership.id ? membership : m));
    this.saveMemberships(updated);
    return updated;
  }

  static deleteMembership(membershipId: string): Membership[] {
    const all = this.getMemberships();
    const updated = all.filter((m) => m.id !== membershipId);
    this.saveMemberships(updated);
    return updated;
  }

  // --- TASKS (Scoped by Org) ---
  static getTasks(orgId: string): Task[] {
    const key = getOrgKey(orgId, 'tasks');
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = INITIAL_TASKS.filter((t) => t.organizationId === orgId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TASKS.filter((t) => t.organizationId === orgId);
    }
  }

  static saveTasks(orgId: string, tasks: Task[]): void {
    localStorage.setItem(getOrgKey(orgId, 'tasks'), JSON.stringify(tasks));
  }

  static addTask(task: Task): Task[] {
    const tasks = this.getTasks(task.organizationId);
    const updated = [task, ...tasks];
    this.saveTasks(task.organizationId, updated);
    return updated;
  }

  static updateTask(task: Task): Task[] {
    const tasks = this.getTasks(task.organizationId);
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t
    );
    this.saveTasks(task.organizationId, updated);
    return updated;
  }

  static archiveTask(orgId: string, taskId: string, isArchived: boolean): Task[] {
    const tasks = this.getTasks(orgId);
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, isArchived, updatedAt: new Date().toISOString() } : t
    );
    this.saveTasks(orgId, updated);
    return updated;
  }

  static deleteTask(orgId: string, taskId: string): Task[] {
    const tasks = this.getTasks(orgId);
    const updated = tasks.filter((t) => t.id !== taskId);
    this.saveTasks(orgId, updated);
    return updated;
  }

  // --- EVENTS (Scoped by Org) ---
  static getEvents(orgId: string): ChurchEvent[] {
    const key = getOrgKey(orgId, 'events');
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = INITIAL_EVENTS.filter((e) => e.organizationId === orgId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_EVENTS.filter((e) => e.organizationId === orgId);
    }
  }

  static saveEvents(orgId: string, events: ChurchEvent[]): void {
    localStorage.setItem(getOrgKey(orgId, 'events'), JSON.stringify(events));
  }

  static addEvent(event: ChurchEvent): ChurchEvent[] {
    const events = this.getEvents(event.organizationId);
    const updated = [event, ...events];
    this.saveEvents(event.organizationId, updated);
    return updated;
  }

  static updateEvent(event: ChurchEvent): ChurchEvent[] {
    const events = this.getEvents(event.organizationId);
    const updated = events.map((e) => (e.id === event.id ? event : e));
    this.saveEvents(event.organizationId, updated);
    return updated;
  }

  static archiveEvent(orgId: string, eventId: string, isArchived: boolean): ChurchEvent[] {
    const events = this.getEvents(orgId);
    const updated = events.map((e) =>
      e.id === eventId ? { ...e, isArchived, updatedAt: new Date().toISOString() } : e
    );
    this.saveEvents(orgId, updated);
    return updated;
  }

  static deleteEvent(orgId: string, eventId: string): ChurchEvent[] {
    const events = this.getEvents(orgId);
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(orgId, updated);
    return updated;
  }

  // --- COMMENTS (Scoped by Org) ---
  static getComments(orgId: string): Comment[] {
    const key = getOrgKey(orgId, 'comments');
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = INITIAL_COMMENTS.filter((c) => c.organizationId === orgId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COMMENTS.filter((c) => c.organizationId === orgId);
    }
  }

  static saveComments(orgId: string, comments: Comment[]): void {
    localStorage.setItem(getOrgKey(orgId, 'comments'), JSON.stringify(comments));
  }

  static addComment(comment: Comment): Comment[] {
    const comments = this.getComments(comment.organizationId);
    const updated = [...comments, comment];
    this.saveComments(comment.organizationId, updated);

    // Update task commentsCount
    const tasks = this.getTasks(comment.organizationId);
    const task = tasks.find((t) => t.id === comment.taskId);
    if (task) {
      this.updateTask({
        ...task,
        commentsCount: (task.commentsCount || 0) + 1,
      });
    }

    return updated;
  }

  // --- ACTIVITIES (Scoped by Org) ---
  static getActivities(orgId: string): ActivityLog[] {
    const key = getOrgKey(orgId, 'activities');
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = INITIAL_ACTIVITIES.filter((a) => a.organizationId === orgId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ACTIVITIES.filter((a) => a.organizationId === orgId);
    }
  }

  static addActivity(activity: ActivityLog): ActivityLog[] {
    const activities = this.getActivities(activity.organizationId);
    const updated = [activity, ...activities].slice(0, 100);
    localStorage.setItem(getOrgKey(activity.organizationId, 'activities'), JSON.stringify(updated));
    return updated;
  }

  // --- RESET ALL TENANTS ---
  static resetData(): void {
    localStorage.clear();
    localStorage.setItem(ORGS_KEY, JSON.stringify(INITIAL_ORGANIZATIONS));
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(INITIAL_MEMBERSHIPS));
    INITIAL_ORGANIZATIONS.forEach((org) => {
      localStorage.setItem(getOrgKey(org.id, 'campuses'), JSON.stringify(INITIAL_CAMPUSES.filter((c) => c.organizationId === org.id)));
      localStorage.setItem(getOrgKey(org.id, 'tasks'), JSON.stringify(INITIAL_TASKS.filter((t) => t.organizationId === org.id)));
      localStorage.setItem(getOrgKey(org.id, 'events'), JSON.stringify(INITIAL_EVENTS.filter((e) => e.organizationId === org.id)));
      localStorage.setItem(getOrgKey(org.id, 'comments'), JSON.stringify(INITIAL_COMMENTS.filter((c) => c.organizationId === org.id)));
      localStorage.setItem(getOrgKey(org.id, 'activities'), JSON.stringify(INITIAL_ACTIVITIES.filter((a) => a.organizationId === org.id)));
    });
  }
}
