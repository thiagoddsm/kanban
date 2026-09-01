import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { RotateCcw, Trash2, Archive, Calendar, Layers, MapPin } from 'lucide-react';
import { PriorityBadge, DemandTypeBadge } from '../common/Badge';

export const ArchivedView: React.FC = () => {
  const { tasks, events, archiveTask, archiveEvent, deleteTask, deleteEvent, fetchArchivedData } = useData();
  const { isLeader, isAdmin } = useAccess();
  const { currentOrganization, currentCampus } = useTenant();

  const [activeTab, setActiveTab] = useState<'tasks' | 'events'>('tasks');
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  useEffect(() => {
    setIsLoadingArchived(true);
    fetchArchivedData().finally(() => setIsLoadingArchived(false));
  }, [currentOrganization.id]);

  const archivedTasks = tasks.filter((t) => {
    if (!t.isArchived) return false;
    if (currentCampus && t.campusId && t.campusId !== currentCampus.id) return false;
    return true;
  });

  const archivedEvents = events.filter((e) => {
    if (!e.isArchived) return false;
    if (currentCampus && e.campusId && e.campusId !== currentCampus.id) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Histórico de Arquivados
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Histórico completo de demandas concluídas e eventos passados com opção de restauração em 1 clique.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tarefas ({archivedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Projetos / Eventos ({archivedEvents.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {archivedTasks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
              <Archive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Nenhuma tarefa arquivada neste escopo.</p>
            </div>
          ) : (
            archivedTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <DemandTypeBadge type={t.demandType} size="sm" />
                    <PriorityBadge priority={t.priority} size="sm" />
                    {t.campusName && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                        {t.campusName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">{t.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Responsável: {t.assigneeName || 'Não atribuído'} • Concluída em:{' '}
                    {t.completedAt ? new Date(t.completedAt).toLocaleDateString('pt-BR') : 'N/D'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => archiveTask(t.id, false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Restaurar para o Kanban"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-3">
          {archivedEvents.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Nenhum evento arquivado neste escopo.</p>
            </div>
          ) : (
            archivedEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md uppercase">
                      {evt.category}
                    </span>
                    {evt.campusName && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                        {evt.campusName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">{evt.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Líder: {evt.leaderName} • Período:{' '}
                    {new Date(evt.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                    {new Date(evt.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => archiveEvent(evt.id, false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => deleteEvent(evt.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
