import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  Task, 
  ChurchEvent, 
  User, 
  Comment, 
  ActivityLog, 
  TaskStatus, 
  TaskPriority, 
  DemandType, 
  ColumnDefinition,
  EventProjectStats,
  Campus,
  EventTemplate,
  DemandTypeDefinition,
  EventCategoryDefinition,
  DepartmentDefinition
} from '../types';
import { StorageService } from '../services/storageService';
import { EVENT_TEMPLATES, DEMAND_TYPES, DEFAULT_EVENT_CATEGORIES, DEFAULT_DEPARTMENTS } from '../services/mockData';
import { AutomationEngine } from '../services/automationEngine';
import { NotificationService } from '../services/notificationService';
import { ApprovalService } from '../services/approvalService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { useAccess } from './AccessContext';
import { useNotification } from './NotificationContext';

export const KANBAN_COLUMNS: ColumnDefinition[] = [
  {
    id: 'INBOX',
    title: 'Demandas e Ideias',
    description: 'Novas solicitações e ideias iniciais',
    color: 'border-slate-500/40 text-slate-300',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    borderHover: 'hover:border-slate-400',
  },
  {
    id: 'PLANNING',
    title: 'Planejamento',
    description: 'Triagem, briefing, responsável e prazos',
    color: 'border-blue-500/40 text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
    borderHover: 'hover:border-blue-400',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Em Andamento',
    description: 'Design, captação e produção ativa',
    color: 'border-amber-500/40 text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    borderHover: 'hover:border-amber-400',
  },
  {
    id: 'BLOCKED',
    title: 'Bloqueado',
    description: 'Aguardando dependências, aprovação ou terceiros',
    color: 'border-rose-500/40 text-rose-400',
    badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    borderHover: 'hover:border-rose-400',
  },
  {
    id: 'REVIEW',
    title: 'Revisão e Aprovação',
    description: 'Controle de qualidade e validação pastoral/líder',
    color: 'border-purple-500/40 text-purple-400',
    badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
    borderHover: 'hover:border-purple-400',
  },
  {
    id: 'DONE',
    title: 'Concluído',
    description: 'Publicado, entregue ou pronto para culto',
    color: 'border-emerald-500/40 text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    borderHover: 'hover:border-emerald-400',
  },
];

interface DependencyCheckResult {
  hasPending: boolean;
  pendingTasks: Task[];
}

interface DataContextType {
  // Scoped Data
  tasks: Task[];
  events: ChurchEvent[];
  users: User[];
  comments: Comment[];
  activities: ActivityLog[];
  columns: ColumnDefinition[];
  templates: EventTemplate[];

  // Dynamic Lists & Settings
  demandTypes: DemandTypeDefinition[];
  eventCategories: EventCategoryDefinition[];
  departments: DepartmentDefinition[];
  addDemandType: (type: DemandTypeDefinition) => void;
  updateDemandType: (type: DemandTypeDefinition) => void;
  deleteDemandType: (typeName: string) => void;
  resetDemandTypesToDefault: () => void;
  addEventCategory: (category: EventCategoryDefinition) => void;
  updateEventCategory: (category: EventCategoryDefinition) => void;
  deleteEventCategory: (categoryId: string) => void;
  addDepartment: (dept: DepartmentDefinition) => void;
  updateDepartment: (dept: DepartmentDefinition) => void;
  deleteDepartment: (deptId: string) => void;

  // Filters
  filterOnlyMyTasks: boolean;
  setFilterOnlyMyTasks: (val: boolean) => void;
  filterEventId: string;
  setFilterEventId: (val: string) => void;
  filterAssigneeId: string;
  setFilterAssigneeId: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  filterDemandType: string;
  setFilterDemandType: (val: string) => void;
  filterCampusId: string;
  setFilterCampusId: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  clearFilters: () => void;
  filteredTasks: Task[];

  // Actions
  createTask: (taskData: Partial<Task> & { title: string; demandType: DemandType }) => Task;
  updateTask: (task: Task) => void;
  moveTask: (taskId: string, newStatus: TaskStatus, force?: boolean) => { success: boolean; blockedBy?: Task[] };
  archiveTask: (taskId: string, isArchived: boolean) => void;
  deleteTask: (taskId: string) => void;
  checkDependencies: (task: Task) => DependencyCheckResult;
  remindPredecessors: (taskId: string) => { whatsappUrl?: string; message: string };

  // Block / Unblock / Approve
  blockTaskWithReason: (taskId: string, reason: string, actionRequiredBy: string) => void;
  unblockTask: (taskId: string) => void;
  approveTask: (taskId: string) => void;

  // Events as Projects
  createEvent: (eventData: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => ChurchEvent | null;
  createEventFromTemplate: (templateId: string, eventTitle: string, eventStartDate: string, eventEndDate?: string, campusId?: string | null, location?: string) => ChurchEvent | null;
  updateEvent: (event: ChurchEvent) => boolean;
  archiveEvent: (eventId: string, isArchived: boolean) => void;
  deleteEvent: (eventId: string) => void;
  getEventStats: (eventId: string) => EventProjectStats;

  // Comments
  addComment: (taskId: string, content: string, mentionedUserIds?: string[]) => void;
  getCommentsForTask: (taskId: string) => Comment[];

  // Reset
  resetAllData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { currentOrganization, currentCampus, campuses } = useTenant();
  const { memberships } = useAccess();
  const { success, warning, error: notifyError, info } = useNotification();

  const [rawTasks, setRawTasks] = useState<Task[]>(() => StorageService.getTasks(currentOrganization.id));
  const [rawEvents, setRawEvents] = useState<ChurchEvent[]>(() => StorageService.getEvents(currentOrganization.id));
  const [comments, setComments] = useState<Comment[]>(() => StorageService.getComments(currentOrganization.id));
  const [activities, setActivities] = useState<ActivityLog[]>(() => StorageService.getActivities(currentOrganization.id));
  const [demandTypes, setDemandTypes] = useState<DemandTypeDefinition[]>(() => StorageService.getDemandTypes(currentOrganization.id));
  const [eventCategories, setEventCategories] = useState<EventCategoryDefinition[]>(() => StorageService.getEventCategories(currentOrganization.id));
  const [departments, setDepartments] = useState<DepartmentDefinition[]>(() => StorageService.getDepartments(currentOrganization.id));

  // Reload data whenever current organization changes
  useEffect(() => {
    setRawTasks(StorageService.getTasks(currentOrganization.id));
    setRawEvents(StorageService.getEvents(currentOrganization.id));
    setComments(StorageService.getComments(currentOrganization.id));
    setActivities(StorageService.getActivities(currentOrganization.id));
    setDemandTypes(StorageService.getDemandTypes(currentOrganization.id));
    setEventCategories(StorageService.getEventCategories(currentOrganization.id));
    setDepartments(StorageService.getDepartments(currentOrganization.id));
  }, [currentOrganization.id]);

  // UNIFIED SCOPE ENGINE: Scoped Tasks
  const scopedTasks = useMemo(() => {
    return rawTasks.filter((t) => {
      if (currentCampus && t.campusId && t.campusId !== currentCampus.id) {
        return false;
      }
      return true;
    });
  }, [rawTasks, currentCampus]);

  // UNIFIED SCOPE ENGINE: Scoped Events
  const scopedEvents = useMemo(() => {
    return rawEvents.filter((e) => {
      if (currentCampus && e.campusId && e.campusId !== currentCampus.id) {
        return false;
      }
      return true;
    });
  }, [rawEvents, currentCampus]);

  // Organization Users
  const orgUsers = useMemo(() => {
    const allUsers = StorageService.getUsers();
    const orgMemberships = memberships.filter((m) => m.organizationId === currentOrganization.id && m.status === 'ACTIVE');
    const userIds = orgMemberships.map((m) => m.userId);
    return allUsers.filter((u) => userIds.includes(u.id));
  }, [memberships, currentOrganization.id]);

  const leaderUserIds = useMemo(() => {
    const orgMemberships = memberships.filter(
      (m) => m.organizationId === currentOrganization.id && (m.role === 'ADMIN' || m.role === 'LEADER') && m.status === 'ACTIVE'
    );
    return orgMemberships.map((m) => m.userId);
  }, [memberships, currentOrganization.id]);

  // Filters
  const [filterOnlyMyTasks, setFilterOnlyMyTasks] = useState(false);
  const [filterEventId, setFilterEventId] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDemandType, setFilterDemandType] = useState('');
  const [filterCampusId, setFilterCampusId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const clearFilters = () => {
    setFilterOnlyMyTasks(false);
    setFilterEventId('');
    setFilterAssigneeId('');
    setFilterPriority('');
    setFilterDemandType('');
    setFilterCampusId('');
    setSearchQuery('');
  };

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (t.isArchived) return false;
      if (filterCampusId && t.campusId !== filterCampusId) return false;
      if (filterOnlyMyTasks) {
        const isMine = (t.assigneeIds && t.assigneeIds.includes(currentUser.id)) || t.assigneeId === currentUser.id || t.requesterId === currentUser.id;
        if (!isMine) return false;
      }
      if (filterEventId && t.eventId !== filterEventId) return false;
      if (filterAssigneeId) {
        const matches = (t.assigneeIds && t.assigneeIds.includes(filterAssigneeId)) || t.assigneeId === filterAssigneeId;
        if (!matches) return false;
      }
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterDemandType && t.demandType !== filterDemandType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesTag = t.tags?.some((tag) => tag.toLowerCase().includes(query));
        const matchesAssignee = t.assigneeName?.toLowerCase().includes(query) || t.assignees?.some((a) => a.name.toLowerCase().includes(query));
        const matchesRequester = t.requesterName?.toLowerCase().includes(query);
        const matchesCampus = t.campusName?.toLowerCase().includes(query);
        const matchesEvent = t.eventName?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesAssignee && !matchesRequester && !matchesCampus && !matchesEvent) return false;
      }
      return true;
    });
  }, [
    scopedTasks,
    filterCampusId,
    filterOnlyMyTasks,
    filterEventId,
    filterAssigneeId,
    filterPriority,
    filterDemandType,
    searchQuery,
    currentUser.id,
  ]);

  // Dependency Checking
  const checkDependencies = (task: Task): DependencyCheckResult => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return { hasPending: false, pendingTasks: [] };
    }
    const pending = rawTasks.filter(
      (t) => task.dependencies.includes(t.id) && t.status !== 'DONE'
    );
    return {
      hasPending: pending.length > 0,
      pendingTasks: pending,
    };
  };

  const remindPredecessors = (taskId: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return { message: '' };

    const { pendingTasks } = checkDependencies(task);
    const msg = `Olá! A demanda "${task.title}" (${currentOrganization.name}) aguarda a conclusão de: ${pendingTasks.map((p) => `"${p.title}"`).join(', ')}.`;

    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

    pendingTasks.forEach((p) => {
      info(
        `Cobrança registrada para ${p.assigneeName || 'Responsável'}`,
        `Aguardando: "${p.title}" para liberar "${task.title}".`
      );

      const newActivity: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        campusId: task.campusId,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `cobrou a conclusão da dependência "${p.title}"`,
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      };
      setActivities(StorageService.addActivity(newActivity));
    });

    return { whatsappUrl, message: msg };
  };

  // Task Actions
  const createTask = (taskData: Partial<Task> & { title: string; demandType: DemandType }): Task => {
    const event = taskData.eventId ? rawEvents.find((e) => e.id === taskData.eventId) : undefined;
    const campus = taskData.campusId 
      ? campuses.find((c) => c.id === taskData.campusId) 
      : currentCampus || undefined;

    const assigneeIds = taskData.assigneeIds && taskData.assigneeIds.length > 0 
      ? taskData.assigneeIds 
      : taskData.assigneeId ? [taskData.assigneeId] : [];
    
    const assigneesList = assigneeIds.map((id) => {
      const u = orgUsers.find((user) => user.id === id);
      return {
        id,
        name: u ? u.name : 'Responsável',
        avatar: u ? u.avatar : undefined,
      };
    });

    const primaryAssignee = assigneesList[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 5);

    const newTask: Task = {
      id: 'tsk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      organizationId: currentOrganization.id,
      campusId: campus ? campus.id : null,
      campusName: campus ? campus.name : 'Toda a Organização',
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      status: taskData.status || 'INBOX',
      priority: taskData.priority || 'MEDIUM',
      demandType: taskData.demandType,
      eventId: taskData.eventId,
      eventName: event ? event.title : undefined,
      requesterId: taskData.requesterId || currentUser.id,
      requesterName: taskData.requesterName || currentUser.name,
      assigneeId: primaryAssignee ? primaryAssignee.id : undefined,
      assigneeName: assigneesList.length > 0 ? assigneesList.map((a) => a.name).join(', ') : undefined,
      assigneeAvatar: primaryAssignee ? primaryAssignee.avatar : undefined,
      assigneeIds,
      assignees: assigneesList,
      approverId: taskData.approverId,
      approverName: taskData.approverName,
      requestedAt: new Date().toISOString(),
      startDate: taskData.startDate || todayStr,
      deadline: taskData.deadline || defaultDeadline.toISOString().split('T')[0],
      effortEstimate: taskData.effortEstimate || 'Médio',
      tags: taskData.tags || [],
      attachmentLinks: taskData.attachmentLinks || [],
      dependencies: taskData.dependencies || [],
      checklist: taskData.checklist || [],
      commentsCount: 0,
      isArchived: false,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.addTask(newTask);
    setRawTasks(updated);
    FirestoreRepository.saveTask(newTask);

    // Automation Trigger: TASK_ASSIGNED
    if (newTask.assigneeId) {
      AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_ASSIGNED', {
        task: newTask,
        actorName: currentUser.name,
      });
    }

    const newActivity: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: newTask.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'abriu a demanda na Central de Demandas',
      targetType: 'demand',
      targetId: newTask.id,
      targetTitle: newTask.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(newActivity));
    FirestoreRepository.recordActivity(newActivity);

    success('Demanda criada com sucesso!', newTask.title);
    return newTask;
  };

  const updateTask = (task: Task) => {
    const oldTask = rawTasks.find((t) => t.id === task.id);
    const event = task.eventId ? rawEvents.find((e) => e.id === task.eventId) : undefined;
    const campus = task.campusId ? campuses.find((c) => c.id === task.campusId) : undefined;

    const assigneeIds = task.assigneeIds && task.assigneeIds.length > 0 
      ? task.assigneeIds 
      : task.assigneeId ? [task.assigneeId] : [];
    
    const assigneesList = assigneeIds.map((id) => {
      const u = orgUsers.find((user) => user.id === id);
      return {
        id,
        name: u ? u.name : 'Responsável',
        avatar: u ? u.avatar : undefined,
      };
    });

    const primaryAssignee = assigneesList[0];

    const updatedTask: Task = {
      ...task,
      campusName: campus ? campus.name : 'Toda a Organização',
      eventName: event ? event.title : undefined,
      assigneeId: primaryAssignee ? primaryAssignee.id : undefined,
      assigneeName: assigneesList.length > 0 ? assigneesList.map((a) => a.name).join(', ') : undefined,
      assigneeAvatar: primaryAssignee ? primaryAssignee.avatar : undefined,
      assigneeIds,
      assignees: assigneesList,
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.updateTask(updatedTask);
    setRawTasks(updated);
    FirestoreRepository.saveTask(updatedTask);

    // Automation Trigger: TASK_ASSIGNED when assignee changed
    if (oldTask && oldTask.assigneeId !== updatedTask.assigneeId && updatedTask.assigneeId) {
      AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_ASSIGNED', {
        task: updatedTask,
        actorName: currentUser.name,
      });
    }

    success('Tarefa atualizada!', updatedTask.title);
  };

  const moveTask = (taskId: string, newStatus: TaskStatus, force = false): { success: boolean; blockedBy?: Task[] } => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return { success: false };

    if (task.status === newStatus) return { success: true };

    const isAdvancing = ['IN_PROGRESS', 'REVIEW', 'DONE'].includes(newStatus);
    if (isAdvancing && !force) {
      const depResult = checkDependencies(task);
      if (depResult.hasPending) {
        warning(
          'Avanço bloqueado por dependências!',
          `A tarefa possui ${depResult.pendingTasks.length} tarefa(s) predecessora(s) pendente(s).`
        );
        return { success: false, blockedBy: depResult.pendingTasks };
      }
    }

    const updatedTask: Task = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'DONE' ? new Date().toISOString() : task.completedAt,
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.updateTask(updatedTask);
    setRawTasks(updated);

    // Automation Trigger: TASK_REVIEW
    if (newStatus === 'REVIEW') {
      AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_REVIEW', {
        task: updatedTask,
        leaderIds: leaderUserIds,
        actorName: currentUser.name,
      });
      ApprovalService.recordAction(
        currentOrganization.id,
        updatedTask.id,
        'REQUESTED',
        currentUser.id,
        currentUser.name,
        undefined,
        undefined,
        'Enviado para revisão e controle de qualidade.'
      );
    }

    const colDef = KANBAN_COLUMNS.find((c) => c.id === newStatus);
    const newActivity: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `moveu para ${colDef ? colDef.title : newStatus}`,
      fieldChanged: 'status',
      oldValue: task.status,
      newValue: newStatus,
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(newActivity));

    return { success: true };
  };

  const blockTaskWithReason = (taskId: string, reason: string, actionRequiredBy: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: 'BLOCKED',
      blockedReason: reason,
      blockedActionRequiredBy: actionRequiredBy,
      updatedAt: new Date().toISOString(),
    };

    setRawTasks(StorageService.updateTask(updatedTask));

    // Automation Trigger: TASK_BLOCKED
    AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_BLOCKED', {
      task: updatedTask,
      leaderIds: leaderUserIds,
      reason,
      actorName: currentUser.name,
    });

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `bloqueou: "${reason}" (Ação necessária: ${actionRequiredBy})`,
      fieldChanged: 'status',
      oldValue: task.status,
      newValue: 'BLOCKED',
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    warning('Tarefa marcada como bloqueada', reason);
  };

  const unblockTask = (taskId: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: 'IN_PROGRESS',
      blockedReason: undefined,
      blockedActionRequiredBy: undefined,
      updatedAt: new Date().toISOString(),
    };

    setRawTasks(StorageService.updateTask(updatedTask));

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'desbloqueou a tarefa e retornou para Em Andamento',
      fieldChanged: 'status',
      oldValue: 'BLOCKED',
      newValue: 'IN_PROGRESS',
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    success('Tarefa desbloqueada com sucesso!');
  };

  const approveTask = (taskId: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: 'DONE',
      approverId: currentUser.id,
      approverName: currentUser.name,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRawTasks(StorageService.updateTask(updatedTask));

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'aprovou a entrega e concluiu a tarefa',
      securityEvent: 'APPROVED',
      fieldChanged: 'status',
      oldValue: task.status,
      newValue: 'DONE',
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    success('Demanda aprovada e concluída com sucesso! 🎉');
  };

  const archiveTask = (taskId: string, isArchived: boolean) => {
    const task = rawTasks.find((t) => t.id === taskId);
    const updated = StorageService.archiveTask(currentOrganization.id, taskId, isArchived);
    setRawTasks(updated);
    if (task) {
      const act: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        campusId: task.campusId,
        userId: currentUser.id,
        userName: currentUser.name,
        action: isArchived ? 'arquivou a tarefa' : 'restaurou a tarefa',
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      };
      setActivities(StorageService.addActivity(act));
    }
    success(isArchived ? 'Tarefa arquivada!' : 'Tarefa restaurada!');
  };

  const deleteTask = (taskId: string) => {
    const updated = StorageService.deleteTask(currentOrganization.id, taskId);
    setRawTasks(updated);
    FirestoreRepository.deleteTask(currentOrganization.id, taskId);
    info('Tarefa excluída permanentemente.');
  };

  // Event Project Actions
  const createEvent = (eventData: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>): ChurchEvent | null => {
    if (rawEvents.filter((e) => !e.isArchived).length >= currentOrganization.limits.maxEvents) {
      notifyError(
        'Limite de Eventos atingido!',
        `O plano ${currentOrganization.subscription.plan} permite no máximo ${currentOrganization.limits.maxEvents} eventos ativos.`
      );
      return null;
    }

    const leader = orgUsers.find((u) => u.id === eventData.leaderId);
    const campus = eventData.campusId 
      ? campuses.find((c) => c.id === eventData.campusId) 
      : currentCampus || undefined;

    const newEvent: ChurchEvent = {
      ...eventData,
      id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      organizationId: currentOrganization.id,
      campusId: campus ? campus.id : null,
      campusName: campus ? campus.name : 'Toda a Organização',
      leaderName: leader ? leader.name : 'Líder Responsável',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.addEvent(newEvent);
    setRawEvents(updated);
    FirestoreRepository.saveEvent(newEvent);

    const newActivity: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: newEvent.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'criou o projeto de evento',
      securityEvent: 'EVENT_CREATED',
      targetType: 'event',
      targetId: newEvent.id,
      targetTitle: newEvent.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(newActivity));
    FirestoreRepository.recordActivity(newActivity);

    success('Projeto de Evento criado com sucesso!', newEvent.title);
    return newEvent;
  };

  const createEventFromTemplate = (
    templateId: string,
    eventTitle: string,
    eventStartDate: string,
    eventEndDate?: string,
    campusId?: string | null,
    location?: string
  ): ChurchEvent | null => {
    const template = EVENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return null;

    const leader = orgUsers[0];
    const createdEvent = createEvent({
      organizationId: currentOrganization.id,
      title: eventTitle,
      description: template.description,
      category: template.category,
      status: 'PLANNING',
      startDate: eventStartDate,
      endDate: eventEndDate || eventStartDate,
      location: location || 'Templo Principal',
      campusId: campusId || null,
      leaderId: leader.id,
      leaderName: leader.name,
      teamIds: orgUsers.slice(0, 3).map((u) => u.id),
      bannerColor: 'from-indigo-600 to-purple-600',
    });

    if (!createdEvent) return null;

    const createdTaskIds: string[] = [];
    const eventDate = new Date(eventStartDate + 'T00:00:00');

    template.defaultTasks.forEach((tmplTask) => {
      const taskDeadline = new Date(eventDate);
      taskDeadline.setDate(eventDate.getDate() - tmplTask.daysBeforeEvent);

      const taskStartDate = new Date(taskDeadline);
      taskStartDate.setDate(taskDeadline.getDate() - tmplTask.durationDays);

      const predecessorId = tmplTask.dependsOnIndex !== undefined ? createdTaskIds[tmplTask.dependsOnIndex] : undefined;

      const task = createTask({
        title: tmplTask.title,
        description: `Entrega gerada automaticamente a partir do modelo "${template.name}".`,
        demandType: tmplTask.demandType,
        status: 'PLANNING',
        priority: tmplTask.priority,
        eventId: createdEvent.id,
        campusId: createdEvent.campusId,
        startDate: taskStartDate.toISOString().split('T')[0],
        deadline: taskDeadline.toISOString().split('T')[0],
        dependencies: predecessorId ? [predecessorId] : [],
        checklist: tmplTask.checklist?.map((c, i) => ({ id: `chk_${i}_${Date.now()}`, text: c, completed: false })) || [],
        effortEstimate: `${tmplTask.durationDays} dias`,
      });

      createdTaskIds.push(task.id);
    });

    success(
      `Projeto criado com sucesso via Modelo!`,
      `Geradas ${createdTaskIds.length} tarefas encadeadas para "${eventTitle}".`
    );

    return createdEvent;
  };

  const updateEvent = (event: ChurchEvent): boolean => {
    if (event.status === 'FINISHED') {
      const stats = getEventStats(event.id);
      const pendingCount = stats.totalTasks - stats.completedTasks;
      if (pendingCount > 0) {
        warning(
          'Projeto com entregas pendentes!',
          `Não é possível finalizar este evento: ${pendingCount} tarefa(s) ainda não foram concluídas no Kanban.`
        );
        return false;
      }
    }

    const leader = orgUsers.find((u) => u.id === event.leaderId);
    const campus = event.campusId ? campuses.find((c) => c.id === event.campusId) : undefined;

    const updatedEvent: ChurchEvent = {
      ...event,
      campusName: campus ? campus.name : 'Toda a Organização',
      leaderName: leader ? leader.name : event.leaderName,
      updatedAt: new Date().toISOString(),
    };
    const updated = StorageService.updateEvent(updatedEvent);
    setRawEvents(updated);
    FirestoreRepository.saveEvent(updatedEvent);

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: event.campusId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `atualizou o projeto de evento (Status: ${event.status})`,
      securityEvent: event.status === 'FINISHED' ? 'EVENT_COMPLETED' : 'EVENT_STATUS_CHANGED',
      targetType: 'event',
      targetId: event.id,
      targetTitle: event.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    FirestoreRepository.recordActivity(act);

    success('Evento atualizado!', updatedEvent.title);
    return true;
  };

  const archiveEvent = (eventId: string, isArchived: boolean) => {
    const updated = StorageService.archiveEvent(currentOrganization.id, eventId, isArchived);
    setRawEvents(updated);
    success(isArchived ? 'Evento arquivado!' : 'Evento restaurado!');
  };

  const deleteEvent = (eventId: string) => {
    const updated = StorageService.deleteEvent(currentOrganization.id, eventId);
    setRawEvents(updated);
    FirestoreRepository.deleteEvent(currentOrganization.id, eventId);
    info('Evento excluído permanentemente.');
  };

  const getEventStats = (eventId: string): EventProjectStats => {
    const eventTasks = rawTasks.filter((t) => t.eventId === eventId && !t.isArchived);
    const todayStr = new Date().toISOString().split('T')[0];

    const completedTasks = eventTasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = eventTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'PLANNING' || t.status === 'REVIEW').length;
    const blockedTasks = eventTasks.filter((t) => t.status === 'BLOCKED').length;
    const overdueTasks = eventTasks.filter((t) => t.status !== 'DONE' && t.deadline < todayStr).length;

    const progressPercentage = eventTasks.length > 0
      ? Math.round((completedTasks / eventTasks.length) * 100)
      : 0;

    return {
      totalTasks: eventTasks.length,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overdueTasks,
      progressPercentage,
    };
  };

  // Comments with @mentions notification
  const addComment = (taskId: string, content: string, mentionedUserIds?: string[]) => {
    const newComment: Comment = {
      id: 'cmt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      organizationId: currentOrganization.id,
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: 'TEAM',
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = StorageService.addComment(newComment);
    setComments(updated);
    setRawTasks(StorageService.getTasks(currentOrganization.id));

    // Find task title
    const currentTasks = StorageService.getTasks(currentOrganization.id);
    const targetTask = currentTasks.find((t) => t.id === taskId);
    const taskTitle = targetTask ? targetTask.title : 'Demanda';

    // Collect mentioned users
    const allUsers = StorageService.getUsers();
    let targetUsersToNotify: User[] = [];

    if (mentionedUserIds && mentionedUserIds.length > 0) {
      targetUsersToNotify = allUsers.filter((u) => mentionedUserIds.includes(u.id));
    } else {
      // Auto-detect @names from content
      targetUsersToNotify = allUsers.filter((u) => {
        const cleanName = u.name.trim();
        const firstName = cleanName.split(' ')[0];
        return content.includes(`@${cleanName}`) || (firstName && content.includes(`@${firstName}`));
      });
    }

    // Trigger Notification for each mentioned user (except self)
    targetUsersToNotify.forEach((targetUser) => {
      if (targetUser.id !== currentUser.id) {
        NotificationService.createNotification({
          organizationId: currentOrganization.id,
          campusId: currentCampus?.id || null,
          userId: targetUser.id,
          type: 'MENTION',
          title: `${currentUser.name} mencionou você`,
          message: `${currentUser.name} mencionou você na demanda "${taskTitle}": "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
          entityType: 'TASK',
          entityId: taskId,
        });
      }
    });
  };

  const getCommentsForTask = (taskId: string): Comment[] => {
    return comments
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  // Demand Types Management
  const addDemandType = (newType: DemandTypeDefinition) => {
    const updated = [...demandTypes, newType];
    setDemandTypes(updated);
    StorageService.saveDemandTypes(currentOrganization.id, updated);
    success('Novo tipo de demanda adicionado!', `Tipo "${newType.label}" agora disponível nas solicitações.`);
  };

  const updateDemandType = (updatedType: DemandTypeDefinition) => {
    const updated = demandTypes.map((dt) => (dt.type === updatedType.type ? updatedType : dt));
    setDemandTypes(updated);
    StorageService.saveDemandTypes(currentOrganization.id, updated);
    success('Tipo de demanda atualizado com sucesso!');
  };

  const deleteDemandType = (typeName: string) => {
    const updated = demandTypes.filter((dt) => dt.type !== typeName);
    setDemandTypes(updated);
    StorageService.saveDemandTypes(currentOrganization.id, updated);
    info('Tipo de demanda removido.');
  };

  const resetDemandTypesToDefault = () => {
    setDemandTypes(DEMAND_TYPES);
    StorageService.saveDemandTypes(currentOrganization.id, DEMAND_TYPES);
    success('Tipos de demanda restaurados para o padrão.');
  };

  // Event Categories Management
  const addEventCategory = (newCat: EventCategoryDefinition) => {
    const updated = [...eventCategories, newCat];
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    success('Nova categoria de evento adicionada!');
  };

  const updateEventCategory = (updatedCat: EventCategoryDefinition) => {
    const updated = eventCategories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    success('Categoria de evento atualizada!');
  };

  const deleteEventCategory = (catId: string) => {
    const updated = eventCategories.filter((c) => c.id !== catId);
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    info('Categoria de evento removida.');
  };

  // Departments Management
  const addDepartment = (newDept: DepartmentDefinition) => {
    const updated = [...departments, newDept];
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    success('Novo ministério/departamento adicionado!');
  };

  const updateDepartment = (updatedDept: DepartmentDefinition) => {
    const updated = departments.map((d) => (d.id === updatedDept.id ? updatedDept : d));
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    success('Departamento atualizado!');
  };

  const deleteDepartment = (deptId: string) => {
    const updated = departments.filter((d) => d.id !== deptId);
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    info('Departamento removido.');
  };

  const resetAllData = () => {
    StorageService.resetData();
    setRawTasks(StorageService.getTasks(currentOrganization.id));
    setRawEvents(StorageService.getEvents(currentOrganization.id));
    setComments(StorageService.getComments(currentOrganization.id));
    setActivities(StorageService.getActivities(currentOrganization.id));
    setDemandTypes(StorageService.getDemandTypes(currentOrganization.id));
    setEventCategories(StorageService.getEventCategories(currentOrganization.id));
    setDepartments(StorageService.getDepartments(currentOrganization.id));
    clearFilters();
    success('Dados restaurados para o padrão de demonstração multi-tenant!');
  };

  return (
    <DataContext.Provider
      value={{
        tasks: scopedTasks,
        events: scopedEvents,
        users: orgUsers,
        comments,
        activities,
        columns: KANBAN_COLUMNS,
        templates: EVENT_TEMPLATES,
        demandTypes,
        eventCategories,
        departments,
        addDemandType,
        updateDemandType,
        deleteDemandType,
        resetDemandTypesToDefault,
        addEventCategory,
        updateEventCategory,
        deleteEventCategory,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        filterOnlyMyTasks,
        setFilterOnlyMyTasks,
        filterEventId,
        setFilterEventId,
        filterAssigneeId,
        setFilterAssigneeId,
        filterPriority,
        setFilterPriority,
        filterDemandType,
        setFilterDemandType,
        filterCampusId,
        setFilterCampusId,
        searchQuery,
        setSearchQuery,
        clearFilters,
        filteredTasks,
        createTask,
        updateTask,
        moveTask,
        archiveTask,
        deleteTask,
        checkDependencies,
        remindPredecessors,
        blockTaskWithReason,
        unblockTask,
        approveTask,
        createEvent,
        createEventFromTemplate,
        updateEvent,
        archiveEvent,
        deleteEvent,
        getEventStats,
        addComment,
        getCommentsForTask,
        resetAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
