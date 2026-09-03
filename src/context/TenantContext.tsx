import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Organization, Campus, TenantPlan, OrganizationBranding, ActivityLog, Membership, Task, ChurchEvent, Comment } from '../types';


import { StorageService } from '../services/storageService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { EntitlementsService } from '../services/entitlementsService';
import { DEMAND_TYPES, DEFAULT_EVENT_CATEGORIES, DEFAULT_DEPARTMENTS, INITIAL_ORGANIZATIONS } from '../services/mockData';
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
  createOrganization: (
    name: string, 
    slug: string, 
    mainCampusName: string, 
    city: string, 
    plan?: TenantPlan, 
    creatorUser?: User | null | void
  ) => Organization;


  findAndSwitchUserOrg: (userId: string) => Promise<Organization | null>;
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
    const found = orgs.find((o) => o?.id === savedOrgId);
    return found || orgs[0] || INITIAL_ORGANIZATIONS[0];
  });

  const [campuses, setCampuses] = useState<Campus[]>(() => {
    return StorageService.getCampuses(currentOrganization?.id || INITIAL_ORGANIZATIONS[0].id);
  });

  const [currentCampus, setCurrentCampus] = useState<Campus | null>(() => {
    const savedCampId = localStorage.getItem(ACTIVE_CAMPUS_KEY);
    if (!savedCampId || savedCampId === 'all') return null;
    const orgCampuses = StorageService.getCampuses(currentOrganization?.id || INITIAL_ORGANIZATIONS[0].id);
    return orgCampuses.find((c) => c.id === savedCampId) || null;
  });

  // Initial sync & Realtime listener for Organizations
  useEffect(() => {
    FirestoreRepository.fetchOrganizations().then((remoteOrgs) => {
      if (remoteOrgs && remoteOrgs.length > 0) {
        setOrganizations(remoteOrgs);
        remoteOrgs.forEach((o) => StorageService.updateOrganization(o));
      }
      // Auto-backfill: assegura que qualquer usuário pré-existente sem tenantId receba seu tenant no Firestore
      FirestoreRepository.backfillMissingUserTenants();
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
    plan: TenantPlan = 'PRO',
    creatorUser?: User | null | void
  ): Organization => {


    const adminUser = creatorUser || currentUser;
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
      id: 'mem_' + adminUser.id + '_' + orgId,
      userId: adminUser.id,
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
      userId: adminUser.id,
      userName: adminUser.name,
      action: `criou a organização ${name} (Plano ${plan})`,
      securityEvent: 'MEMBERSHIP_CREATED',
      targetType: 'organization',
      targetId: orgId,
      targetTitle: name,
      timestamp: new Date().toISOString(),
    };
    StorageService.addActivity(auditLog);

    // Initial Event / Project
    const initialEvent: ChurchEvent = {
      id: 'evt_' + orgId + '_inaugural',
      organizationId: orgId,
      title: 'Planejamento Estratégico & Implantação',
      description: `Projeto inicial para a implantação e operação integrada de ${name}.`,
      category: 'OUTRO',
      status: 'PLANNING',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      location: mainCampus.name,
      campusId: mainCampus.id,
      campusName: mainCampus.name,
      leaderId: adminUser.id,
      leaderName: adminUser.name,
      teamIds: [adminUser.id],
      bannerColor: 'from-indigo-600 to-purple-600',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.addEvent(initialEvent);

    // Initial Task / Demand
    const initialTask: Task = {
      id: 'tsk_' + orgId + '_welcome',
      organizationId: orgId,
      campusId: mainCampus.id,
      campusName: mainCampus.name,
      title: 'Configurar equipe, congregações e primeiras demandas da igreja',
      description: 'Seja bem-vindo ao Oiko Gestão! Convide seus líderes no menu Usuários & Convites e comece a registrar suas demandas operacionais.',
      status: 'INBOX',
      priority: 'HIGH',
      demandType: 'EVENTO',
      eventId: initialEvent.id,
      eventName: initialEvent.title,
      requesterId: adminUser.id,
      requesterName: adminUser.name,
      assigneeIds: [adminUser.id],
      assigneeId: adminUser.id,
      assigneeName: adminUser.name,
      requestedAt: new Date().toISOString(),
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      effortEstimate: 'Médio',
      tags: ['Implantação', 'Configuração'],
      attachmentLinks: [],
      dependencies: [],
      checklist: [
        { id: 'chk_1', text: 'Convidar pastores e líderes de ministérios', completed: false },
        { id: 'chk_2', text: 'Cadastrar outras congregações / campi se houver', completed: false },
        { id: 'chk_3', text: 'Abrir a primeira solicitação no botão Solicitar Demanda', completed: false }
      ],
      commentsCount: 1,
      isArchived: false,
      createdBy: adminUser.id,
      createdByName: adminUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.addTask(initialTask);

    // Initial Comment
    const initialComment: Comment = {
      id: 'cmt_' + orgId + '_welcome',
      organizationId: orgId,
      taskId: initialTask.id,
      userId: adminUser.id,
      userName: adminUser.name,
      userAvatar: adminUser.avatar,
      userRole: 'ADMIN',
      content: 'Bem-vindo ao Oiko Gestão Integrada! Use este espaço para alinhar detalhes, briefing e anexos com sua equipe.',
      createdAt: new Date().toISOString(),
    };
    StorageService.addComment(initialComment);

    // Initial Config
    StorageService.saveDemandTypes(orgId, DEMAND_TYPES);
    StorageService.saveEventCategories(orgId, DEFAULT_EVENT_CATEGORIES as any);
    StorageService.saveDepartments(orgId, DEFAULT_DEPARTMENTS);

    // Sync ALL to Cloud Firestore in Real-Time
    FirestoreRepository.saveOrganization(newOrg);
    FirestoreRepository.saveCampus(mainCampus);
    FirestoreRepository.saveMembership(membership);
    FirestoreRepository.recordActivity(auditLog);
    FirestoreRepository.saveEvent(initialEvent);
    FirestoreRepository.saveTask(initialTask);
    FirestoreRepository.saveComment(initialComment);
    FirestoreRepository.saveOrgConfig(orgId, {
      demandTypes: DEMAND_TYPES,
      eventCategories: DEFAULT_EVENT_CATEGORIES as any,
      departments: DEFAULT_DEPARTMENTS,
    });

    setOrganizations(updatedOrgs);
    setCurrentOrganization(newOrg);
    setCampuses([mainCampus]);
    setCurrentCampus(null);

    success(`Organização ${name} criada com sucesso!`);
    return newOrg;
  };

  const findAndSwitchUserOrg = async (userId: string): Promise<Organization | null> => {
    // 1. Procurar nas memberships locais
    const allMemberships = StorageService.getMemberships();
    const userMem = allMemberships.find((m) => m.userId === userId && m.status === 'ACTIVE');
    if (userMem) {
      const org = organizations.find((o) => o.id === userMem.organizationId);
      if (org) {
        switchOrganization(org.id, true);
        return org;
      }
    }

    // 2. Se não encontrou nas memberships locais, verificar no Firestore
    try {
      const remoteOrgs = await FirestoreRepository.fetchOrganizations();
      if (remoteOrgs && remoteOrgs.length > 0) {
        setOrganizations(remoteOrgs);
        for (const org of remoteOrgs) {
          const mems = await FirestoreRepository.fetchMemberships(org.id);
          if (mems && mems.some((m) => m.userId === userId && m.status === 'ACTIVE')) {
            switchOrganization(org.id, true);
            return org;
          }
        }
        // Fallback: primeira org da lista
        switchOrganization(remoteOrgs[0].id, true);
        return remoteOrgs[0];
      }
    } catch (e) {
      console.warn('Erro ao resolver organização do usuário no Firestore:', e);
    }

    return currentOrganization;
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
        findAndSwitchUserOrg,
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
