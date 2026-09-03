export type UserRole = 'ADMIN' | 'LEADER' | 'TEAM' | 'REQUESTER';
export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type Permission =
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.assign'
  | 'tasks.approve'
  | 'events.manage'
  | 'users.manage'
  | 'campuses.manage'
  | 'organization.manage'
  | 'reports.view'
  | 'automations.manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign',
    'tasks.approve',
    'events.manage',
    'users.manage',
    'campuses.manage',
    'organization.manage',
    'reports.view',
    'automations.manage',
  ],
  LEADER: [
    'tasks.create',
    'tasks.edit',
    'tasks.assign',
    'tasks.approve',
    'events.manage',
    'reports.view',
    'automations.manage',
  ],
  TEAM: [
    'tasks.create',
    'tasks.edit',
  ],
  REQUESTER: [
    'tasks.create',
  ],
};

export interface EvolutionIntegrationConfig {
  baseUrl?: string;
  apiKey?: string;
  instanceName?: string;
  isEnabled?: boolean;
  notifyOnTaskCreated?: boolean;
  notifyOnTaskBlocked?: boolean;
  notifyOnTaskApproved?: boolean;
  notifyOnMention?: boolean;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  whatsapp?: string;
  whatsappInstanceName?: string;
  whatsappConnected?: boolean;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
  createdAt?: string;
  organizationIds?: string[];
  activeOrganizationId?: string;
  tenantId?: string;
}

export type TenantPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED';

export interface PlanLimits {
  maxMembers: number;
  maxCampuses: number;
  maxEvents: number;
  maxTasks: number;
  storageGB: number;
  customBranding: boolean;
  advancedReports: boolean;
  gantt: boolean;
  apiAccess: boolean;
}

export interface Subscription {
  organizationId: string;
  plan: TenantPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  provider?: 'ASAAS' | 'STRIPE';
  externalCustomerId?: string;
  externalSubscriptionId?: string;
}

export interface OrganizationBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  loginBackgroundUrl?: string;
  customDomain?: string;
}

export interface Campus {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  city: string;
  address?: string;
  isMainCampus: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: OrganizationBranding;
  subscription: Subscription;
  limits: PlanLimits;
  evolutionConfig?: EvolutionIntegrationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  hasOrgWideAccess: boolean;
  campusIds: string[];
  role: UserRole;
  department?: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'INBOX' 
  | 'PLANNING' 
  | 'IN_PROGRESS' 
  | 'BLOCKED' 
  | 'REVIEW' 
  | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DemandType = 
  | 'ARTE' 
  | 'VIDEO' 
  | 'SOCIAL_MEDIA' 
  | 'FOTOGRAFIA' 
  | 'TEXTO' 
  | 'IMPRESSAO' 
  | 'SITE' 
  | 'APRESENTACAO' 
  | 'LOGISTICA'
  | 'OBRA'
  | 'COMPRAS'
  | 'ADMINISTRATIVO'
  | 'COMUNICACAO_INTERNA' 
  | 'EVENTO' 
  | 'OUTRO'
  | (string & {});

export interface AttachmentLink {
  id: string;
  title: string;
  url: string;
  type: 'drive' | 'canva' | 'figma' | 'document' | 'image' | 'video' | 'other';
  size?: number;
  mimeType?: string;
  storagePath?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
}

export interface Comment {
  id: string;
  organizationId: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}

export type ApprovalAction = 'REQUESTED' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface ApprovalRecord {
  id: string;
  taskId: string;
  organizationId: string;
  action: ApprovalAction;
  requestedBy: string;
  requestedByName: string;
  approverId?: string;
  approverName?: string;
  comment?: string;
  timestamp: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface Task {
  id: string;
  organizationId: string;
  campusId?: string | null;
  campusName?: string;
  
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  demandType: DemandType;
  
  eventId?: string;
  eventName?: string;
  
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  department?: string;
  targetTeam?: string;
  deliverables?: string[];
  protocolId?: string;

  /**
   * Fonte de verdade para responsáveis. Sempre um array de user IDs.
   * A exibição (nome, avatar) é derivada de lookup em orgUsers no client.
   */
  assigneeIds: string[];

  /**
   * @deprecated Usar assigneeIds[0]. Mantido apenas para compatibilidade de
   * leitura de documentos antigos. NÃO é gravado no Firestore por saveTask().
   */
  assigneeId?: string;
  /**
   * @deprecated Derivado de assigneeIds via lookup em orgUsers.
   * NÃO é gravado no Firestore por saveTask().
   */
  assigneeName?: string;
  /**
   * @deprecated Derivado de assigneeIds[0] via lookup em orgUsers.
   * NÃO é gravado no Firestore por saveTask().
   */
  assigneeAvatar?: string;
  /**
   * @deprecated Derivado de assigneeIds via lookup em orgUsers.
   * NÃO é gravado no Firestore por saveTask().
   */
  assignees?: TaskAssignee[];

  approverId?: string;
  approverName?: string;

  requestedAt: string;
  startDate: string;       // YYYY-MM-DD
  deadline: string;        // YYYY-MM-DD
  completedAt?: string;
  effortEstimate?: string;

  blockedReason?: string;
  blockedActionRequiredBy?: string;
  changesRequestedReason?: string;
  delayReason?: string;

  tags: string[];
  attachmentLinks: AttachmentLink[];
  dependencies: string[];
  checklist: ChecklistItem[];
  commentsCount: number;
  isArchived: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}


export type EventStatus = 'PLANNING' | 'IN_PROGRESS' | 'FINISHED';
export type EventCategory = 'CULTO' | 'CONFERENCIA' | 'CAMPANHA' | 'SERIE' | 'WORKSHOP' | 'RETIRO' | 'OUTRO';

export interface ChurchEvent {
  id: string;
  organizationId: string;
  campusId?: string | null;
  campusName?: string;

  title: string;
  description: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  location?: string;
  leaderId: string;
  leaderName: string;
  teamIds: string[];
  status: EventStatus;
  isArchived: boolean;
  bannerColor?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}


export interface EventProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  progressPercentage: number;
}

export interface TemplateTaskItem {
  title: string;
  demandType: DemandType;
  daysBeforeEvent: number;
  durationDays: number;
  priority: TaskPriority;
  checklist?: string[];
  dependsOnIndex?: number;
}

export interface EventTemplate {
  id: string;
  name: string;
  category: EventCategory;
  description: string;
  defaultTasks: TemplateTaskItem[];
}

// --- NOTIFICATIONS & AUTOMATION ---
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_BLOCKED'
  | 'TASK_REVIEW'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'MENTION'
  | 'DEPENDENCY_BLOCKED'
  | 'REQUEST_RECEIVED'
  | 'REQUEST_APPROVED'
  | 'EVENT_APPROACHING';

export interface Notification {
  id: string;
  organizationId: string;
  campusId?: string | null;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'TASK' | 'EVENT' | 'REQUEST';
  entityId?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface UserNotificationPreferences {
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  taskAssigned: boolean;
  taskOverdue: boolean;
  approvalRequested: boolean;
  dependencyBlocked: boolean;
  eventApproaching: boolean;
  dailyDigest: boolean;
}

export type AutomationTrigger =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'TASK_MOVED'
  | 'TASK_BLOCKED'
  | 'TASK_REVIEW'
  | 'EVENT_CREATED'
  | 'EVENT_APPROACHING';

export interface AutomationAction {
  type: 'NOTIFY_USER' | 'NOTIFY_LEADER' | 'NOTIFY_APPROVER' | 'SEND_WHATSAPP_PREP';
  templateMessage: string;
}

export interface AutomationRule {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
}

export type SecurityAuditEvent = 

  | 'USER_INVITED' 
  | 'USER_ROLE_CHANGED' 
  | 'USER_REMOVED' 
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'MEMBERSHIP_CREATED' 

  | 'CAMPUS_CREATED' 
  | 'CAMPUS_DELETED' 
  | 'ORGANIZATION_UPDATED' 
  | 'SUBSCRIPTION_CHANGED' 
  | 'EVENT_CREATED'
  | 'EVENT_STATUS_CHANGED'
  | 'EVENT_COMPLETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'AUTOMATION_TRIGGERED'
  | 'PERMISSION_DENIED';


export interface ActivityLog {
  id: string;
  organizationId: string;
  campusId?: string | null;
  userId: string;
  userName: string;
  action: string;
  securityEvent?: SecurityAuditEvent;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  targetType: 'task' | 'event' | 'user' | 'demand' | 'organization' | 'security';
  targetId: string;
  targetTitle: string;
  timestamp: string;
}

export type NavigationTab = 
  | 'dashboard' 
  | 'tasks' 
  | 'events' 
  | 'gantt' 
  | 'calendar' 
  | 'archived' 
  | 'users'
  | 'settings';

export interface ColumnDefinition {
  id: TaskStatus;
  title: string;
  description: string;
  color: string;
  badgeBg: string;
  borderHover: string;
}

export interface DemandTypeDefinition {
  id?: string;
  type: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  bgLight: string;
  placeholderText: string;
  isCustom?: boolean;
}

export interface EventCategoryDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
}

export interface DepartmentDefinition {
  id: string;
  name: string;
  leaderName?: string;
  description?: string;
}

export interface TaskQueryFilter {
  campusId?: string | null;
  status?: TaskStatus;
  eventId?: string;
  isArchived?: boolean;
  limitCount?: number;
  lastDocId?: string;
  orderByField?: 'updatedAt' | 'createdAt' | 'deadline';
  orderDirection?: 'asc' | 'desc';
}

export interface PagedResponse<T> {
  items: T[];
  hasMore: boolean;
  lastDocId?: string;
}

