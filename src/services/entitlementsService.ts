import { Organization, TenantPlan, PlanLimits } from '../types';

export interface EntitlementCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  remaining: number;
  message?: string;
  upgradeRequired?: boolean;
}

export const PLAN_DEFAULT_LIMITS: Record<TenantPlan, PlanLimits> = {
  FREE: {
    maxMembers: 15,
    maxCampuses: 1,
    maxEvents: 10,
    maxTasks: 100,
    storageGB: 5,
    customBranding: false,
    advancedReports: false,
    gantt: false,
    apiAccess: false,
  },
  STARTER: {
    maxMembers: 30,
    maxCampuses: 3,
    maxEvents: 30,
    maxTasks: 300,
    storageGB: 15,
    customBranding: true,
    advancedReports: false,
    gantt: true,
    apiAccess: false,
  },
  PRO: {
    maxMembers: 100,
    maxCampuses: 10,
    maxEvents: 150,
    maxTasks: 1500,
    storageGB: 50,
    customBranding: true,
    advancedReports: true,
    gantt: true,
    apiAccess: true,
  },
  ENTERPRISE: {
    maxMembers: 1000,
    maxCampuses: 50,
    maxEvents: 1000,
    maxTasks: 10000,
    storageGB: 500,
    customBranding: true,
    advancedReports: true,
    gantt: true,
    apiAccess: true,
  },
};

export class EntitlementsService {
  /**
   * Retorna os limites efetivos da organização (mescla limites do plano com overrides do documento da org)
   */
  public static getEffectiveLimits(org: Organization): PlanLimits {
    const plan = org.subscription?.plan || 'PRO';
    const defaults = PLAN_DEFAULT_LIMITS[plan] || PLAN_DEFAULT_LIMITS.PRO;
    return {
      ...defaults,
      ...(org.limits || {}),
    };
  }

  /**
   * Valida se a organização pode cadastrar um novo campus
   */
  public static checkCampusLimit(org: Organization, currentCampusesCount: number): EntitlementCheckResult {
    const limits = this.getEffectiveLimits(org);
    const max = limits.maxCampuses;
    const allowed = currentCampusesCount < max;
    const remaining = Math.max(0, max - currentCampusesCount);

    return {
      allowed,
      current: currentCampusesCount,
      max,
      remaining,
      message: allowed
        ? undefined
        : `Limite de Campi atingido! O plano ${org.subscription.plan} permite no máximo ${max} campi. Faça upgrade para cadastrar novas filiais.`,
      upgradeRequired: !allowed,
    };
  }

  /**
   * Valida se a organização pode adicionar um novo membro / usuário
   */
  public static checkMemberLimit(org: Organization, currentMembersCount: number): EntitlementCheckResult {
    const limits = this.getEffectiveLimits(org);
    const max = limits.maxMembers;
    const allowed = currentMembersCount < max;
    const remaining = Math.max(0, max - currentMembersCount);

    return {
      allowed,
      current: currentMembersCount,
      max,
      remaining,
      message: allowed
        ? undefined
        : `Limite de Membros atingido! O plano ${org.subscription.plan} permite no máximo ${max} usuários na equipe. Faça upgrade para adicionar mais colaboradores.`,
      upgradeRequired: !allowed,
    };
  }

  /**
   * Valida se a organização pode criar um novo evento / projeto
   */
  public static checkEventLimit(org: Organization, currentEventsCount: number): EntitlementCheckResult {
    const limits = this.getEffectiveLimits(org);
    const max = limits.maxEvents;
    const allowed = currentEventsCount < max;
    const remaining = Math.max(0, max - currentEventsCount);

    return {
      allowed,
      current: currentEventsCount,
      max,
      remaining,
      message: allowed
        ? undefined
        : `Limite de Eventos atingido! O plano ${org.subscription.plan} permite no máximo ${max} eventos ativos simultaneamente. Conclua ou arquive eventos anteriores ou faça upgrade de plano.`,
      upgradeRequired: !allowed,
    };
  }

  /**
   * Valida se a organização pode criar uma nova tarefa
   */
  public static checkTaskLimit(org: Organization, currentTasksCount: number): EntitlementCheckResult {
    const limits = this.getEffectiveLimits(org);
    const max = limits.maxTasks;
    const allowed = currentTasksCount < max;
    const remaining = Math.max(0, max - currentTasksCount);

    return {
      allowed,
      current: currentTasksCount,
      max,
      remaining,
      message: allowed
        ? undefined
        : `Limite de Tarefas atingido! O plano ${org.subscription.plan} permite no máximo ${max} tarefas ativas. Arquive tarefas concluídas ou faça upgrade do plano.`,
      upgradeRequired: !allowed,
    };
  }

  // Feature Flags
  public static canAccessGantt(org: Organization): boolean {
    return this.getEffectiveLimits(org).gantt;
  }

  public static canAccessAdvancedReports(org: Organization): boolean {
    return this.getEffectiveLimits(org).advancedReports;
  }

  public static canCustomBrand(org: Organization): boolean {
    return this.getEffectiveLimits(org).customBranding;
  }

  public static canAccessIntegrations(org: Organization): boolean {
    return this.getEffectiveLimits(org).apiAccess;
  }

  public static canAccessAutomations(org: Organization): boolean {
    return org.subscription.plan === 'PRO' || org.subscription.plan === 'ENTERPRISE';
  }
}
