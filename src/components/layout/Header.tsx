import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { NotificationService } from '../../services/notificationService';
import { FirestoreRepository } from '../../services/firestoreRepository';
import { RoleSwitcher } from '../auth/RoleSwitcher';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { ApprovalCenterModal } from '../approvals/ApprovalCenterModal';
import { DailyDigestModal } from '../notifications/DailyDigestModal';
import { AutomationRulesModal } from '../automations/AutomationRulesModal';
import { QAModal } from '../testing/QAModal';
import { TaskModal } from '../kanban/TaskModal';
import { Task, NavigationTab } from '../../types';
import { 
  Bell, 
  Search, 
  Plus, 
  Menu, 
  ShieldCheck, 
  Sun,
  Zap,
  Settings,
  MoreVertical,
  Layers,
  Sparkles,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenDemandPortal: () => void;
  onNavigate?: (tab: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenDemandPortal,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const { canApproveTasks, isLeader, canCreateDemand, isAdmin } = useAccess();
  const { currentOrganization, currentCampus } = useTenant();
  const { searchQuery, setSearchQuery, tasks } = useData();

  // Modals state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(() =>
    NotificationService.getUnreadCount(currentOrganization.id, currentUser.id)
  );

  useEffect(() => {
    if (!currentOrganization.id || !currentUser.id) return;

    // Sincronização inicial do Firestore
    NotificationService.syncFromFirestore(currentOrganization.id, currentUser.id).then(() => {
      setUnreadNotifCount(NotificationService.getUnreadCount(currentOrganization.id, currentUser.id));
    });

    // Realtime Firestore subscription para notificações
    const unsub = FirestoreRepository.subscribeNotifications(
      currentOrganization.id,
      currentUser.id,
      (remoteNotifs) => {
        const key = `marketing_notifications_${currentOrganization.id}_v4_clean`;
        localStorage.setItem(key, JSON.stringify(remoteNotifs));
        setUnreadNotifCount(remoteNotifs.filter((n) => !n.readAt).length);
      }
    );

    const handleUpdate = () => {
      setUnreadNotifCount(NotificationService.getUnreadCount(currentOrganization.id, currentUser.id));
    };
    window.addEventListener('marketing_notifications_updated', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('marketing_notifications_updated', handleUpdate);
    };
  }, [currentOrganization.id, currentUser.id]);


  const pendingApprovalsCount = tasks.filter((t) => !t.isArchived && t.status === 'REVIEW').length;

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
        {/* Left: Mobile Menu & Current Context Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">
              {currentOrganization.name}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {currentCampus ? currentCampus.name : 'Todos os Campi'}
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar demandas, tarefas, pessoas ou eventos..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pending Approvals (Badge if pending) */}
          {canApproveTasks && pendingApprovalsCount > 0 && (
            <button
              onClick={() => setIsApprovalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all flex items-center gap-1.5 text-xs font-bold animate-pulse"
              title="Aprovações Pendentes"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Aprovações</span>
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-black">
                {pendingApprovalsCount}
              </span>
            </button>
          )}

          {/* Tools & Utilities Dropdown Menu (Consolidated) */}
          <div className="relative">
            <button
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                isToolsMenuOpen ? 'bg-slate-800 text-white' : ''
              }`}
              title="Ferramentas e Resumo"
            >
              <Settings className="w-4 h-4" />
            </button>

            {isToolsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsToolsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-40 animate-fade-in text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                    Ferramentas & Ajustes
                  </div>

                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onNavigate?.('settings');
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors font-medium text-indigo-300"
                  >
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <span>Configurações da Igreja & Listas</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsDigestOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Resumo do Dia (Digest)</span>
                  </button>

                  {isLeader && (
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsAutomationOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>Regras de Automação</span>
                    </button>
                  )}

                  {canApproveTasks && (
                    <button
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsApprovalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>Centro de Aprovações</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsQAOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Backup & Diagnóstico</span>
                  </button>

                  <div className="pt-1 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.reload();
                      }}
                      className="w-full px-3.5 py-2 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>Limpar Cache & Recarregar</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white transition-all text-xs font-semibold relative"
            title="Central de Notificações"
          >
            <div className="relative">
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <span className="hidden md:inline text-xs">Notificações</span>
            {unreadNotifCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* Primary CTA: Nova Solicitação */}
          {canCreateDemand && (
            <button
              onClick={onOpenDemandPortal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Demanda</span>
            </button>
          )}

          {/* Role & Persona Switcher */}
          <RoleSwitcher />
        </div>
      </header>

      {/* Modals */}
      <NotificationCenterModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onOpenApprovals={() => setIsApprovalOpen(true)}
        onOpenTask={handleOpenTask}
      />

      <ApprovalCenterModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onSelectTask={handleOpenTask}
      />

      <DailyDigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        onNavigate={onNavigate || (() => {})}
      />

      <AutomationRulesModal
        isOpen={isAutomationOpen}
        onClose={() => setIsAutomationOpen(false)}
      />

      <QAModal
        isOpen={isQAOpen}
        onClose={() => setIsQAOpen(false)}
      />

      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </>
  );
};
