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
import { DemandPortalModal } from '../demands/DemandPortalModal';
import { AcceptInviteModal } from '../users/AcceptInviteModal';
import { ToastContainer } from '../common/Toast';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';

const VALID_TABS: NavigationTab[] = [
  'dashboard', 'tasks', 'events', 'gantt', 'calendar', 'archived', 'users', 'settings',
];

export const Layout: React.FC = () => {
  const { orgSlug, tab } = useParams<{ orgSlug: string; tab: string }>();
  const navigate = useNavigate();
  const { currentUser, isLoadingAuth } = useAuth();
  const { currentOrganization, switchOrganizationBySlug } = useTenant();

  // Guard de Autenticação: redireciona para /login se a sessão não existir
  React.useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [isLoadingAuth, currentUser, navigate]);

  // Resolver a organização pelo slug da URL ao montar/mudar
  React.useEffect(() => {
    if (orgSlug && orgSlug !== currentOrganization.slug) {
      const found = switchOrganizationBySlug(orgSlug);
      if (!found) {
        // Slug não encontrado — redireciona para a org padrão
        navigate(`/${currentOrganization.slug}/dashboard`, { replace: true });
      }
    }
  }, [orgSlug]);

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

  // Splash Screen de Carregamento Seguro
  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 animate-pulse">
            <span className="font-black text-xl">O</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={navigateToTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 overflow-hidden">
        <Header
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDemandPortal={() => setIsDemandPortalOpen(true)}
          onNavigate={navigateToTab}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={navigateToTab}
              onOpenDemandPortal={() => setIsDemandPortalOpen(true)}
            />
          )}
          {activeTab === 'tasks' && <KanbanBoard />}
          {activeTab === 'events' && <EventsView onNavigate={navigateToTab} />}
          {activeTab === 'gantt' && <GanttView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'archived' && <ArchivedView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Demand Portal Wizard (Pipefy style) */}
      <DemandPortalModal
        isOpen={isDemandPortalOpen}
        onClose={() => setIsDemandPortalOpen(false)}
      />

      {/* Accept Invitation Interceptor */}
      <AcceptInviteModal />

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
};
