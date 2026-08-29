import { ApprovalRecord, ApprovalAction, Task, ActivityLog } from '../types';
import { StorageService } from './storageService';
import { NotificationService } from './notificationService';

const APPROVALS_PREFIX = 'marketing_approvals_';

export class ApprovalService {
  private static getKey(orgId: string): string {
    return `${APPROVALS_PREFIX}${orgId}_v3`;
  }

  public static getApprovals(orgId: string): ApprovalRecord[] {
    const raw = localStorage.getItem(this.getKey(orgId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static getHistoryForTask(orgId: string, taskId: string): ApprovalRecord[] {
    return this.getApprovals(orgId)
      .filter((a) => a.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public static recordAction(
    orgId: string,
    taskId: string,
    action: ApprovalAction,
    requestedBy: string,
    requestedByName: string,
    approverId?: string,
    approverName?: string,
    comment?: string
  ): ApprovalRecord {
    const list = this.getApprovals(orgId);
    const newRecord: ApprovalRecord = {
      id: 'appr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      organizationId: orgId,
      taskId,
      action,
      requestedBy,
      requestedByName,
      approverId,
      approverName,
      comment,
      timestamp: new Date().toISOString(),
    };

    list.push(newRecord);
    localStorage.setItem(this.getKey(orgId), JSON.stringify(list));
    return newRecord;
  }
}
