import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { ChurchEvent, Task, NavigationTab } from '../../types';
import { EventStatusBadge, EventCategoryBadge, StatusBadge, PriorityBadge, DemandTypeBadge } from '../common/Badge';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  AlertTriangle,
  Layers,
  Edit3,
  Sparkles,
  Building2,
  Archive
} from 'lucide-react';
import { NewDemandModal } from '../kanban/NewDemandModal';
import { EventModal } from './EventModal';

interface EventDetailsModalProps {
  event: ChurchEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToKanban: (eventId: string) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onNavigateToKanban,
}) => {
  if (!isOpen || !event) return null;

  const { tasks, users, getEventStats, updateEvent, archiveEvent } = useData();
  const { canManageEvents, canCreateDemand } = useAccess();

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);

  const stats = getEventStats(event.id);
  const eventTasks = tasks.filter((t) => t.eventId === event.id && !t.isArchived);
  const teamMembers = users.filter((u) => event.teamIds?.includes(u.id));

  const handleFinishProject = () => {
    updateEvent({
      ...event,
      status: 'FINISHED',
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <EventCategoryBadge category={event.category} />
              <EventStatusBadge status={event.status} />
              {event.campusName ? (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-rose-400" />
                  {event.campusName}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5 text-indigo-400" />
                  Institucional
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {event.title}
            </h2>
            {event.description && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManageEvents && (
              <button
                onClick={() => setIsEditEventOpen(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Editar Evento"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Progress Bar & Indicators Table */}
          <div className="p-5 rounded-3xl bg-slate-950/50 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Progresso Automático de Entregas
                </span>
                <span className="text-xs text-slate-500">
                  {stats.completedTasks} de {stats.totalTasks} tarefas concluídas
                </span>
              </div>
              <span className="text-2xl font-black text-indigo-400">
                {stats.progressPercentage}%
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>

            {/* Project Metrics Summary Table */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block">Total</span>
                <span className="text-base font-black text-white">{stats.totalTasks}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 font-semibold block">Concluídas</span>
                <span className="text-base font-black text-emerald-400">{stats.completedTasks}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-amber-500/20">
                <span className="text-[10px] text-amber-400 font-semibold block">Em Curso</span>
                <span className="text-base font-black text-amber-300">{stats.inProgressTasks}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-purple-500/20">
                <span className="text-[10px] text-purple-400 font-semibold block">Bloqueadas</span>
                <span className="text-base font-black text-purple-300">{stats.blockedTasks}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-rose-500/20 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-rose-400 font-semibold block">Atrasadas</span>
                <span className="text-base font-black text-rose-400">{stats.overdueTasks}</span>
              </div>
            </div>
          </div>

          {/* Schedule & Team info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cronograma */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Cronograma do Projeto
              </span>
              <p className="text-xs text-slate-300 font-medium">
                {new Date(event.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                {new Date(event.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
              {event.location && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>{event.location}</span>
                </p>
              )}
            </div>

            {/* Equipe & Líder */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Liderança & Equipe Designada
              </span>
              <p className="text-xs text-slate-300">
                Líder: <strong className="text-white">{event.leaderName}</strong>
              </p>
              <div className="flex items-center -space-x-1 pt-1">
                {teamMembers.map((m) => (
                  <img
                    key={m.id}
                    src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={m.name}
                    title={m.name}
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-slate-900"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tasks List inside this event */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Demandas Vinculadas ({eventTasks.length})
              </h3>

              <div className="flex items-center gap-2">
                {canCreateDemand && (
                  <button
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Demanda</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToKanban(event.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <span>Ver no Kanban</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {eventTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  Nenhuma demanda vinculada a este projeto ainda.
                </div>
              ) : (
                eventTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <DemandTypeBadge type={t.demandType} size="sm" />
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} size="sm" />
                      </div>
                      <p className="font-semibold text-white truncate">{t.title}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        {new Date(t.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {t.assigneeName || 'Sem responsável'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {canManageEvents && event.status !== 'FINISHED' && (
              <button
                onClick={handleFinishProject}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
                title="Finalizar este projeto (exige 100% das tarefas concluídas)"
              >
                Concluir Projeto
              </button>
            )}
            {canManageEvents && (
              <button
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja arquivar o projeto "${event.title}"?`)) {
                    archiveEvent(event.id, true);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Arquivar este projeto"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arquivar Projeto</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <NewDemandModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
      />

      <EventModal
        event={event}
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};
