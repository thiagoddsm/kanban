import { Task, TaskPriority, TaskStatus, DemandType, ChecklistItem, User, ChurchEvent, Campus } from '../types';

export interface ParsedTaskResult {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  demandType: string;
  startDate: string;
  deadline: string;
  effortEstimate?: string;
  campusId?: string;
  campusName?: string;
  eventId?: string;
  eventName?: string;
  assigneeIds: string[];
  checklist: ChecklistItem[];
  tags: string[];
}

export class JsonTaskParser {
  public static parseJsonInput(
    jsonString: string,
    context: {
      organizationId: string;
      users: User[];
      events: ChurchEvent[];
      campuses: Campus[];
      currentUserId: string;
      currentUserName: string;
    }
  ): { success: boolean; tasks?: ParsedTaskResult[]; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      let rawItems: any[] = [];

      if (Array.isArray(parsed)) {
        rawItems = parsed;
      } else if (parsed.tarefas && Array.isArray(parsed.tarefas)) {
        rawItems = parsed.tarefas;
      } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
        rawItems = parsed.tasks;
      } else if (parsed.tarefa) {
        rawItems = [parsed.tarefa];
      } else if (parsed.task) {
        rawItems = [parsed.task];
      } else {
        rawItems = [parsed];
      }

      const results: ParsedTaskResult[] = rawItems.map((item) =>
        this.normalizeRawTask(item, context)
      );

      return { success: true, tasks: results };
    } catch (err: any) {
      return { success: false, error: err?.message || 'JSON inválido. Verifique a sintaxe.' };
    }
  }

  private static normalizeRawTask(
    raw: any,
    context: {
      organizationId: string;
      users: User[];
      events: ChurchEvent[];
      campuses: Campus[];
      currentUserId: string;
      currentUserName: string;
    }
  ): ParsedTaskResult {
    // 1. Título
    const title = raw.titulo || raw.title || raw.name || 'Nova Demanda importada';

    // 2. Descrição
    const description = raw.descricao_orientacoes || raw.descricao || raw.description || '';

    // 3. Status
    const status = this.mapStatus(raw.status || raw.tags_topo?.status_badge);

    // 4. Prioridade
    const priority = this.mapPriority(raw.prioridade || raw.tags_topo?.prioridade_badge || raw.priority);

    // 5. Tipo de Demanda
    const demandType = this.mapDemandType(raw.tipo || raw.tags_topo?.tipo || raw.demandType);

    // 6. Datas
    const today = new Date().toISOString().split('T')[0];
    const startDate = raw.datas?.data_inicio || raw.startDate || raw.data_inicio || today;
    
    let deadline = raw.datas?.prazo_final || raw.deadline || raw.prazo_final || raw.prazo;
    if (!deadline) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      deadline = d.toISOString().split('T')[0];
    }

    // 7. Estimativa
    const effortEstimate = raw.estimativa || raw.effortEstimate || 'Médio';

    // 8. Campus / Unidade
    let campusId: string | undefined = undefined;
    let campusName: string | undefined = undefined;
    const rawCampus = raw.campus_unidade || raw.campus || raw.campusName;
    if (rawCampus && !rawCampus.toLowerCase().includes('todos')) {
      const match = context.campuses.find(
        (c) => c.name.toLowerCase().includes(rawCampus.toLowerCase()) || rawCampus.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        campusId = match.id;
        campusName = match.name;
      }
    }

    // 9. Projeto / Evento
    let eventId: string | undefined = undefined;
    let eventName: string | undefined = undefined;
    const rawEvent = raw.projeto_evento || raw.evento || raw.eventName || raw.event;
    if (rawEvent) {
      const match = context.events.find(
        (e) => e.title.toLowerCase().includes(rawEvent.toLowerCase()) || rawEvent.toLowerCase().includes(e.title.toLowerCase())
      );
      if (match) {
        eventId = match.id;
        eventName = match.title;
      } else {
        eventName = rawEvent;
      }
    }

    // 10. Responsáveis
    const assigneeIds: string[] = [];
    const rawResp = raw.responsaveis || raw.assignees || raw.responsavel || raw.assignee;
    if (Array.isArray(rawResp)) {
      rawResp.forEach((r: any) => {
        const nameToSearch = typeof r === 'string' ? r : r.nome || r.name;
        if (nameToSearch) {
          const match = context.users.find(
            (u) => u.name.toLowerCase().includes(nameToSearch.toLowerCase()) || nameToSearch.toLowerCase().includes(u.name.toLowerCase())
          );
          if (match && !assigneeIds.includes(match.id)) {
            assigneeIds.push(match.id);
          }
        }
      });
    } else if (typeof rawResp === 'string' && rawResp.trim()) {
      const match = context.users.find(
        (u) => u.name.toLowerCase().includes(rawResp.toLowerCase()) || rawResp.toLowerCase().includes(u.name.toLowerCase())
      );
      if (match) assigneeIds.push(match.id);
    }

    // 11. Checklist / Subtarefas
    const checklist: ChecklistItem[] = [];
    const rawChecklist = raw.checklist_subtarefas || raw.checklist || raw.subtarefas || [];
    if (Array.isArray(rawChecklist)) {
      rawChecklist.forEach((sub: any, idx: number) => {
        const subTitle = typeof sub === 'string' ? sub : sub.titulo || sub.title || sub.text;
        if (!subTitle) return;

        let subAssigneeId: string | undefined = undefined;
        const subRespName = sub.responsavel || sub.assignee;
        if (subRespName) {
          const m = context.users.find(
            (u) => u.name.toLowerCase().includes(subRespName.toLowerCase()) || subRespName.toLowerCase().includes(u.name.toLowerCase())
          );
          if (m) subAssigneeId = m.id;
        }

        checklist.push({
          id: sub.id || 'chk_' + Date.now().toString(36) + idx,
          text: subTitle,
          completed: !!(sub.concluida || sub.completed),
          dueDate: sub.prazo || sub.dueDate || undefined,
          assigneeId: subAssigneeId || assigneeIds[0],
        });
      });
    }

    // 12. Tags
    const tags: string[] = [];
    if (Array.isArray(raw.tags)) {
      tags.push(...raw.tags);
    }
    if (raw.tags_topo?.alcance) {
      tags.push(raw.tags_topo.alcance);
    }

    return {
      title,
      description,
      status,
      priority,
      demandType,
      startDate,
      deadline,
      effortEstimate,
      campusId,
      campusName,
      eventId,
      eventName,
      assigneeIds,
      checklist,
      tags,
    };
  }

  private static mapStatus(rawStatus?: string): TaskStatus {
    if (!rawStatus) return 'INBOX';
    const s = rawStatus.toLowerCase();
    if (s.includes('1') || s.includes('inbox') || s.includes('ideia') || s.includes('demanda')) return 'INBOX';
    if (s.includes('2') || s.includes('planeja') || s.includes('plan')) return 'PLANNING';
    if (s.includes('3') || s.includes('andamento') || s.includes('progress') || s.includes('fazendo')) return 'IN_PROGRESS';
    if (s.includes('4') || s.includes('bloque') || s.includes('block') || s.includes('travad')) return 'BLOCKED';
    if (s.includes('5') || s.includes('revis') || s.includes('review') || s.includes('aprov')) return 'REVIEW';
    if (s.includes('6') || s.includes('conclu') || s.includes('done') || s.includes('entreg') || s.includes('finaliz')) return 'DONE';
    return 'INBOX';
  }

  private static mapPriority(rawPriority?: string): TaskPriority {
    if (!rawPriority) return 'MEDIUM';
    const p = rawPriority.toLowerCase();
    if (p.includes('urg') || p.includes('critica') || p.includes('alta+')) return 'URGENT';
    if (p.includes('alt') || p.includes('high')) return 'HIGH';
    if (p.includes('bai') || p.includes('low') || p.includes('leve')) return 'LOW';
    return 'MEDIUM';
  }

  private static mapDemandType(rawType?: string): string {
    if (!rawType) return 'ARTE';
    const t = rawType.toLowerCase();
    if (t.includes('vid') || t.includes('vídeo') || t.includes('reel') || t.includes('vt')) return 'VIDEO';
    if (t.includes('art') || t.includes('design') || t.includes('feed') || t.includes('post') || t.includes('flyer')) return 'ARTE';
    if (t.includes('social') || t.includes('instagram') || t.includes('stories')) return 'SOCIAL_MEDIA';
    if (t.includes('foto') || t.includes('cobertura')) return 'FOTOGRAFIA';
    if (t.includes('texto') || t.includes('roteiro') || t.includes('copy')) return 'TEXTO';
    if (t.includes('impres') || t.includes('banner') || t.includes('adesivo')) return 'IMPRESSAO';
    if (t.includes('site') || t.includes('landing') || t.includes('web')) return 'SITE';
    if (t.includes('apresenta') || t.includes('slide') || t.includes('telao') || t.includes('telão')) return 'APRESENTACAO';
    if (t.includes('logist') || t.includes('operac') || t.includes('espaço')) return 'LOGISTICA';
    return 'ARTE';
  }
}
