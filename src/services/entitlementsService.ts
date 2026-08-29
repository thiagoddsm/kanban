import { Organization, TenantPlan } from '../types';

export class EntitlementsService {
  public static canCreateCampus(org: Organization, currentCampusesCount: number): boolean {
    return currentCampusesCount < org.limits.maxCampuses;
  }

  public static canAddMember(org: Organization, currentMembersCount: number): boolean {
    return currentMembersCount < org.limits.maxMembers;
  }

  public static canCreateEvent(org: Organization, currentEventsCount: number): boolean {
    return currentEventsCount < org.limits.maxEvents;
  }

  public static canAccessGantt(org: Organization): boolean {
    return org.limits.gantt;
  }

  public static canAccessAdvancedReports(org: Organization): boolean {
    return org.limits.advancedReports;
  }

  public static canCustomBrand(org: Organization): boolean {
    return org.limits.customBranding;
  }

  public static canAccessIntegrations(org: Organization): boolean {
    return org.subscription.plan === 'PRO' || org.subscription.plan === 'ENTERPRISE';
  }

  public static canAccessAutomations(org: Organization): boolean {
    return org.subscription.plan === 'PRO' || org.subscription.plan === 'ENTERPRISE';
  }
}
