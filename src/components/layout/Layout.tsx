import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavigationTab } from '../../types';
import { DashboardView } from '../dashboard/DashboardView';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { EventsView } from '../events/EventsView';
import { GanttView } from '../gantt/GanttView';
import { CalendarView } from '../calendar/CalendarView';
import { ArchivedView } from '../archived/ArchivedView';
import { UsersView } from '../users/UsersView';
import { SettingsView } from '../settings/SettingsView';
import { MemberJourneyBoard } from '../members/MemberJourneyBoard';
import { PastoralCareView } from '../pastoral/PastoralCareView';
import { NewDemandModal } from '../kanban/NewDemandModal';
import { AcceptInviteModal } from '../users/AcceptInviteModal';
import { MyAccountModal } from '../auth/MyAccountModal';
import { TrialExpiredModal } from '../subscription/TrialExpiredModal';
import { BottomNav } from './BottomNav';
import { TrialBanner } from './TrialBanner';
import { ToastContainer } from '../common/Toast';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';

const VALID_TABS: NavigationTab[] = [
  'dashboard', 'tasks', 'events', 'gantt', 'calendar', 'archived', 'members-journey', 'pastoral-care', 'users', 'settings',
];

export const Layout: React.FC = () => {
  const { orgSlug, tab } = useParams<{ orgSlug: string; tab: string }>();
  const navigate = useNavigate();
  const { currentUser, isLoadingAuth } = useAuth();
  const { isAdmin, canViewPastoral } = useAccess();
  const { 
    organizations,
    currentOrganization, 
    switchOrganizationBySlug,
    isTrialExpired,
    isTrialModalOpen,
    openTrialExpiredModal,
    closeTrialExpiredModal
  } = useTenant();

  // Guard de Autenticação: redireciona para /login se a sessão não existir
  React.useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [isLoadingAuth, currentUser, navigate]);

  // Guard de Autorização RBAC: impede que não-admins ou usuários sem permissão acessem abas restritas
  React.useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      if ((tab === 'users' || tab === 'settings') && !isAdmin) {
        navigate(`/${currentOrganization.slug}/dashboard`, { replace: true });
      }
      if (tab === 'pastoral-care' && !canViewPastoral) {
        navigate(`/${currentOrganization.slug}/dashboard`, { replace: true });
      }
    }
  }, [tab, isAdmin, canViewPastoral, isLoadingAuth, currentUser, currentOrganization.slug, navigate]);

  // Resolver a organização pelo slug da URL ao montar/mudar
  React.useEffect(() => {
    if (orgSlug && orgSlug !== currentOrganization.slug) {
      const found = switchOrganizationBySlug(orgSlug);
      if (!found && organizations.length > 0) {
        // Slug não encontrado após carga das organizações — redireciona para a org padrão
        navigate(`/${currentOrganization.slug}/dashboard`, { replace: true });
      }
    }
  }, [orgSlug, currentOrganization.slug, organizations.length]);

  // Deriva a aba ativa do param de URL, validando contra as tabs conhecidas
  const activeTab: NavigationTab =
    tab && VALID_TABS.includes(tab as NavigationTab)
      ? (tab as NavigationTab)
      : 'dashboard';

  // Navegação programática via URL — substitui o antigo setActiveTab
  const navigateToTab = (newTab: NavigationTab) => {
    const slug = orgSlug || currentOrganization.slug;
    navigate(`/${slug}/${newTab}`);
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDemandPortalOpen, setIsDemandPortalOpen] = useState(false);
  const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);

  // Avisa suavemente sobre expiração do trial uma vez por sessão ao acessar o painel
  React.useEffect(() => {
    if (isTrialExpired && currentOrganization?.id) {
      const sessionKey = `trial_expired_prompt_${currentOrganization.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        openTrialExpiredModal();
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [isTrialExpired, currentOrganization?.id]);

  const handleOpenDemandPortal = () => {
    if (isTrialExpired) {
      openTrialExpiredModal();
    } else {
      setIsDemandPortalOpen(true);
    }
  };

  // Splash Screen de Carregamento Seguro
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30 animate-pulse">
            <span className="font-black text-xl">O</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            <span>Validando sessão segura...</span>
          </div>
        </div>
      </div>
    );
  }

  // Se deslogado, evita flash de tela antes do redirecionamento
  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={navigateToTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 overflow-hidden">
        <TrialBanner />
        <Header
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDemandPortal={handleOpenDemandPortal}
          onNavigate={navigateToTab}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative pb-20 lg:pb-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={navigateToTab}
              onOpenDemandPortal={handleOpenDemandPortal}
            />
          )}
          {activeTab === 'tasks' && <KanbanBoard />}
          {activeTab === 'events' && <EventsView onNavigate={navigateToTab} />}
          {activeTab === 'gantt' && <GanttView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'archived' && <ArchivedView />}
          {activeTab === 'members-journey' && <MemberJourneyBoard />}
          {activeTab === 'pastoral-care' && canViewPastoral && <PastoralCareView />}
          {activeTab === 'users' && isAdmin && <UsersView />}
          {activeTab === 'settings' && isAdmin && <SettingsView />}
        </main>
      </div>

      {/* Bottom Navigation for Mobile Devices */}
      <BottomNav
        activeTab={activeTab}
        onNavigate={navigateToTab}
        onOpenDemandPortal={handleOpenDemandPortal}
        onOpenMyAccount={() => setIsMyAccountOpen(true)}
      />

      {/* Modal Interno Ágil de Nova Demanda */}
      <NewDemandModal
        isOpen={isDemandPortalOpen}
        onClose={() => setIsDemandPortalOpen(false)}
      />

      {/* Modal de Período de Teste Expirado (Paywall Amigável) */}
      <TrialExpiredModal
        isOpen={isTrialModalOpen}
        onClose={closeTrialExpiredModal}
      />

      {/* Accept Invitation Interceptor */}
      <AcceptInviteModal />

      {/* My Account Modal */}
      <MyAccountModal
        isOpen={isMyAccountOpen}
        onClose={() => setIsMyAccountOpen(false)}
      />

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};
