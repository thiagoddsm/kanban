import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  Membership, 
  MembershipStatus,
  UserRole, 
  Organization, 
  Campus, 
  Permission, 
  ROLE_PERMISSIONS, 
  SecurityAuditEvent,
  ActivityLog
} from '../types';

import { StorageService } from '../services/storageService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { EntitlementsService } from '../services/entitlementsService';
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
  updateMemberStatus: (membershipId: string, status: MembershipStatus) => void;
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

  // Refresh memberships on mount or change & listen to Firestore
  useEffect(() => {
    setMemberships(StorageService.getMemberships());
    if (!currentOrganization.id) return;

    const dedupe = (list: Membership[]) => {
      const seen = new Set<string>();
      const res: Membership[] = [];
      for (const m of list) {
        const key = `${m.userId}_${m.organizationId}`;
        if (!seen.has(key)) {
          seen.add(key);
          res.push(m);
        }
      }
      return res;
    };

    FirestoreRepository.fetchMemberships(currentOrganization.id).then(async (remoteMems) => {
      try {
        // Auto-reconciliação: recupera qualquer usuário criado que esteja sem documento de membership
        const remoteUsers = await FirestoreRepository.fetchUsers();
        for (const u of remoteUsers) {
          const belongsToThisOrg = 
            u.tenantId === currentOrganization.id || 
            u.activeOrganizationId === currentOrganization.id || 
            u.organizationIds?.includes(currentOrganization.id) ||
            (!u.tenantId && !u.organizationIds?.length && u.id.startsWith('usr_'));

          if (belongsToThisOrg && !remoteMems.some((m) => m.userId === u.id)) {
            const recoveredMem: Membership = {
              id: 'mem_' + u.id + '_' + currentOrganization.id,
              userId: u.id,
              organizationId: currentOrganization.id,
              hasOrgWideAccess: true,
              campusIds: [],
              role: 'TEAM',
              department: 'Comunicação',
              status: 'ACTIVE',
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            remoteMems.push(recoveredMem);
            await FirestoreRepository.saveMembership(recoveredMem);
            console.log('✅ Membro recuperado e gravado no Firestore:', u.name, u.email);
          }
        }
      } catch (err) {
        console.warn('Erro na reconciliação de membros:', err);
      }

      if (remoteMems && remoteMems.length > 0) {
        setMemberships((prev) => {
          const others = prev.filter((m) => m.organizationId !== currentOrganization.id);
          const combined = dedupe([...others, ...remoteMems]);
          StorageService.saveMemberships(combined);
          return combined;
        });
      }
    });


    const unsub = FirestoreRepository.subscribeMemberships(currentOrganization.id, (remoteMems) => {
      if (remoteMems && remoteMems.length > 0) {
        setMemberships((prev) => {
          const others = prev.filter((m) => m.organizationId !== currentOrganization.id);
          const combined = dedupe([...others, ...remoteMems]);
          StorageService.saveMemberships(combined);
          return combined;
        });
      }
    });

    return () => unsub();
  }, [currentOrganization.id, currentUser?.id]);

  // Current active membership in the selected organization
  const currentMembership = useMemo(() => {
    if (!currentUser) return null;
    return (
      memberships.find(
        (m) => m.userId === currentUser.id && m.organizationId === currentOrganization.id && m.status === 'ACTIVE'
      ) || null
    );
  }, [memberships, currentUser?.id, currentOrganization.id]);

  // O papel do usuário vem exclusivamente da membership ativa no Firestore.
  // Não existe mais superadmin baseado em e-mail hardcoded.
  // Se o usuário não tiver membership ativa, recebe 'REQUESTER' como fallback mínimo.
  const currentRole: UserRole = currentMembership?.role || 'REQUESTER';

  // Permission Checking Engine — baseado 100% na matriz ROLE_PERMISSIONS
  const hasPermission = (permission: Permission): boolean => {
    if (!currentMembership) {
      // Usuário sem membership ativa: apenas pode criar demandas (acesso mínimo)
      return permission === 'tasks.create';
    }
    const permissions = ROLE_PERMISSIONS[currentRole] || [];
    const granted = permissions.includes(permission);
    if (!granted) {
      // Log Security Audit Event: PERMISSION_DENIED
      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser?.id || 'anonymous',
        userName: currentUser?.name || 'Anônimo',
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

  // Orgs acessíveis: apenas onde o usuário tem membership ACTIVE
  const accessibleOrganizations = useMemo(() => {
    if (!currentUser) return [];
    const userOrgIds = memberships
      .filter((m) => m.userId === currentUser.id && m.status === 'ACTIVE')
      .map((m) => m.organizationId);

    return organizations.filter((o) => userOrgIds.includes(o.id));
  }, [organizations, memberships, currentUser?.id]);

  // Campi acessíveis: depende da membership e do hasOrgWideAccess
  const accessibleCampuses = useMemo(() => {
    if (!currentMembership) return [];

    if (currentMembership.hasOrgWideAccess || currentMembership.role === 'ADMIN') {
      return campuses;
    }
    return campuses.filter((c) => currentMembership.campusIds.includes(c.id));
  }, [campuses, currentMembership]);

  const hasCampusAccess = (campusId?: string | null): boolean => {
    if (!campusId) return true; // null/undefined = visão de toda a organização
    if (!currentMembership) return false;
    if (currentMembership.hasOrgWideAccess || currentMembership.role === 'ADMIN') {
      return true;
    }
    return currentMembership.campusIds.includes(campusId);
  };

  const switchRoleInCurrentOrg = (newRole: UserRole) => {
    if (!currentUser) return;
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
    // Validação centralizada de limites de membros via EntitlementsService
    const currentMembersCount = memberships.filter((m) => m.organizationId === currentOrganization.id).length;
    const check = EntitlementsService.checkMemberLimit(currentOrganization, currentMembersCount);
    if (!check.allowed) {
      notifyError('Limite do plano atingido!', check.message || 'Limite de membros da equipe atingido.');
      return false;
    }

    let user = StorageService.getUsers().find((u) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (!user) {
      user = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: userName,
        email: userEmail,
        tenantId: currentOrganization.id,
        activeOrganizationId: currentOrganization.id,
        organizationIds: [currentOrganization.id],
        createdAt: new Date().toISOString(),
      };
      StorageService.addUser(user);
    } else {
      user = {
        ...user,
        tenantId: user.tenantId || currentOrganization.id,
        activeOrganizationId: user.activeOrganizationId || currentOrganization.id,
        organizationIds: Array.from(new Set([...(user.organizationIds || []), currentOrganization.id])),
      };
      StorageService.updateUser(user);
    }
    // Sync user with Firestore (with tenantId)
    FirestoreRepository.syncUser(user);


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
    // Sync membership with Firestore
    FirestoreRepository.saveMembership(newMem);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Administrador',
      action: `convidou o membro ${userName} (${userEmail}) como ${role}`,
      securityEvent: 'USER_INVITED',
      targetType: 'security',
      targetId: newMem.id,
      targetTitle: `Membro: ${userName}`,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);
    FirestoreRepository.recordActivity(auditLog);

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
      FirestoreRepository.saveMembership(updated);

      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Administrador',
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
      FirestoreRepository.recordActivity(auditLog);

      success('Permissões do membro atualizadas!');
    }
  };

  const updateMemberStatus = (membershipId: string, status: MembershipStatus) => {
    const mem = memberships.find((m) => m.id === membershipId);
    if (mem) {
      const updated: Membership = {
        ...mem,
        status,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = StorageService.updateMembership(updated);
      setMemberships(updatedList);
      FirestoreRepository.saveMembership(updated);

      const auditLog: ActivityLog = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        organizationId: currentOrganization.id,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Administrador',
        action: status === 'SUSPENDED' ? 'suspendeu a função do membro' : 'reativou o acesso do membro',
        securityEvent: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        targetType: 'security',
        targetId: membershipId,
        targetTitle: `Membro ID: ${mem.userId}`,
        timestamp: new Date().toISOString(),
      };
      StorageService.addActivity(auditLog);
      FirestoreRepository.recordActivity(auditLog);

      success(
        status === 'SUSPENDED' ? 'Função suspensa / encerrada' : 'Acesso reativado',
        `Status atualizado para: ${status}`
      );
    }
  };

  const removeMemberFromOrg = (membershipId: string) => {
    const mem = memberships.find((m) => m.id === membershipId || m.userId === membershipId);
    const updated = StorageService.deleteMembership(membershipId);
    setMemberships(updated);
    if (mem) {
      StorageService.deleteUser(mem.userId);
      FirestoreRepository.deleteMembership(currentOrganization.id, mem.userId, mem.id);
    } else {
      StorageService.deleteUser(membershipId);
      FirestoreRepository.deleteMembership(currentOrganization.id, membershipId, membershipId);
    }

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Administrador',
      action: `removeu o vínculo do membro`,
      securityEvent: 'USER_REMOVED',
      targetType: 'security',
      targetId: membershipId,
      targetTitle: `Membro ID: ${mem?.userId || membershipId}`,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);
    FirestoreRepository.recordActivity(auditLog);

    success('Membro e usuário removidos com sucesso do Firestore.');
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
        updateMemberStatus,
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
