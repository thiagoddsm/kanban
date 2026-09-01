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

const VALID_TABS: NavigationTab[] = [
  'dashboard', 'tasks', 'events', 'gantt', 'calendar', 'archived', 'users', 'settings',
];

export const Layout: React.FC = () => {
  const { orgSlug, tab } = useParams<{ orgSlug: string; tab: string }>();
  const navigate = useNavigate();
  const { currentOrganization, switchOrganizationBySlug } = useTenant();

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
