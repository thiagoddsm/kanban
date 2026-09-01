import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  CalendarDays, 
  GanttChartSquare, 
  Calendar, 
  Archive, 
  Users2, 
  X,
  Sparkles,
  MapPin,
  Layers,
  HelpCircle,
  Settings
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAccess } from '../../context/AccessContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { TenantSwitcher } from '../tenants/TenantSwitcher';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentRole, isAdmin } = useAccess();
  const { currentUser } = useAuth();
  const { currentOrganization, currentCampus } = useTenant();

  // Menu items:
  // 1. Painel, 2. Tarefas, 3. Eventos, 4. Gantt, 5. Calendário, 6. Arquivados, 7. Usuários, 8. Configurações
  const menuItems: { id: NavigationTab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tarefas (Kanban)', icon: Kanban },
    { id: 'events', label: 'Eventos & Projetos', icon: CalendarDays },
    { id: 'gantt', label: 'Cronograma (Gantt)', icon: GanttChartSquare },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'archived', label: 'Arquivados', icon: Archive },
    { id: 'users', label: 'Usuários & Convites', icon: Users2, adminOnly: true },
    { id: 'settings', label: 'Configurações & Listas', icon: Settings, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header: Brand & Organization Switcher */}
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 font-black text-sm">
                O
              </div>
              <div>
                <span className="text-sm font-black text-white tracking-tight block leading-none">
                  Oiko Gestão
                </span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  Tarefas & Operações
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Tenant Switcher */}
          <TenantSwitcher variant="sidebar" />
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1 block">
            Módulos Principais
          </span>

          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer with Role */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                  {currentRole}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
