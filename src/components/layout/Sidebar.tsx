import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Kanban, 
  CalendarDays, 
  GanttChartSquare, 
  Calendar, 
  Archive, 
  Users2, 
  X,
  Settings,
  UserCheck,
  HeartHandshake
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAccess } from '../../context/AccessContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { TenantSwitcher } from '../tenants/TenantSwitcher';
import { MyAccountModal } from '../auth/MyAccountModal';

interface SidebarProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface MenuSection {
  title: string;
  items: {
    id: NavigationTab;
    label: string;
    icon: any;
    visible?: boolean;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentRole, isAdmin, canManageMembers, canViewPastoral, isTeam } = useAccess();
  const { currentUser } = useAuth();
  const { currentOrganization } = useTenant();
  const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);

  const sections: MenuSection[] = [
    {
      title: 'Operações & Tarefas',
      items: [
        { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
        { id: 'tasks', label: 'Tarefas (Kanban)', icon: Kanban },
        { id: 'events', label: 'Eventos & Projetos', icon: CalendarDays },
        { id: 'gantt', label: 'Cronograma (Gantt)', icon: GanttChartSquare },
        { id: 'calendar', label: 'Calendário de Atividades', icon: Calendar },
        { id: 'archived', label: 'Arquivados', icon: Archive },
      ],
    },
    {
      title: 'Integração de Membros',
      items: [
        { 
          id: 'members-journey', 
          label: 'Jornada & Acolhimento', 
          icon: UserCheck,
          visible: canManageMembers || isTeam,
          badge: 'Novo'
        },
      ],
    },
    {
      title: 'Cuidado Pastoral',
      items: [
        { 
          id: 'pastoral-care', 
          label: 'Atendimento & Agenda', 
          icon: HeartHandshake,
          visible: canViewPastoral,
          badge: 'Sigilo'
        },
      ],
    },
    {
      title: 'Administração',
      items: [
        { id: 'users', label: 'Usuários & Convites', icon: Users2, visible: isAdmin },
        { id: 'settings', label: 'Configurações & Plano', icon: Settings, visible: isAdmin },
      ],
    },
  ];

  const slug = currentOrganization?.slug || 'minha-igreja';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-64 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header: Brand & Organization Switcher */}
        <div 
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          className="p-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 font-black text-sm">
                O
              </div>
              <div>
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight block leading-none">
                  Oiko Gestão
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Tenant Switcher */}
          <TenantSwitcher variant="sidebar" />
        </div>

        {/* Navigation List Organized by Services */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          {sections.map((sec, secIdx) => {
            const visibleItems = sec.items.filter((it) => it.visible !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={secIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5 block">
                  {sec.title}
                </span>

                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <NavLink
                      key={item.id}
                      to={`/${slug}/${item.id}`}
                      onClick={onCloseMobile}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-600 dark:group-hover:text-indigo-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && !isActive && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          item.badge === 'Sigilo'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Footer with Role */}
        <div 
          onClick={() => setIsMyAccountOpen(true)}
          className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 cursor-pointer transition-colors group"
          title="Clique para abrir Minha Conta & Perfil"
        >
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Membro'}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-500/30 dark:ring-indigo-500/30 group-hover:ring-brand-500 dark:group-hover:ring-indigo-400 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-indigo-300 truncate transition-colors">{currentUser?.name || 'Membro'}</p>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-brand-100 text-brand-700 dark:bg-indigo-500/20 dark:text-indigo-300 uppercase">
                  {currentRole}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal Minha Conta & Perfil */}
      <MyAccountModal
        isOpen={isMyAccountOpen}
        onClose={() => setIsMyAccountOpen(false)}
      />
    </>
  );
};
