import { Notification, UserNotificationPreferences } from '../types';

const NOTIFICATIONS_PREFIX = 'marketing_notifications_';
const PREFS_PREFIX = 'marketing_user_prefs_';

export const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  inApp: true,
  email: false,
  whatsapp: false,
  taskAssigned: true,
  taskOverdue: true,
  approvalRequested: true,
  dependencyBlocked: true,
  eventApproaching: true,
  dailyDigest: true,
};

const INITIAL_NOTIFICATIONS: Notification[] = [];

export class NotificationService {
  private static getKey(orgId: string): string {
    return `${NOTIFICATIONS_PREFIX}${orgId}_v4_clean`;
  }

  public static getNotifications(orgId: string, userId: string): Notification[] {
    const raw = localStorage.getItem(this.getKey(orgId));
    let list: Notification[] = [];
    if (!raw) {
      list = INITIAL_NOTIFICATIONS.filter((n) => n.organizationId === orgId);
      localStorage.setItem(this.getKey(orgId), JSON.stringify(list));
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }
    // Strict isolation: only return notifications belonging to this user
    return list
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Notification {
    const orgId = notification.organizationId;
    const raw = localStorage.getItem(this.getKey(orgId));
    let list: Notification[] = raw ? JSON.parse(raw) : [];

    const newNotif: Notification = {
      ...notification,
      id: 'notif_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      readAt: null,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newNotif);
    localStorage.setItem(this.getKey(orgId), JSON.stringify(list));
    return newNotif;
  }

  public static markAsRead(orgId: string, notificationId: string): void {
    const raw = localStorage.getItem(this.getKey(orgId));
    if (!raw) return;
    let list: Notification[] = JSON.parse(raw);
    list = list.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n));
    localStorage.setItem(this.getKey(orgId), JSON.stringify(list));
  }

  public static markAllAsRead(orgId: string, userId: string): void {
    const raw = localStorage.getItem(this.getKey(orgId));
    if (!raw) return;
    let list: Notification[] = JSON.parse(raw);
    list = list.map((n) => (n.userId === userId ? { ...n, readAt: new Date().toISOString() } : n));
    localStorage.setItem(this.getKey(orgId), JSON.stringify(list));
  }

  public static getUnreadCount(orgId: string, userId: string): number {
    return this.getNotifications(orgId, userId).filter((n) => !n.readAt).length;
  }

  public static getPreferences(userId: string): UserNotificationPreferences {
    const raw = localStorage.getItem(`${PREFS_PREFIX}${userId}`);
    if (!raw) return DEFAULT_PREFERENCES;
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  public static savePreferences(userId: string, prefs: UserNotificationPreferences): void {
    localStorage.setItem(`${PREFS_PREFIX}${userId}`, JSON.stringify(prefs));
  }
}
