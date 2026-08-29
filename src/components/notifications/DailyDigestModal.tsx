import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { AnalyticsService } from '../../services/analyticsService';
import { 
  X, 
  Sun, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Flame,
  Layers
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface DailyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const DailyDigestModal: React.FC<DailyDigestModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const { currentUser } = useAuth();
  const { currentOrganization, currentCampus } = useTenant();
  const { tasks, events } = useData();

  const overall = AnalyticsService.getOverallMetrics(tasks, events);
  const bottlenecks = AnalyticsService.getBottlenecks(tasks);
  const upcomingEvents = events.filter((e) => !e.isArchived && e.status !== 'FINISHED').slice(0, 2);

  const today = new Date();
  const todayFormatted = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 p-6 sm:p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Greeting */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sun className="w-3.5 h-3.5" />
            <span>Resumo do Dia</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Bom dia, {currentUser.name.split(' ')[0]}!
          </h2>
          <p className="text-xs text-slate-400 capitalize">{todayFormatted} • {currentOrganization.name}</p>
        </div>

        {/* Quick KPI Highlights */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>Atrasadas</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-rose-400">{overall.overdueTasks}</span>
            <span className="text-[10px] text-slate-400 block">requerem atenção</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-1">
            <div className="flex items-center justify-between text-purple-400 font-bold">
              <span>Em Revisão</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-purple-300">{overall.reviewTasks}</span>
            <span className="text-[10px] text-slate-400 block">aguardando aprovação</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>Bloqueadas</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-amber-400">{overall.blockedTasks}</span>
            <span className="text-[10px] text-slate-400 block">gargalos com terceiros</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
            <div className="flex items-center justify-between text-indigo-400 font-bold">
              <span>Demandas Ativas</span>
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-white">{overall.openTasks}</span>
            <span className="text-[10px] text-slate-400 block">no fluxo de produção</span>
          </div>
        </div>

        {/* Upcoming Events preview */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Próximos Eventos & Cultos
            </span>
            <div className="space-y-2">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{evt.title}</h4>
                    <p className="text-[10px] text-slate-400">
                      Início: {new Date(evt.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} • Líder: {evt.leaderName}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 shrink-0">
                    {evt.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigate('tasks');
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Ir para o Kanban</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
