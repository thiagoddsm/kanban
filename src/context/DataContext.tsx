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
import { EntitlementsService } from '../services/entitlementsService';
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
  filterTag: string;
  setFilterTag: (val: string) => void;
  allTags: string[];
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
  restoreTask: (taskId: string) => void;
  permanentlyDeleteTask: (taskId: string) => void;
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

  // Reset & Archive Loader
  fetchArchivedData: () => Promise<void>;
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
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsers());

  // Reload data whenever current organization changes + Firestore Realtime Sync
  useEffect(() => {
    if (!currentOrganization.id) return;

    setRawTasks(StorageService.getTasks(currentOrganization.id));
    setRawEvents(StorageService.getEvents(currentOrganization.id));
    setComments(StorageService.getComments(currentOrganization.id));
    setActivities(StorageService.getActivities(currentOrganization.id));
    setDemandTypes(StorageService.getDemandTypes(currentOrganization.id));
    setEventCategories(StorageService.getEventCategories(currentOrganization.id));
    setDepartments(StorageService.getDepartments(currentOrganization.id));
    setAllUsers(StorageService.getUsers());

    // Async Fetch from Firestore usando queries filtradas (isArchived: false)
    FirestoreRepository.fetchTasks(currentOrganization.id, { isArchived: false }).then((remoteTasks) => {
      if (remoteTasks) {
        setRawTasks(remoteTasks);
        StorageService.saveTasks(currentOrganization.id, remoteTasks);
      }
    });

    FirestoreRepository.fetchEvents(currentOrganization.id, false).then((remoteEvents) => {
      if (remoteEvents) {
        setRawEvents(remoteEvents);
        StorageService.saveEvents(currentOrganization.id, remoteEvents);
      }
    });

    FirestoreRepository.fetchUsers().then((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setAllUsers(remoteUsers);
        remoteUsers.forEach((u) => StorageService.addUser(u));
      }
    });

    FirestoreRepository.fetchComments(currentOrganization.id).then((remoteComments) => {
      if (remoteComments && remoteComments.length > 0) {
        setComments(remoteComments);
        remoteComments.forEach((c) => StorageService.addComment(c));
      }
    });

    FirestoreRepository.fetchOrgConfig(currentOrganization.id).then((remoteConfig) => {
      if (remoteConfig) {
        if (remoteConfig.demandTypes) {
          setDemandTypes(remoteConfig.demandTypes);
          StorageService.saveDemandTypes(currentOrganization.id, remoteConfig.demandTypes);
        }
        if (remoteConfig.eventCategories) {
          setEventCategories(remoteConfig.eventCategories);
          StorageService.saveEventCategories(currentOrganization.id, remoteConfig.eventCategories);
        }
        if (remoteConfig.departments) {
          setDepartments(remoteConfig.departments);
          StorageService.saveDepartments(currentOrganization.id, remoteConfig.departments);
        }
      }
    });

    // Realtime listeners filtrados por tarefas ativas - Firestore é a fonte única da verdade
    const unsubTasks = FirestoreRepository.subscribeTasks(
      currentOrganization.id,
      (tasks) => {
        if (tasks) {
          setRawTasks(tasks);
          StorageService.saveTasks(currentOrganization.id, tasks);
        }
      },
      { isArchived: false }
    );

    const unsubEvents = FirestoreRepository.subscribeEvents(
      currentOrganization.id, 
      (events) => {
        if (events) {
          setRawEvents(events);
          StorageService.saveEvents(currentOrganization.id, events);
        }
      },
      false
    );

    const unsubUsers = FirestoreRepository.subscribeUsers((users) => {
      if (users && users.length > 0) {
        setAllUsers(users);
        users.forEach((u) => StorageService.addUser(u));
      }
    });

    const unsubComments = FirestoreRepository.subscribeComments(currentOrganization.id, (comments) => {
      if (comments && comments.length >= 0) {
        setComments(comments);
        comments.forEach((c) => StorageService.addComment(c));
      }
    });

    const unsubConfig = FirestoreRepository.subscribeOrgConfig(currentOrganization.id, (remoteConfig) => {
      if (remoteConfig) {
        if (remoteConfig.demandTypes) {
          setDemandTypes(remoteConfig.demandTypes);
          StorageService.saveDemandTypes(currentOrganization.id, remoteConfig.demandTypes);
        }
        if (remoteConfig.eventCategories) {
          setEventCategories(remoteConfig.eventCategories);
          StorageService.saveEventCategories(currentOrganization.id, remoteConfig.eventCategories);
        }
        if (remoteConfig.departments) {
          setDepartments(remoteConfig.departments);
          StorageService.saveDepartments(currentOrganization.id, remoteConfig.departments);
        }
      }
    });

    return () => {
      unsubTasks();
      unsubEvents();
      unsubUsers();
      unsubComments();
      unsubConfig();
    };
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
    const orgMemberships = memberships.filter((m) => m.organizationId === currentOrganization.id && m.status === 'ACTIVE');
    const userIds = orgMemberships.map((m) => m.userId);
    return allUsers.filter((u) => userIds.includes(u.id));
  }, [allUsers, memberships, currentOrganization.id]);

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
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    scopedTasks.forEach((t) => {
      if (t.tags) {
        t.tags.forEach((tag) => {
          if (tag.trim()) set.add(tag.trim());
        });
      }
    });
    return Array.from(set).sort();
  }, [scopedTasks]);

  const clearFilters = () => {
    setFilterOnlyMyTasks(false);
    setFilterEventId('');
    setFilterAssigneeId('');
    setFilterPriority('');
    setFilterDemandType('');
    setFilterCampusId('');
    setFilterTag('');
    setSearchQuery('');
  };

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (t.isArchived || t.isDeleted) return false;
      if (filterCampusId && t.campusId !== filterCampusId) return false;
      if (filterOnlyMyTasks) {
        const myId = currentUser?.id || '';
        const isMine = (t.assigneeIds && t.assigneeIds.includes(myId)) || t.assigneeId === myId || t.requesterId === myId;
        if (!isMine) return false;
      }
      if (filterEventId && t.eventId !== filterEventId) return false;
      if (filterAssigneeId) {
        const matches = (t.assigneeIds && t.assigneeIds.includes(filterAssigneeId)) || t.assigneeId === filterAssigneeId;
        if (!matches) return false;
      }
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterDemandType && t.demandType !== filterDemandType) return false;
      if (filterTag) {
        if (!t.tags || !t.tags.includes(filterTag)) return false;
      }
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
    filterTag,
    searchQuery,
    currentUser?.id,
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

    // assigneeIds é a fonte canônica. Os campos legados (assigneeId, assigneeName, etc.)
    // são derivados in-memory para a UI e NÃO são gravados no Firestore.
    const assigneeIds: string[] =
      taskData.assigneeIds && taskData.assigneeIds.length > 0
        ? taskData.assigneeIds
        : taskData.assigneeId ? [taskData.assigneeId] : [];

    // Lookup de display data (nome, avatar) — derivado dos orgUsers em memória
    const assigneesList = assigneeIds.map((id) => {
      const u = orgUsers.find((user) => user.id === id);
      return { id, name: u?.name ?? 'Responsável', avatar: u?.avatar };
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
      requesterId: taskData.requesterId || currentUser?.id || 'sys',
      requesterName: taskData.requesterName || currentUser?.name || 'Solicitante',
      // ── Campos canônicos ──────────────────────────────────────────
      assigneeIds,
      // ── Campos legados para compatibilidade de UI (não vão ao Firestore) ──
      assigneeId: primaryAssignee?.id,
      assigneeName: assigneesList.length > 0 ? assigneesList.map((a) => a.name).join(', ') : undefined,
      assigneeAvatar: primaryAssignee?.avatar,
      assignees: assigneesList,
      // ─────────────────────────────────────────────────────────────
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
      createdBy: currentUser?.id || 'sys',
      createdByName: currentUser?.name || 'Sistema',
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
        actorName: currentUser?.name || 'Sistema',
      });
    }

    const newActivity: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: newTask.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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

    // Consolidar assigneeIds a partir de qualquer campo preenchido
    const assigneeIds: string[] =
      task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId ? [task.assigneeId] : [];

    // Lookup de display data — derivado dos orgUsers em memória (não persistido no Firestore)
    const assigneesList = assigneeIds.map((id) => {
      const u = orgUsers.find((user) => user.id === id);
      return { id, name: u?.name ?? 'Responsável', avatar: u?.avatar };
    });
    const primaryAssignee = assigneesList[0];

    const updatedTask: Task = {
      ...task,
      campusName: campus ? campus.name : 'Toda a Organização',
      eventName: event ? event.title : undefined,
      // ── Campos canônicos ──────────────────────────────────────────
      assigneeIds,
      // ── Campos legados para compatibilidade de UI (não vão ao Firestore) ──
      assigneeId: primaryAssignee?.id,
      assigneeName: assigneesList.length > 0 ? assigneesList.map((a) => a.name).join(', ') : undefined,
      assigneeAvatar: primaryAssignee?.avatar,
      assignees: assigneesList,
      // ─────────────────────────────────────────────────────────────
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.updateTask(updatedTask);
    setRawTasks(updated);
    
    // Gravação assíncrona com controle de concorrência otimista
    FirestoreRepository.saveTask(updatedTask, task.version).then((res) => {
      if (res.conflict && res.remoteTask) {
        warning(
          'Conflito de edição simultânea!',
          `A tarefa "${res.remoteTask.title}" foi alterada recentemente por outro membro da equipe. A versão mais recente foi carregada.`
        );
        setRawTasks((prev) => prev.map((t) => (t.id === res.remoteTask!.id ? res.remoteTask! : t)));
      }
    });

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
    FirestoreRepository.saveTask(updatedTask);

    // Automation Trigger: TASK_REVIEW
    if (newStatus === 'REVIEW') {
      AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_REVIEW', {
        task: updatedTask,
        leaderIds: leaderUserIds,
        actorName: currentUser?.name || 'Sistema',
      });
      ApprovalService.recordAction(
        currentOrganization.id,
        updatedTask.id,
        'REQUESTED',
        currentUser?.id || 'sys',
        currentUser?.name || 'Sistema',
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
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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
    FirestoreRepository.recordActivity(newActivity);

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
    FirestoreRepository.saveTask(updatedTask);

    // Automation Trigger: TASK_BLOCKED
    AutomationEngine.handleTrigger(currentOrganization.id, 'TASK_BLOCKED', {
      task: updatedTask,
      leaderIds: leaderUserIds,
      reason,
      actorName: currentUser?.name || 'Sistema',
    });

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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
    FirestoreRepository.recordActivity(act);
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
    FirestoreRepository.saveTask(updatedTask);

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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
    FirestoreRepository.recordActivity(act);
    success('Tarefa desbloqueada com sucesso!');
  };

  const approveTask = (taskId: string) => {
    const task = rawTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      status: 'DONE',
      approverId: currentUser?.id || 'sys',
      approverName: currentUser?.name || 'Administrador',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRawTasks(StorageService.updateTask(updatedTask));
    FirestoreRepository.saveTask(updatedTask);

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: task.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Administrador',
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
    FirestoreRepository.recordActivity(act);
    success('Demanda aprovada e concluída com sucesso! 🎉');
  };

  const archiveTask = (taskId: string, isArchived: boolean) => {
    const task = rawTasks.find((t) => t.id === taskId);
    const updated = StorageService.archiveTask(currentOrganization.id, taskId, isArchived);
    setRawTasks(updated);
    if (task) {
      const updatedTask = { ...task, isArchived, updatedAt: new Date().toISOString() };
      FirestoreRepository.saveTask(updatedTask);
      const act: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        campusId: task.campusId,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Sistema',
        action: isArchived ? 'arquivou a tarefa' : 'restaurou a tarefa',
        targetType: 'task',
        targetId: task.id,
        targetTitle: task.title,
        timestamp: new Date().toISOString(),
      };
      setActivities(StorageService.addActivity(act));
      FirestoreRepository.recordActivity(act);
    }
    success(isArchived ? 'Tarefa arquivada!' : 'Tarefa restaurada!');
  };

  // 1. Soft Delete: move para a Lixeira
  const deleteTask = (taskId: string) => {
    const target = rawTasks.find((t) => t.id === taskId);
    if (!target) return;

    const softDeleted: Task = {
      ...target,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser?.name || 'Administrador',
      updatedAt: new Date().toISOString(),
    };

    const updated = rawTasks.map((t) => (t.id === taskId ? softDeleted : t));
    setRawTasks(updated);
    StorageService.saveTasks(currentOrganization.id, updated);
    FirestoreRepository.saveTask(softDeleted);

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: target.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
      action: `moveu a tarefa "${target.title}" para a Lixeira`,
      targetType: 'task',
      targetId: target.id,
      targetTitle: target.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    FirestoreRepository.recordActivity(act);

    info('Tarefa movida para a Lixeira (pode ser restaurada na aba Arquivados/Lixeira).');
  };

  // 2. Restaurar da Lixeira
  const restoreTask = (taskId: string) => {
    const target = rawTasks.find((t) => t.id === taskId);
    if (!target) return;

    const restored: Task = {
      ...target,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      updatedAt: new Date().toISOString(),
    };

    const updated = rawTasks.map((t) => (t.id === taskId ? restored : t));
    setRawTasks(updated);
    StorageService.saveTasks(currentOrganization.id, updated);
    FirestoreRepository.saveTask(restored);

    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: target.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
      action: `restaurou a tarefa "${target.title}" da Lixeira`,
      targetType: 'task',
      targetId: target.id,
      targetTitle: target.title,
      timestamp: new Date().toISOString(),
    };
    setActivities(StorageService.addActivity(act));
    FirestoreRepository.recordActivity(act);

    success('Tarefa restaurada para o Kanban com sucesso!');
  };

  // 3. Excluir Definitivamente
  const permanentlyDeleteTask = (taskId: string) => {
    const target = rawTasks.find((t) => t.id === taskId);
    const updated = StorageService.deleteTask(currentOrganization.id, taskId);
    setRawTasks(updated);
    FirestoreRepository.deleteTask(currentOrganization.id, taskId);

    if (target) {
      const act: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        campusId: target.campusId,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Sistema',
        action: `excluiu permanentemente a tarefa "${target.title}"`,
        targetType: 'task',
        targetId: target.id,
        targetTitle: target.title,
        timestamp: new Date().toISOString(),
      };
      setActivities(StorageService.addActivity(act));
      FirestoreRepository.recordActivity(act);
    }

    info('Tarefa excluída permanentemente.');
  };

  // Event Project Actions
  const createEvent = (eventData: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>): ChurchEvent | null => {
    const activeEventsCount = rawEvents.filter((e) => !e.isArchived).length;
    const check = EntitlementsService.checkEventLimit(currentOrganization, activeEventsCount);
    if (!check.allowed) {
      notifyError('Limite de Eventos atingido!', check.message || 'Limite de eventos atingido para o plano atual.');
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
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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
    
    FirestoreRepository.saveEvent(updatedEvent, event.version).then((res) => {
      if (res.conflict && res.remoteEvent) {
        warning(
          'Conflito de edição simultânea!',
          `O evento "${res.remoteEvent.title}" foi alterado recentemente por outro membro da equipe. A versão mais recente foi carregada.`
        );
        setRawEvents((prev) => prev.map((e) => (e.id === res.remoteEvent!.id ? res.remoteEvent! : e)));
      }
    });


    const act: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: event.campusId,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Sistema',
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
    const targetEvent = updated.find((e) => e.id === eventId) || rawEvents.find((e) => e.id === eventId);
    if (targetEvent) {
      const updatedEvent = { ...targetEvent, isArchived, updatedAt: new Date().toISOString() };
      FirestoreRepository.saveEvent(updatedEvent);
      const act: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        campusId: targetEvent.campusId,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Sistema',
        action: isArchived ? 'arquivou o projeto' : 'restaurou o projeto',
        targetType: 'event',
        targetId: targetEvent.id,
        targetTitle: targetEvent.title,
        timestamp: new Date().toISOString(),
      };
      setActivities(StorageService.addActivity(act));
      FirestoreRepository.recordActivity(act);
    }
    success(isArchived ? 'Projeto arquivado com sucesso!' : 'Projeto restaurado com sucesso!');
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
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Membro',
      userAvatar: currentUser?.avatar,
      userRole: 'TEAM',
      content,
      createdAt: new Date().toISOString(),
    };
    const updated = StorageService.addComment(newComment);
    setComments(updated);
    setRawTasks(StorageService.getTasks(currentOrganization.id));
    FirestoreRepository.saveComment(newComment);

    // Find task title
    const currentTasks = StorageService.getTasks(currentOrganization.id);
    const targetTask = currentTasks.find((t) => t.id === taskId);
    const taskTitle = targetTask ? targetTask.title : 'Demanda';

    // Collect mentioned users
    const allUsers = StorageService.getUsers();
    let targetUsersToNotify: User[] = [];

    if (mentionedUserIds && mentionedUserIds.length > 0) {
      targetUsersToNotify = allUsers.filter((u) => mentionedUserIds.includes(u.id));
    }

    // Also auto-detect any @names from content text
    const textLower = content.toLowerCase();
    allUsers.forEach((u) => {
      const cleanName = u.name.trim().toLowerCase();
      const firstName = cleanName.split(' ')[0];
      if (
        (cleanName && textLower.includes(`@${cleanName}`)) ||
        (firstName && textLower.includes(`@${firstName}`))
      ) {
        if (!targetUsersToNotify.some((existing) => existing.id === u.id)) {
          targetUsersToNotify.push(u);
        }
      }
    });

    // Trigger Notification for each mentioned user
    const actorName = currentUser?.name || 'Um membro';
    targetUsersToNotify.forEach((targetUser) => {
      NotificationService.createNotification({
        organizationId: currentOrganization.id,
        campusId: currentCampus?.id || null,
        userId: targetUser.id,
        type: 'MENTION',
        title: `${actorName} mencionou você`,
        message: `${actorName} mencionou você na demanda "${taskTitle}": "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
        entityType: 'TASK',
        entityId: taskId,
      });
    });

    if (targetUsersToNotify.length > 0) {
      info('Notificação de Menção', `${targetUsersToNotify.length} membro(s) notificado(s) com sucesso.`);
    }
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
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes: updated, eventCategories, departments });
    success('Novo tipo de demanda adicionado!', `Tipo "${newType.label}" agora disponível nas solicitações.`);
  };

  const updateDemandType = (updatedType: DemandTypeDefinition) => {
    const updated = demandTypes.map((dt) => (dt.type === updatedType.type ? updatedType : dt));
    setDemandTypes(updated);
    StorageService.saveDemandTypes(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes: updated, eventCategories, departments });
    success('Tipo de demanda atualizado com sucesso!');
  };

  const deleteDemandType = (typeName: string) => {
    const updated = demandTypes.filter((dt) => dt.type !== typeName);
    setDemandTypes(updated);
    StorageService.saveDemandTypes(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes: updated, eventCategories, departments });
    info('Tipo de demanda removido.');
  };

  const resetDemandTypesToDefault = () => {
    setDemandTypes(DEMAND_TYPES);
    StorageService.saveDemandTypes(currentOrganization.id, DEMAND_TYPES);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes: DEMAND_TYPES, eventCategories, departments });
    success('Tipos de demanda restaurados para o padrão.');
  };

  // Event Categories Management
  const addEventCategory = (newCat: EventCategoryDefinition) => {
    const updated = [...eventCategories, newCat];
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories: updated, departments });
    success('Nova categoria de evento adicionada!');
  };

  const updateEventCategory = (updatedCat: EventCategoryDefinition) => {
    const updated = eventCategories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories: updated, departments });
    success('Categoria de evento atualizada!');
  };

  const deleteEventCategory = (catId: string) => {
    const updated = eventCategories.filter((c) => c.id !== catId);
    setEventCategories(updated);
    StorageService.saveEventCategories(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories: updated, departments });
    info('Categoria de evento removida.');
  };

  // Departments Management
  const addDepartment = (newDept: DepartmentDefinition) => {
    const updated = [...departments, newDept];
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories, departments: updated });
    success('Novo ministério/departamento adicionado!');
  };

  const updateDepartment = (updatedDept: DepartmentDefinition) => {
    const updated = departments.map((d) => (d.id === updatedDept.id ? updatedDept : d));
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories, departments: updated });
    success('Departamento atualizado!');
  };

  const deleteDepartment = (deptId: string) => {
    const updated = departments.filter((d) => d.id !== deptId);
    setDepartments(updated);
    StorageService.saveDepartments(currentOrganization.id, updated);
    FirestoreRepository.saveOrgConfig(currentOrganization.id, { demandTypes, eventCategories, departments: updated });
    info('Departamento removido.');
  };

  const fetchArchivedData = async () => {
    if (!currentOrganization.id) return;
    try {
      const [archivedTasks, archivedEvents] = await Promise.all([
        FirestoreRepository.fetchTasks(currentOrganization.id, { isArchived: true }),
        FirestoreRepository.fetchEvents(currentOrganization.id, true),
      ]);
      if (archivedTasks && archivedTasks.length > 0) {
        setRawTasks((prev) => {
          const map = new Map(prev.map((t) => [t.id, t]));
          archivedTasks.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });
      }
      if (archivedEvents && archivedEvents.length > 0) {
        setRawEvents((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          archivedEvents.forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar dados arquivados do Firestore:', e);
    }
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
        filterTag,
        setFilterTag,
        allTags,
        searchQuery,
        setSearchQuery,
        clearFilters,
        filteredTasks,
        createTask,
        updateTask,
        moveTask,
        archiveTask,
        deleteTask,
        restoreTask,
        permanentlyDeleteTask,
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
        fetchArchivedData,
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
