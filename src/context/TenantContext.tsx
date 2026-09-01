import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, Campus, TenantPlan, OrganizationBranding, ActivityLog, Membership } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { EntitlementsService } from '../services/entitlementsService';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

interface TenantContextType {
  organizations: Organization[];
  currentOrganization: Organization;
  campuses: Campus[];
  currentCampus: Campus | null; // null = 'Toda a Organização / Todos os Campi'
  switchOrganization: (orgId: string) => void;
  switchOrganizationBySlug: (slug: string) => boolean;
  switchCampus: (campusId: string | null) => void;
  createOrganization: (name: string, slug: string, mainCampusName: string, city: string, plan?: TenantPlan) => Organization;
  updateOrganization: (orgId: string, data: Partial<Organization>) => void;
  deleteOrganization: (orgId: string) => boolean;
  createCampus: (name: string, code: string, city: string, address?: string) => Campus | null;
  updateCampus: (campusId: string, data: Partial<Campus>) => void;
  deleteCampus: (campusId: string) => boolean;
  updateOrganizationBranding: (branding: Partial<OrganizationBranding>) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const ACTIVE_ORG_KEY = 'marketing_active_organization_id_v4_clean';
const ACTIVE_CAMPUS_KEY = 'marketing_active_campus_id_v4_clean';

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { success, warning, error: notifyError } = useNotification();

  const [organizations, setOrganizations] = useState<Organization[]>(() => StorageService.getOrganizations());
  
  // Tenant Resolver: o slug da organização vem do param de URL /:orgSlug (gerenciado pelo Layout).
  // O estado inicial lê apenas o localStorage como fallback até o Layout sincronizar.
  const [currentOrganization, setCurrentOrganization] = useState<Organization>(() => {
    const orgs = StorageService.getOrganizations();
    const savedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
    const found = orgs.find((o) => o.id === savedOrgId);
    return found || orgs[0];
  });

  const [campuses, setCampuses] = useState<Campus[]>(() => {
    return StorageService.getCampuses(currentOrganization.id);
  });

  const [currentCampus, setCurrentCampus] = useState<Campus | null>(() => {
    const savedCampId = localStorage.getItem(ACTIVE_CAMPUS_KEY);
    if (!savedCampId || savedCampId === 'all') return null;
    const orgCampuses = StorageService.getCampuses(currentOrganization.id);
    return orgCampuses.find((c) => c.id === savedCampId) || null;
  });

  // Initial sync & Realtime listener for Organizations
  useEffect(() => {
    FirestoreRepository.fetchOrganizations().then((remoteOrgs) => {
      if (remoteOrgs && remoteOrgs.length > 0) {
        setOrganizations(remoteOrgs);
        remoteOrgs.forEach((o) => StorageService.updateOrganization(o));
      }
    });

    const unsubOrgs = FirestoreRepository.subscribeOrganizations((remoteOrgs) => {
      if (remoteOrgs && remoteOrgs.length > 0) {
        setOrganizations(remoteOrgs);
        remoteOrgs.forEach((o) => StorageService.updateOrganization(o));
      }
    });

    return () => unsubOrgs();
  }, []);

  // Keep campuses in sync when organization changes + Realtime listener
  useEffect(() => {
    if (!currentOrganization.id) return;

    FirestoreRepository.fetchCampuses(currentOrganization.id).then((remoteCampuses) => {
      if (remoteCampuses && remoteCampuses.length > 0) {
        setCampuses(remoteCampuses);
        remoteCampuses.forEach((c) => StorageService.updateCampus(c));
      } else {
        const orgCampuses = StorageService.getCampuses(currentOrganization.id);
        setCampuses(orgCampuses);
      }
    });

    const unsubCampuses = FirestoreRepository.subscribeCampuses(currentOrganization.id, (remoteCampuses) => {
      if (remoteCampuses && remoteCampuses.length >= 0) {
        setCampuses(remoteCampuses);
        remoteCampuses.forEach((c) => StorageService.updateCampus(c));
      }
    });

    if (currentCampus && currentCampus.organizationId !== currentOrganization.id) {
      setCurrentCampus(null);
      localStorage.setItem(ACTIVE_CAMPUS_KEY, 'all');
    }

    return () => unsubCampuses();
  }, [currentOrganization.id]);

  const switchOrganization = (orgId: string, silent: boolean = false) => {
    const org = organizations.find((o) => o.id === orgId || o.slug === orgId);
    if (org) {
      if (currentOrganization.id !== org.id) {
        setCurrentOrganization(org);
        localStorage.setItem(ACTIVE_ORG_KEY, org.id);
        setCurrentCampus(null);
        localStorage.setItem(ACTIVE_CAMPUS_KEY, 'all');
        if (!silent) {
          success(`Organização alterada para: ${org.name}`);
        }
      }
    }
  };

  const switchOrganizationBySlug = (slug: string): boolean => {
    const org = organizations.find(
      (o) => o.slug.toLowerCase() === slug.toLowerCase() || o.id.toLowerCase() === slug.toLowerCase()
    );
    if (org) {
      switchOrganization(org.id, true);
      return true;
    }
    return false;
  };


  const switchCampus = (campusId: string | null) => {
    if (!campusId || campusId === 'all') {
      setCurrentCampus(null);
      localStorage.setItem(ACTIVE_CAMPUS_KEY, 'all');
      success(`Escopo: Toda a Organização (${currentOrganization.name})`);
    } else {
      const camp = campuses.find((c) => c.id === campusId);
      if (camp) {
        setCurrentCampus(camp);
        localStorage.setItem(ACTIVE_CAMPUS_KEY, camp.id);
        success(`Escopo: ${camp.name}`);
      }
    }
  };

  const createOrganization = (
    name: string,
    slug: string,
    mainCampusName: string,
    city: string,
    plan: TenantPlan = 'PRO'
  ): Organization => {
    const orgId = 'org_' + slug.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36).substring(2, 5);

    const newOrg: Organization = {
      id: orgId,
      name,
      slug,
      branding: {
        primaryColor: '#4f46e5',
        secondaryColor: '#818cf8',
      },
      subscription: {
        organizationId: orgId,
        plan,
        status: 'ACTIVE',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      limits: {
        maxMembers: plan === 'PRO' ? 50 : 15,
        maxCampuses: plan === 'PRO' ? 10 : 2,
        maxEvents: plan === 'PRO' ? 100 : 20,
        maxTasks: plan === 'PRO' ? 1000 : 200,
        storageGB: plan === 'PRO' ? 50 : 10,
        customBranding: true,
        advancedReports: plan === 'PRO',
        gantt: true,
        apiAccess: plan === 'PRO',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create Main Campus
    const mainCampus: Campus = {
      id: 'camp_' + orgId + '_sede',
      organizationId: orgId,
      name: mainCampusName || 'Sede',
      code: 'SEDE',
      city,
      isMainCampus: true,
      createdAt: new Date().toISOString(),
    };

    // Save Locally & Cloud
    const updatedOrgs = StorageService.addOrganization(newOrg);
    StorageService.addCampus(mainCampus);

    const membership: Membership = {
      id: 'mem_' + currentUser.id + '_' + orgId,
      userId: currentUser.id,
      organizationId: orgId,
      hasOrgWideAccess: true,
      campusIds: [],
      role: 'ADMIN',
      department: 'Diretoria Geral',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.addMembership(membership);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: orgId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `criou a organização ${name} (Plano ${plan})`,
      securityEvent: 'MEMBERSHIP_CREATED',
      targetType: 'organization',
      targetId: orgId,
      targetTitle: name,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);

    // Sync to Cloud Firestore in Real-Time
    FirestoreRepository.saveOrganization(newOrg);
    FirestoreRepository.saveCampus(mainCampus);
    FirestoreRepository.saveMembership(membership);
    FirestoreRepository.recordActivity(auditLog);

    setOrganizations(updatedOrgs);
    setCurrentOrganization(newOrg);
    setCampuses([mainCampus]);
    setCurrentCampus(null);

    success(`Organização ${name} criada com sucesso!`);
    return newOrg;
  };

  const updateOrganization = (orgId: string, data: Partial<Organization>) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;

    const updatedOrg: Organization = {
      ...org,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const updatedOrgs = StorageService.updateOrganization(updatedOrg);
    FirestoreRepository.saveOrganization(updatedOrg);
    setOrganizations(updatedOrgs);

    if (currentOrganization.id === orgId) {
      setCurrentOrganization(updatedOrg);
    }

    success(`Organização "${updatedOrg.name}" atualizada!`);
  };

  const deleteOrganization = (orgId: string): boolean => {
    if (organizations.length <= 1) {
      notifyError('Ação não permitida', 'Você não pode excluir a única organização cadastrada.');
      return false;
    }

    const orgToDelete = organizations.find((o) => o.id === orgId);
    const updatedOrgs = StorageService.deleteOrganization(orgId);
    FirestoreRepository.deleteOrganization(orgId);
    setOrganizations(updatedOrgs);

    if (currentOrganization.id === orgId) {
      const nextOrg = updatedOrgs[0];
      setCurrentOrganization(nextOrg);
      localStorage.setItem(ACTIVE_ORG_KEY, nextOrg.id);
      setCurrentCampus(null);
      localStorage.setItem(ACTIVE_CAMPUS_KEY, 'all');
    }

    success(`Organização "${orgToDelete?.name || orgId}" excluída com sucesso.`);
    return true;
  };

  const createCampus = (name: string, code: string, city: string, address?: string): Campus | null => {
    // Validação centralizada de limites do plano via EntitlementsService
    const check = EntitlementsService.checkCampusLimit(currentOrganization, campuses.length);
    if (!check.allowed) {
      notifyError('Limite de Campi atingido!', check.message || 'Limite de campi atingido para o plano atual.');
      return null;
    }

    const newCampus: Campus = {
      id: 'camp_' + currentOrganization.id + '_' + Date.now().toString(36),
      organizationId: currentOrganization.id,
      name,
      code: code.toUpperCase(),
      city,
      address,
      isMainCampus: campuses.length === 0,
      createdAt: new Date().toISOString(),
    };

    const updated = StorageService.addCampus(newCampus);
    FirestoreRepository.saveCampus(newCampus);
    setCampuses(updated);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      campusId: newCampus.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `cadastrou o campus ${name} (${code})`,
      securityEvent: 'CAMPUS_CREATED',
      targetType: 'security',
      targetId: newCampus.id,
      targetTitle: `Campus: ${name}`,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);
    FirestoreRepository.recordActivity(auditLog);

    success(`Novo campus criado: ${name}`);
    return newCampus;
  };

  const updateCampus = (campusId: string, data: Partial<Campus>) => {
    const camp = campuses.find((c) => c.id === campusId);
    if (!camp) return;

    const updatedCampus: Campus = {
      ...camp,
      ...data,
      organizationId: currentOrganization.id,
    };

    const updated = StorageService.updateCampus(updatedCampus);
    FirestoreRepository.saveCampus(updatedCampus);
    setCampuses(updated);

    if (currentCampus?.id === campusId) {
      setCurrentCampus(updatedCampus);
    }

    success(`Campus "${updatedCampus.name}" atualizado com sucesso!`);
  };

  const deleteCampus = (campusId: string): boolean => {
    const campToDelete = campuses.find((c) => c.id === campusId);
    const updated = StorageService.deleteCampus(currentOrganization.id, campusId);
    FirestoreRepository.deleteCampus(currentOrganization.id, campusId);
    setCampuses(updated);

    if (currentCampus?.id === campusId) {
      setCurrentCampus(null);
      localStorage.setItem(ACTIVE_CAMPUS_KEY, 'all');
    }

    success(`Campus "${campToDelete?.name || campusId}" excluído com sucesso.`);
    return true;
  };

  const updateOrganizationBranding = (branding: Partial<OrganizationBranding>) => {
    const updatedOrg: Organization = {
      ...currentOrganization,
      branding: {
        ...currentOrganization.branding,
        ...branding,
      },
      updatedAt: new Date().toISOString(),
    };

    const updatedOrgs = StorageService.updateOrganization(updatedOrg);
    FirestoreRepository.saveOrganization(updatedOrg);
    setOrganizations(updatedOrgs);
    setCurrentOrganization(updatedOrg);

    const auditLog: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      organizationId: currentOrganization.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'atualizou a identidade visual / branding da organização',
      securityEvent: 'ORGANIZATION_UPDATED',
      targetType: 'organization',
      targetId: currentOrganization.id,
      targetTitle: currentOrganization.name,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);
    FirestoreRepository.recordActivity(auditLog);

    success('Identidade visual da organização atualizada!');
  };

  return (
    <TenantContext.Provider
      value={{
        organizations,
        currentOrganization,
        campuses,
        currentCampus,
        switchOrganization,
        switchOrganizationBySlug,
        switchCampus,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        createCampus,
        updateCampus,
        deleteCampus,
        updateOrganizationBranding,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
