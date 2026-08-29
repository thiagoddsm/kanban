import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  Membership, 
  UserRole, 
  Organization, 
  Campus, 
  Permission, 
  ROLE_PERMISSIONS, 
  SecurityAuditEvent,
  ActivityLog
} from '../types';
import { StorageService } from '../services/storageService';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { useNotification } from './NotificationContext';

interface AccessContextType {
  memberships: Membership[];
  currentMembership: Membership | null;
  currentRole: UserRole;
  accessibleOrganizations: Organization[];
  accessibleCampuses: Campus[];
  hasCampusAccess: (campusId?: string | null) => boolean;
  hasPermission: (permission: Permission) => boolean;
  switchRoleInCurrentOrg: (newRole: UserRole) => void;
  addMemberToOrg: (userEmail: string, userName: string, role: UserRole, campusIds: string[], hasOrgWideAccess?: boolean, department?: string) => boolean;
  updateMemberRole: (membershipId: string, newRole: UserRole, campusIds: string[], hasOrgWideAccess: boolean) => void;
  removeMemberFromOrg: (membershipId: string) => void;

  // RBAC Derived Flags (Convenience shortcuts backed by hasPermission)
  isAdmin: boolean;
  isLeader: boolean;
  isTeam: boolean;
  isRequester: boolean;
  
  canViewFullDashboard: boolean;
  canCreateDemand: boolean;
  canCreateTaskDirectly: boolean;
  canAssignResponsible: boolean;
  canChangePriority: boolean;
  canMoveTasks: boolean;
  canApproveTasks: boolean;
  canManageUsers: boolean;
  canArchive: boolean;
  canManageEvents: boolean;
  canManageCampuses: boolean;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export const AccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { organizations, currentOrganization, campuses } = useTenant();
  const { success, warning, error: notifyError } = useNotification();

  const [memberships, setMemberships] = useState<Membership[]>(() => StorageService.getMemberships());

  // Refresh memberships on mount or change
  useEffect(() => {
    setMemberships(StorageService.getMemberships());
  }, [currentOrganization.id, currentUser.id]);

  // Current active membership in the selected organization
  const currentMembership = useMemo(() => {
    return (
      memberships.find(
        (m) => m.userId === currentUser.id && m.organizationId === currentOrganization.id && m.status === 'ACTIVE'
      ) || null
    );
  }, [memberships, currentUser.id, currentOrganization.id]);

  const currentRole: UserRole = currentMembership?.role || 'REQUESTER';

  // Permission Checking Engine
  const hasPermission = (permission: Permission): boolean => {
    if (!currentMembership) {
      return permission === 'tasks.create'; // Requesters can create demands
    }
    const permissions = ROLE_PERMISSIONS[currentRole] || [];
    const granted = permissions.includes(permission);
    if (!granted) {
      // Log Security Audit Event: PERMISSION_DENIED
      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `tentou executar ação não autorizada: ${permission}`,
        securityEvent: 'PERMISSION_DENIED',
        targetType: 'security',
        targetId: permission,
        targetTitle: `Permissão: ${permission}`,
        timestamp: new Date().toISOString(),
      };
      StorageService.addActivity(auditLog);
    }
    return granted;
  };

  // Accessible Organizations for current user
  const accessibleOrganizations = useMemo(() => {
    const userOrgIds = memberships
      .filter((m) => m.userId === currentUser.id && m.status === 'ACTIVE')
      .map((m) => m.organizationId);

    return organizations.filter((o) => userOrgIds.includes(o.id));
  }, [organizations, memberships, currentUser.id]);

  // Accessible Campuses in current organization
  const accessibleCampuses = useMemo(() => {
    if (!currentMembership) return [];
    if (currentMembership.hasOrgWideAccess || currentMembership.role === 'ADMIN') {
      return campuses;
    }
    return campuses.filter((c) => currentMembership.campusIds.includes(c.id));
  }, [campuses, currentMembership]);

  const hasCampusAccess = (campusId?: string | null): boolean => {
    if (!campusId) return true; // Null/undefined means Organization-wide
    if (!currentMembership) return false;
    if (currentMembership.hasOrgWideAccess || currentMembership.role === 'ADMIN') {
      return true;
    }
    return currentMembership.campusIds.includes(campusId);
  };

  const switchRoleInCurrentOrg = (newRole: UserRole) => {
    if (currentMembership) {
      const updated: Membership = {
        ...currentMembership,
        role: newRole,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = StorageService.updateMembership(updated);
      setMemberships(updatedList);

      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `alterou o papel para ${newRole}`,
        securityEvent: 'USER_ROLE_CHANGED',
        oldValue: currentMembership.role,
        newValue: newRole,
        targetType: 'security',
        targetId: currentMembership.id,
        targetTitle: `Membro: ${currentUser.name}`,
        timestamp: new Date().toISOString(),
      };
      StorageService.addActivity(auditLog);

      success(`Papel em ${currentOrganization.name} alterado para: ${newRole}`);
    } else {
      const newMem: Membership = {
        id: 'mem_' + currentUser.id + '_' + currentOrganization.id,
        userId: currentUser.id,
        organizationId: currentOrganization.id,
        hasOrgWideAccess: true,
        campusIds: [],
        role: newRole,
        department: 'Geral',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedList = StorageService.addMembership(newMem);
      setMemberships(updatedList);
      success(`Associado a ${currentOrganization.name} como: ${newRole}`);
    }
  };

  const addMemberToOrg = (
    userEmail: string,
    userName: string,
    role: UserRole,
    campusIds: string[],
    hasOrgWideAccess = false,
    department = 'Comunicação'
  ): boolean => {
    // Check Subscription Limit for Members
    const currentMembersCount = memberships.filter((m) => m.organizationId === currentOrganization.id).length;
    if (currentMembersCount >= currentOrganization.limits.maxMembers) {
      notifyError(
        'Limite do plano atingido!',
        `O plano ${currentOrganization.subscription.plan} permite no máximo ${currentOrganization.limits.maxMembers} membros. Faça upgrade para adicionar mais.`
      );
      return false;
    }

    let user = StorageService.getUsers().find((u) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (!user) {
      user = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: userName,
        email: userEmail,
        createdAt: new Date().toISOString(),
      };
      StorageService.addUser(user);
    }

    const newMem: Membership = {
      id: 'mem_' + user.id + '_' + currentOrganization.id,
      userId: user.id,
      organizationId: currentOrganization.id,
      hasOrgWideAccess,
      campusIds: hasOrgWideAccess ? [] : campusIds,
      role,
      department,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.addMembership(newMem);
    setMemberships(updated);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `convidou o membro ${userName} (${userEmail}) como ${role}`,
      securityEvent: 'USER_INVITED',
      targetType: 'security',
      targetId: newMem.id,
      targetTitle: `Membro: ${userName}`,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);

    success(`Membro ${userName} adicionado a ${currentOrganization.name}!`);
    return true;
  };

  const updateMemberRole = (
    membershipId: string, 
    newRole: UserRole, 
    campusIds: string[],
    hasOrgWideAccess: boolean
  ) => {
    const mem = memberships.find((m) => m.id === membershipId);
    if (mem) {
      const updated: Membership = {
        ...mem,
        role: newRole,
        hasOrgWideAccess,
        campusIds: hasOrgWideAccess ? [] : campusIds,
        updatedAt: new Date().toISOString(),
      };
      setMemberships(StorageService.updateMembership(updated));

      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: `alterou o papel do membro para ${newRole}`,
        securityEvent: 'USER_ROLE_CHANGED',
        oldValue: mem.role,
        newValue: newRole,
        targetType: 'security',
        targetId: membershipId,
        targetTitle: `Membro ID: ${mem.userId}`,
        timestamp: new Date().toISOString(),
      };
      StorageService.addActivity(auditLog);

      success('Permissões do membro atualizadas!');
    }
  };

  const removeMemberFromOrg = (membershipId: string) => {
    const mem = memberships.find((m) => m.id === membershipId);
    const updated = StorageService.deleteMembership(membershipId);
    setMemberships(updated);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `removeu o vínculo do membro`,
      securityEvent: 'USER_REMOVED',
      targetType: 'security',
      targetId: membershipId,
      targetTitle: `Membro ID: ${mem?.userId || membershipId}`,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);

    success('Membro removido da organização.');
  };

  // RBAC Permission Flags backed by closed Permission matrix
  const isAdmin = currentRole === 'ADMIN';
  const isLeader = isAdmin || currentRole === 'LEADER';
  const isTeam = isLeader || currentRole === 'TEAM';
  const isRequester = currentRole === 'REQUESTER';

  return (
    <AccessContext.Provider
      value={{
        memberships,
        currentMembership,
        currentRole,
        accessibleOrganizations,
        accessibleCampuses,
        hasCampusAccess,
        hasPermission,
        switchRoleInCurrentOrg,
        addMemberToOrg,
        updateMemberRole,
        removeMemberFromOrg,
        isAdmin,
        isLeader,
        isTeam,
        isRequester,
        canViewFullDashboard: hasPermission('reports.view') || isTeam,
        canCreateDemand: hasPermission('tasks.create'),
        canCreateTaskDirectly: hasPermission('tasks.edit'),
        canAssignResponsible: hasPermission('tasks.assign'),
        canChangePriority: hasPermission('tasks.assign') || isAdmin,
        canMoveTasks: hasPermission('tasks.edit'),
        canApproveTasks: hasPermission('tasks.approve'),
        canManageUsers: hasPermission('users.manage'),
        canArchive: hasPermission('tasks.delete') || isLeader,
        canManageEvents: hasPermission('events.manage'),
        canManageCampuses: hasPermission('campuses.manage'),
      }}
    >
      {children}
    </AccessContext.Provider>
  );
};

export const useAccess = (): AccessContextType => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
};
