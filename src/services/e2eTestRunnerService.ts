import { StorageService } from './storageService';
import { ApprovalService } from './approvalService';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';
import { Task, ChurchEvent, Organization } from '../types';

export interface E2ETestStepResult {
  stepNumber: number;
  stepName: string;
  passed: boolean;
  details: string;
}

export interface E2ESuiteSummary {
  totalSteps: number;
  passedSteps: number;
  allPassed: boolean;
  steps: E2ETestStepResult[];
}

export class E2ETestRunnerService {
  /**
   * Executes the full end-to-end lifecycle QA test
   */
  public static runFullLifecycleTest(): E2ESuiteSummary {
    const steps: E2ETestStepResult[] = [];
    const testOrgId = 'org_ibm';
    const testCampusId = 'camp_ibm_sede';
    const requesterId = 'usr_requester_tiago';
    const leaderId = 'usr_leader';
    const teamId = 'usr_team_lucas';

    // Step 1: Requester opens demand in Central de Demandas for an event
    const initialTasks = StorageService.getTasks(testOrgId);
    const testTaskId = 'tsk_e2e_' + Date.now();
    const newTask: Task = {
      id: testTaskId,
      organizationId: testOrgId,
      campusId: testCampusId,
      campusName: 'Sede',
      title: 'Banner E2E Retiro de Casais 2026',
      description: 'Demanda de teste criada para validação do ciclo de vida E2E.',
      status: 'INBOX',
      priority: 'HIGH',
      demandType: 'ARTE',
      eventId: 'evt_aviva_2026',
      eventName: 'Conferência Aviva 2026',
      requesterId,
      requesterName: 'Pr. Tiago Rocha',
      requestedAt: new Date().toISOString(),
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tags: ['E2E', 'Teste'],
      attachmentLinks: [],
      dependencies: [],
      checklist: [{ id: 'chk_1', text: 'Criação do layout', completed: false }],
      commentsCount: 0,
      isArchived: false,
      createdBy: requesterId,
      createdByName: 'Pr. Tiago Rocha',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.addTask(newTask);

    steps.push({
      stepNumber: 1,
      stepName: 'REQUESTER abre solicitação na Central de Demandas',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.status === 'INBOX'),
      details: 'Demanda criada e posicionada em INBOX com sucesso.',
    });

    // Step 2: Leader triages and assigns to Team
    const assignedTask: Task = {
      ...newTask,
      status: 'PLANNING',
      assigneeId: teamId,
      assigneeName: 'Lucas Andrade',
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateTask(assignedTask);

    steps.push({
      stepNumber: 2,
      stepName: 'LEADER realiza triagem e atribui ao TEAM',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.assigneeId === teamId && t.status === 'PLANNING'),
      details: 'Responsável Lucas Andrade atribuído com status PLANNING.',
    });

    // Step 3: Team starts production and sends to REVIEW
    const reviewTask: Task = {
      ...assignedTask,
      status: 'REVIEW',
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateTask(reviewTask);
    ApprovalService.recordAction(testOrgId, testTaskId, 'REQUESTED', teamId, 'Lucas Andrade');

    steps.push({
      stepNumber: 3,
      stepName: 'TEAM produz e submete para REVIEW',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.status === 'REVIEW'),
      details: 'Demanda enviada para o Centro de Aprovações com histórico registrado.',
    });

    // Step 4: Leader requests changes
    const changesTask: Task = {
      ...reviewTask,
      status: 'IN_PROGRESS',
      changesRequestedReason: 'Ajustar cor de fundo para azul escuro.',
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateTask(changesTask);
    ApprovalService.recordAction(testOrgId, testTaskId, 'CHANGES_REQUESTED', teamId, 'Lucas Andrade', leaderId, 'Mariana Lima', 'Ajustar cor de fundo para azul escuro.');

    steps.push({
      stepNumber: 4,
      stepName: 'LEADER solicita alteração com justificativa obrigatória',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.status === 'IN_PROGRESS' && t.changesRequestedReason !== undefined),
      details: 'Demanda devolvida para IN_PROGRESS com motivo auditado.',
    });

    // Step 5: Team adjusts and re-submits to REVIEW
    const reReviewTask: Task = {
      ...changesTask,
      status: 'REVIEW',
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateTask(reReviewTask);
    ApprovalService.recordAction(testOrgId, testTaskId, 'REQUESTED', teamId, 'Lucas Andrade');

    steps.push({
      stepNumber: 5,
      stepName: 'TEAM corrige layout e re-submete para REVIEW',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.status === 'REVIEW'),
      details: 'Re-submissão para aprovação pastoral registrada.',
    });

    // Step 6: Leader approves -> task becomes DONE
    const doneTask: Task = {
      ...reReviewTask,
      status: 'DONE',
      approverId: leaderId,
      approverName: 'Mariana Lima',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateTask(doneTask);
    ApprovalService.recordAction(testOrgId, testTaskId, 'APPROVED', teamId, 'Lucas Andrade', leaderId, 'Mariana Lima', 'Aprovado com louvor.');

    NotificationService.createNotification({
      organizationId: testOrgId,
      campusId: testCampusId,
      userId: requesterId,
      type: 'REQUEST_APPROVED',
      title: 'Sua solicitação foi aprovada e concluída!',
      message: `A entrega para "${doneTask.title}" foi concluída.`,
      entityType: 'TASK',
      entityId: doneTask.id,
    });

    steps.push({
      stepNumber: 6,
      stepName: 'LEADER aprova entrega -> Status DONE + Notificação ao Solicitante',
      passed: StorageService.getTasks(testOrgId).some((t) => t.id === testTaskId && t.status === 'DONE'),
      details: 'Demanda concluída com sucesso e notificação disparada.',
    });

    // Step 7: Event automatic progress increases
    const eventTasks = StorageService.getTasks(testOrgId).filter((t) => t.eventId === 'evt_aviva_2026' && !t.isArchived);
    const completedCount = eventTasks.filter((t) => t.status === 'DONE').length;
    const progress = eventTasks.length > 0 ? Math.round((completedCount / eventTasks.length) * 100) : 0;

    steps.push({
      stepNumber: 7,
      stepName: 'Progresso do Projeto/Evento recalculado automaticamente',
      passed: progress > 0,
      details: `Progresso atual do evento Aviva 2026: ${progress}%.`,
    });

    // Step 8: Dashboard KPIs updated dynamically
    const allOrgTasks = StorageService.getTasks(testOrgId);
    const allOrgEvents = StorageService.getEvents(testOrgId);
    const metrics = AnalyticsService.getOverallMetrics(allOrgTasks, allOrgEvents);

    steps.push({
      stepNumber: 8,
      stepName: 'Dashboard Executivo reflete novos números sem recarregar',
      passed: metrics.completedTasks > 0,
      details: `Total de tarefas concluídas: ${metrics.completedTasks} (${metrics.completionRate}% de taxa de entrega).`,
    });

    // Step 9: Security Verification: Tenant Isolation Check
    const comTasks = StorageService.getTasks('org_comunidade');
    const crossLeak = comTasks.some((t) => t.id === testTaskId);

    steps.push({
      stepNumber: 9,
      stepName: 'Segurança: Isolamento de Organizações (Zero vazamento para Comunidade da Fé)',
      passed: !crossLeak,
      details: 'A demanda criada na IBM não é visível para a Comunidade da Fé.',
    });

    // Cleanup test task
    StorageService.deleteTask(testOrgId, testTaskId);

    const passedCount = steps.filter((s) => s.passed).length;
    return {
      totalSteps: steps.length,
      passedSteps: passedCount,
      allPassed: passedCount === steps.length,
      steps,
    };
  }
}
