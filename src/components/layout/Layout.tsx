import React, { useState } from 'react';
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

export const Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDemandPortalOpen, setIsDemandPortalOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 overflow-hidden">
        <Header
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDemandPortal={() => setIsDemandPortalOpen(true)}
          onNavigate={setActiveTab}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveTab}
              onOpenDemandPortal={() => setIsDemandPortalOpen(true)}
            />
          )}
          {activeTab === 'tasks' && <KanbanBoard />}
          {activeTab === 'events' && <EventsView onNavigate={setActiveTab} />}
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
