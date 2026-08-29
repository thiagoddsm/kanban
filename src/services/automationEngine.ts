import { Task, ChurchEvent, AutomationRule, AutomationTrigger, User, ActivityLog } from '../types';
import { NotificationService } from './notificationService';
import { StorageService } from './storageService';

const AUTOMATION_RULES_KEY = 'marketing_automation_rules_';

export const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule_assigned',
    organizationId: 'org_ibm',
    name: 'Notificar responsável ao atribuir demanda',
    active: true,
    trigger: 'TASK_ASSIGNED',
    actions: [{ type: 'NOTIFY_USER', templateMessage: 'Você foi atribuído como responsável pela demanda.' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule_blocked',
    organizationId: 'org_ibm',
    name: 'Alertar líder quando tarefa for bloqueada',
    active: true,
    trigger: 'TASK_BLOCKED',
    actions: [{ type: 'NOTIFY_LEADER', templateMessage: 'A demanda foi bloqueada por impedimento operacional.' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule_review',
    organizationId: 'org_ibm',
    name: 'Notificar aprovador quando demanda entrar em revisão',
    active: true,
    trigger: 'TASK_REVIEW',
    actions: [{ type: 'NOTIFY_APPROVER', templateMessage: 'Uma nova entrega aguarda sua revisão e aprovação.' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule_event_30d',
    organizationId: 'org_ibm',
    name: 'Alertar liderança 30 dias antes do evento se houver pendências',
    active: true,
    trigger: 'EVENT_APPROACHING',
    actions: [{ type: 'NOTIFY_LEADER', templateMessage: 'O evento acontecerá em breve com entregas ainda abertas.' }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export class AutomationEngine {
  public static getRules(orgId: string): AutomationRule[] {
    const raw = localStorage.getItem(`${AUTOMATION_RULES_KEY}${orgId}_v3`);
    if (!raw) {
      const initial = INITIAL_AUTOMATION_RULES.map((r) => ({ ...r, organizationId: orgId }));
      localStorage.setItem(`${AUTOMATION_RULES_KEY}${orgId}_v3`, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static toggleRule(orgId: string, ruleId: string, active: boolean): AutomationRule[] {
    const rules = this.getRules(orgId).map((r) => (r.id === ruleId ? { ...r, active, updatedAt: new Date().toISOString() } : r));
    localStorage.setItem(`${AUTOMATION_RULES_KEY}${orgId}_v3`, JSON.stringify(rules));
    return rules;
  }

  /**
   * Dispatches trigger events to execute active automations
   */
  public static handleTrigger(
    orgId: string,
    trigger: AutomationTrigger,
    context: {
      task?: Task;
      event?: ChurchEvent;
      leaderIds?: string[];
      actorName?: string;
      reason?: string;
    }
  ) {
    const rules = this.getRules(orgId).filter((r) => r.active && r.trigger === trigger);
    if (rules.length === 0) return;

    if (trigger === 'TASK_ASSIGNED' && context.task?.assigneeId) {
      NotificationService.createNotification({
        organizationId: orgId,
        campusId: context.task.campusId,
        userId: context.task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Nova Demanda Atribuída',
        message: `Você foi designado como responsável por "${context.task.title}". Prazo: ${new Date(context.task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}.`,
        entityType: 'TASK',
        entityId: context.task.id,
      });
    }

    if (trigger === 'TASK_BLOCKED' && context.task) {
      if (context.leaderIds) {
        context.leaderIds.forEach((leaderId) => {
          NotificationService.createNotification({
            organizationId: orgId,
            campusId: context.task!.campusId,
            userId: leaderId,
            type: 'TASK_BLOCKED',
            title: 'Alerta de Gargalo: Demanda Bloqueada',
            message: `A demanda "${context.task!.title}" foi bloqueada: "${context.reason || context.task!.blockedReason || 'Aguardando terceiros'}".`,
            entityType: 'TASK',
            entityId: context.task!.id,
          });
        });
      }
    }

    if (trigger === 'TASK_REVIEW' && context.task) {
      if (context.leaderIds) {
        context.leaderIds.forEach((leaderId) => {
          NotificationService.createNotification({
            organizationId: orgId,
            campusId: context.task!.campusId,
            userId: leaderId,
            type: 'TASK_REVIEW',
            title: 'Aprovação Necessária',
            message: `A demanda "${context.task!.title}" foi finalizada e aguarda sua revisão para publicação.`,
            entityType: 'TASK',
            entityId: context.task!.id,
          });
        });
      }
    }
  }
}
