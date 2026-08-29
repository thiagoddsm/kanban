import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { AnalyticsService } from '../../services/analyticsService';
import { NavigationTab, Task } from '../../types';
import { TaskModal } from '../kanban/TaskModal';
import { PilotHealthWidget } from './PilotHealthWidget';
import { 
  Plus, 
  Kanban, 
  CalendarDays, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Flame, 
  Users, 
  MessageSquare,
  ChevronRight,
  HelpCircle,
  FolderKanban,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PriorityBadge, DemandTypeBadge, StatusBadge } from '../common/Badge';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenDemandPortal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNavigate, 
  onOpenDemandPortal 
}) => {
  const { currentUser } = useAuth();
  const { tasks, events, users, remindPredecessors, setFilterEventId } = useData();
  const { currentOrganization, currentCampus } = useTenant();
  const { canCreateDemand, canApproveTasks } = useAccess();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPilotSectionOpen, setIsPilotSectionOpen] = useState(false);

  // Compute Metrics
  const overall = useMemo(() => AnalyticsService.getOverallMetrics(tasks, events), [tasks, events]);
  const projectsHealth = useMemo(() => AnalyticsService.getProjectsHealth(events, tasks), [events, tasks]);
  const bottlenecks = useMemo(() => AnalyticsService.getBottlenecks(tasks), [tasks]);
  const teamWorkload = useMemo(() => AnalyticsService.getTeamWorkload(users, tasks), [users, tasks]);

  // Recent active tasks for clean overview
  const recentTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.isArchived && t.status !== 'DONE')
      .slice(0, 5);
  }, [tasks]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => !e.isArchived && e.status !== 'FINISHED')
      .slice(0, 3);
  }, [events]);

  const handleOpenTask = (taskId: string) => {
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      setSelectedTask(t);
      setIsTaskModalOpen(true);
    }
  };

  const firstName = currentUser.name.split(' ')[0] || 'Líder';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar max-w-7xl mx-auto">
      {/* 1. Welcoming Hero & Guided Starting Actions */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          {/* Welcome Text */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Olá, {firstName} 👋
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {currentOrganization.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Bem-vindo ao centro de operações de comunicação e marketing da igreja. Por onde você deseja começar hoje?
            </p>
          </div>

          {/* 3 Clear Guided Action Cards ("Start Here") */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Solicitar Demanda */}
            <div 
              onClick={onOpenDemandPortal}
              className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-600/20 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded-md">
                  Início
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                  Solicitar Demanda
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Precisa de uma arte, vídeo, telão ou cobertura? Abra com briefing guiado.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-indigo-400 group-hover:text-indigo-300 pt-1">
                <span>Abrir Formulário</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Action 2: Ver Quadro Kanban */}
            <div 
              onClick={() => onNavigate('tasks')}
              className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Kanban className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Produção
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                  Quadro de Tarefas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Acompanhe o fluxo da equipe da triagem até a aprovação ({overall.openTasks} ativas).
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-white pt-1">
                <span>Ver Kanban</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Action 3: Eventos & Projetos */}
            <div 
              onClick={() => onNavigate('events')}
              className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Projetos
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                  Eventos & Campanhas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cultos especiais, conferências e séries ({overall.activeEventsCount} projetos).
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-white pt-1">
                <span>Ver Eventos</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Clean, Essential KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ativas */}
        <div 
          onClick={() => onNavigate('tasks')}
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-1 group"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Demandas Ativas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{overall.openTasks}</span>
            <span className="text-xs text-slate-500">em andamento</span>
          </div>
          <span className="text-[11px] text-indigo-400 group-hover:underline block pt-1">Ver todas &rarr;</span>
        </div>

        {/* Em Revisão / Aprovação */}
        <div 
          onClick={() => onNavigate('tasks')}
          className={`p-5 rounded-2xl border transition-all space-y-1 cursor-pointer ${
            overall.reviewTasks > 0
              ? 'bg-purple-950/20 border-purple-500/40 hover:border-purple-500/70'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Aguardando Aprovação</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-300">{overall.reviewTasks}</span>
            <span className="text-xs text-slate-500">entregas</span>
          </div>
          <span className="text-[11px] text-purple-400 block pt-1">Revisão pastoral/líder</span>
        </div>

        {/* Demandas com Atenção (Atrasadas ou Bloqueadas) */}
        <div 
          onClick={() => onNavigate('tasks')}
          className={`p-5 rounded-2xl border transition-all space-y-1 cursor-pointer ${
            overall.overdueTasks > 0 || overall.blockedTasks > 0
              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Requerem Atenção</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400">{overall.overdueTasks + overall.blockedTasks}</span>
            <span className="text-xs text-slate-500">gargalos</span>
          </div>
          <span className="text-[11px] text-rose-400 block pt-1">
            {overall.overdueTasks} atrasadas • {overall.blockedTasks} bloqueadas
          </span>
        </div>

        {/* Conclusão */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Entregas Concluídas</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{overall.completedTasks}</span>
            <span className="text-xs text-slate-500">({overall.completionRate}% taxa)</span>
          </div>
          <span className="text-[11px] text-emerald-400/80 block pt-1">Prontas para uso</span>
        </div>
      </div>

      {/* 3. Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Active Demands & Pilot Health Toggle (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Demands List */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Demandas Recentes em Produção
                </h2>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Ver Quadro Completo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma demanda ativa no momento.</p>
                </div>
              ) : (
                recentTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleOpenTask(t.id)}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-850/40 px-2 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DemandTypeBadge type={t.demandType} size="sm" />
                        <PriorityBadge priority={t.priority} size="sm" />
                        <StatusBadge status={t.status} />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        Resp: <strong className="text-slate-300">{t.assigneeName || 'Não atribuído'}</strong> • Prazo: {new Date(t.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pilot Health & Adoption (Collapsible Card to avoid clutter) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div 
              onClick={() => setIsPilotSectionOpen(!isPilotSectionOpen)}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Métricas de Adoção do Piloto IBM
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 group-hover:text-white">
                  {isPilotSectionOpen ? 'Ocultar detalhes' : 'Ver indicadores do piloto'}
                </span>
                {isPilotSectionOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {isPilotSectionOpen && (
              <div className="pt-2 animate-fade-in">
                <PilotHealthWidget />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Events, Bottlenecks & Team (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Events */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Próximos Eventos
                </h3>
              </div>
              <button
                onClick={() => onNavigate('events')}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                Ver Calendário
              </button>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhum evento agendado.</p>
              ) : (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setFilterEventId(evt.id);
                      onNavigate('tasks');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{evt.title}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 shrink-0">
                        {evt.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Data: {new Date(evt.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} • {evt.location || 'Templo Principal'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Bottlenecks (if any) */}
          {bottlenecks.length > 0 && (
            <div className="bg-slate-900/70 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Flame className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Gargalos Imediatos ({bottlenecks.length})
                </h3>
              </div>

              <div className="space-y-2">
                {bottlenecks.slice(0, 3).map((item) => (
                  <div
                    key={item.taskId}
                    onClick={() => handleOpenTask(item.taskId)}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.taskTitle}</p>
                      <p className="text-[10px] text-slate-400">Resp: {item.assigneeName || 'Não atribuído'}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remindPredecessors(item.taskId);
                      }}
                      className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10"
                      title="Cobrar via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};
