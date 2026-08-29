import { StorageService } from './storageService';
import { ApprovalService } from './approvalService';
import { NotificationService } from './notificationService';
import { Organization } from '../types';

export class BackupExportService {
  /**
   * Generates a complete data dump of the organization for backup and LGPD compliance
   */
  public static exportOrganizationData(org: Organization): void {
    const orgId = org.id;

    const dataPackage = {
      exportedAt: new Date().toISOString(),
      platform: 'Oiko Marketing',
      version: '3.0.0',
      organization: org,
      campuses: StorageService.getCampuses(orgId),
      memberships: StorageService.getMemberships().filter((m) => m.organizationId === orgId),
      tasks: StorageService.getTasks(orgId),
      events: StorageService.getEvents(orgId),
      comments: StorageService.getComments(orgId),
      activities: StorageService.getActivities(orgId),
      approvals: ApprovalService.getApprovals(orgId),
    };

    const jsonString = JSON.stringify(dataPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${org.slug}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
