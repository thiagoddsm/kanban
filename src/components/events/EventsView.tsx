import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { ChurchEvent, NavigationTab } from '../../types';
import { EventStatusBadge, EventCategoryBadge } from '../common/Badge';
import { EventModal } from './EventModal';
import { EventDetailsModal } from './EventDetailsModal';
import { NewEventTemplateModal } from './NewEventTemplateModal';
import { 
  CalendarCheck, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  ArrowRight, 
  Archive, 
  Edit3, 
  Sparkles,
  Wand2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Layers,
  Building2
} from 'lucide-react';

interface EventsViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onNavigate }) => {
  const { events, users, getEventStats, setFilterEventId, archiveEvent } = useData();
  const { canManageEvents } = useAccess();
  const { currentOrganization, currentCampus } = useTenant();

  const [selectedEventForModal, setSelectedEventForModal] = useState<ChurchEvent | null>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<ChurchEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const activeEvents = events.filter((e) => !e.isArchived);

  const handleOpenKanbanForEvent = (eventId: string) => {
    setFilterEventId(eventId);
    onNavigate('tasks');
  };

  const handleCardClick = (evt: ChurchEvent) => {
    setSelectedEventForDetails(evt);
    setIsDetailsOpen(true);
  };

  const handleEditEvent = (e: React.MouseEvent, evt: ChurchEvent) => {
    e.stopPropagation();
    setSelectedEventForModal(evt);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Projetos & Campanhas
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {activeEvents.length} Projetos Ativos ({currentCampus ? currentCampus.name : 'Todos os Campi'})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Central operacional para projetos, eventos, reformas, compras e logística, consolidando cronogramas e entregas.
          </p>
        </div>

        {canManageEvents && (
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
            >
              <Wand2 className="w-4 h-4" />
              <span>Gerar via Modelo</span>
            </button>

            <button
              onClick={() => {
                setSelectedEventForModal(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold border border-slate-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Projeto</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of Active Events */}
      {activeEvents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum projeto ativo</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Você não possui projetos ou eventos ativos no momento. Crie um novo projeto ou restaure um arquivado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEvents.map((evt) => {
          const stats = getEventStats(evt.id);
          const teamMembers = users.filter((u) => evt.teamIds?.includes(u.id));

          return (
            <div
              key={evt.id}
              onClick={() => handleCardClick(evt)}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer transition-all duration-200 flex flex-col justify-between group space-y-5"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <EventCategoryBadge category={evt.category} />
                    {evt.campusName ? (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-rose-400" />
                        {evt.campusName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5 text-indigo-400" />
                        Institucional
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <EventStatusBadge status={evt.status} />
                    {canManageEvents && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleEditEvent(e, evt)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Editar Projeto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveEvent(evt.id, true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Arquivar Projeto"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight mb-2">
                  {evt.title}
                </h3>

                {/* Description */}
                {evt.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {evt.description}
                  </p>
                )}

                {/* Event info details */}
                <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      {new Date(evt.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                      {new Date(evt.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {evt.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Líder: <strong className="text-white">{evt.leaderName}</strong></span>
                  </div>
                </div>

                {/* Project Task Breakdown Metrics */}
                <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Total</span>
                    <span className="font-extrabold text-white text-sm">{stats.totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-semibold">Entregues</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{stats.completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block font-semibold">Em Curso</span>
                    <span className="font-extrabold text-amber-300 text-sm">{stats.inProgressTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-400 block font-semibold">Bloqueadas</span>
                    <span className="font-extrabold text-rose-400 text-sm">{stats.blockedTasks}</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Progresso Automático</span>
                    <span className="font-bold text-indigo-400">{stats.progressPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${stats.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Team Avatars & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {teamMembers.map((member) => (
                      <img
                        key={member.id}
                        src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={member.name}
                        title={member.name}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-900"
                      />
                    ))}
                    {teamMembers.length === 0 && (
                      <span className="text-[11px] text-slate-500">Sem equipe</span>
                    )}
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenKanbanForEvent(evt.id);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <span>Ver no Kanban</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Edit/Create Modal */}
      <EventModal
        event={selectedEventForModal}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEventForModal(null);
        }}
      />

      {/* Details Modal */}
      <EventDetailsModal
        event={selectedEventForDetails}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedEventForDetails(null);
        }}
        onNavigateToKanban={handleOpenKanbanForEvent}
      />

      {/* Template Generator Modal */}
      <NewEventTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};
