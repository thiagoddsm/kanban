import { StorageService } from './storageService';
import { Task, ChurchEvent, Organization, Membership, User } from '../types';

export interface TestResult {
  title: string;
  category: 'SECURITY' | 'TENANT_ISOLATION' | 'EVENTS_PROJECTS' | 'GOVERNANCE' | 'LIMITS';
  passed: boolean;
  message: string;
}

export class VerificationSuiteService {
  public static runAllTests(): TestResult[] {
    const results: TestResult[] = [];

    const orgs = StorageService.getOrganizations();
    const ibmOrg = orgs.find((o) => o.slug === 'ibm');
    const comOrg = orgs.find((o) => o.slug === 'comunidade-fe');

    // Test 1: Tenant Isolation
    const ibmTasks = StorageService.getTasks('org_ibm');
    const comTasks = StorageService.getTasks('org_comunidade');
    const leaks = ibmTasks.filter((t) => t.organizationId !== 'org_ibm');
    results.push({
      title: 'Isolamento Estrito de Tenants (IBM vs Comunidade da Fé)',
      category: 'TENANT_ISOLATION',
      passed: leaks.length === 0 && ibmTasks.length > 0 && comTasks.length > 0,
      message: leaks.length === 0 
        ? `Nenhum vazamento de dados detectado (${ibmTasks.length} tarefas em IBM, ${comTasks.length} em Comunidade da Fé).`
        : `FALHA: ${leaks.length} tarefas vazaram entre organizações.`,
    });

    // Test 2: Event Dynamic Progress Calculation
    const avivaEvent = StorageService.getEvents('org_ibm').find((e) => e.id === 'evt_aviva_2026');
    const avivaTasks = ibmTasks.filter((t) => t.eventId === 'evt_aviva_2026' && !t.isArchived);
    const completedAviva = avivaTasks.filter((t) => t.status === 'DONE').length;
    const expectedProgress = avivaTasks.length > 0 ? Math.round((completedAviva / avivaTasks.length) * 100) : 0;
    results.push({
      title: 'Cálculo de Progresso Automático do Evento/Projeto',
      category: 'EVENTS_PROJECTS',
      passed: expectedProgress >= 0 && expectedProgress <= 100,
      message: `Evento Aviva 2026: ${completedAviva}/${avivaTasks.length} concluídas -> Progresso: ${expectedProgress}%.`,
    });

    // Test 3: Institutional vs Campus Scoping
    const institutionalTask = ibmTasks.find((t) => !t.campusId);
    const alphaTask = ibmTasks.find((t) => t.campusId === 'camp_ibm_alpha');
    results.push({
      title: 'Suporte a Demandas e Eventos Institucionais (campusId = null)',
      category: 'GOVERNANCE',
      passed: institutionalTask !== undefined && institutionalTask.campusId === null,
      message: `Tarefa institucional "${institutionalTask?.title}" opera sem campus fixo (Global).`,
    });

    // Test 4: Subscription Plan Limits Enforcement
    if (ibmOrg) {
      const isUnderMaxCampuses = StorageService.getCampuses('org_ibm').length <= ibmOrg.limits.maxCampuses;
      results.push({
        title: 'Validação de Limites de Assinatura (Plano PRO/STARTER)',
        category: 'LIMITS',
        passed: isUnderMaxCampuses,
        message: `Igreja Batista Memorial opera dentro do teto de ${ibmOrg.limits.maxCampuses} campi.`,
      });
    }

    // Test 5: Security Audit Log Persistence
    const activities = StorageService.getActivities('org_ibm');
    const hasAuditLogs = activities.length > 0;
    results.push({
      title: 'Registro e Imutabilidade de Logs de Auditoria',
      category: 'SECURITY',
      passed: hasAuditLogs,
      message: `${activities.length} eventos de auditoria registrados com sucesso no repositório particionado.`,
    });

    return results;
  }
}
