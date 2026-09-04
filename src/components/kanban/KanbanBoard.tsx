import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { KanbanColumn } from './KanbanColumn';
import { KanbanFilterPopover } from './KanbanFilterPopover';
import { TaskModal } from './TaskModal';

import { DependencyAlertModal } from './DependencyAlertModal';
import { NewDemandModal } from './NewDemandModal';
import { Task, TaskStatus } from '../../types';
import { 
  Plus, 
  MapPin, 
  ShieldAlert, 
  Sparkles,
  Filter,
  Search,
  User as UserIcon,
  Calendar,
  Tag,
  Layers,
  Flame,
  X,
  RotateCcw
} from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { 
    columns, 
    tasks,
    filteredTasks, 
    moveTask, 
    remindPredecessors,
    blockTaskWithReason,
    filterOnlyMyTasks,
    setFilterOnlyMyTasks,
    filterEventId,
    setFilterEventId,
    filterAssigneeId,
    setFilterAssigneeId,
    filterPriority,
    setFilterPriority,
    filterDemandType,
    setFilterDemandType,
    filterTag,
    setFilterTag,
    searchQuery,
    setSearchQuery,
    clearFilters,
    events,
    users,
    demandTypes,
    allTags
  } = useData();
  const { canCreateDemand, canMoveTasks, isLeader, isAdmin } = useAccess();
  const { currentOrganization, currentCampus } = useTenant();
  const { warning, info } = useNotification();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [defaultColumnForNew, setDefaultColumnForNew] = useState<TaskStatus>('INBOX');

  const [isDepAlertOpen, setIsDepAlertOpen] = useState(false);
  const [targetBlockedTask, setTargetBlockedTask] = useState<Task | null>(null);
  const [targetStatusToForce, setTargetStatusToForce] = useState<TaskStatus | null>(null);
  const [blockingTasks, setBlockingTasks] = useState<Task[]>([]);

  // Blocking Prompt State for Drag-to-Blocked
  const [isPromptBlockOpen, setIsPromptBlockOpen] = useState(false);
  const [blockTargetTaskId, setBlockTargetTaskId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionRequiredBy, setActionRequiredBy] = useState('');

  // Quick review filter
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);

  // Global Keyboard Shortcuts (N for new, / for search, Esc to close)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT');

      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsNewDemandModalOpen(false);
        setIsDepAlertOpen(false);
        setIsPromptBlockOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsNewDemandModalOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFiltersCount = [
    filterOnlyMyTasks,
    filterEventId,
    filterAssigneeId,
    filterPriority,
    filterDemandType,
    filterTag,
    searchQuery.trim(),
  ].filter(Boolean).length;

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleQuickAdd = (status: TaskStatus) => {
    setDefaultColumnForNew(status);
    setIsNewDemandModalOpen(true);
  };

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    if (!canMoveTasks) {
      warning('Ação não permitida', 'Solicitantes não podem mover cards no quadro.');
      return;
    }

    const task = filteredTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Governance Rule 1: Dragging to BLOCKED requires reason & who needs to act
    if (targetStatus === 'BLOCKED') {
      setBlockTargetTaskId(taskId);
      setBlockReason(task.blockedReason || '');
      setActionRequiredBy(task.blockedActionRequiredBy || '');
      setIsPromptBlockOpen(true);
      return;
    }

    // Governance Rule 2: Moving from BLOCKED clears reason
    if (task.status === 'BLOCKED') {
      const moveRes = moveTask(taskId, targetStatus);
      if (moveRes.success) {
        info('Demanda desbloqueada', `Demanda movida para ${targetStatus}.`);
      }
      return;
    }

    // Governance Rule 3: Moving from IN_PROGRESS or PLANNING directly to DONE requires REVIEW (unless Leader/Admin)
    if (targetStatus === 'DONE' && (task.status === 'IN_PROGRESS' || task.status === 'PLANNING') && !isLeader) {
      warning(
        'Fluxo de Governança',
        'Demandas em produção devem ser enviadas para "Revisão e Aprovação" antes da conclusão final.'
      );
      // Auto-route to REVIEW instead
      moveTask(taskId, 'REVIEW');
      return;
    }

    // Governance Rule 4: Moving to IN_PROGRESS, REVIEW or DONE checks dependencies
    const res = moveTask(taskId, targetStatus);
    if (!res.success && res.blockedBy && res.blockedBy.length > 0) {
      setTargetBlockedTask(task);
      setTargetStatusToForce(targetStatus);
      setBlockingTasks(res.blockedBy);
      setIsDepAlertOpen(true);
    }
  };

  const handleForceMove = () => {
    if (targetBlockedTask && targetStatusToForce) {
      moveTask(targetBlockedTask.id, targetStatusToForce, true);
    }
  };

  const handleBlockPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTargetTaskId || !blockReason.trim()) return;
    blockTaskWithReason(blockTargetTaskId, blockReason.trim(), actionRequiredBy.trim());
    setIsPromptBlockOpen(false);
    setBlockTargetTaskId(null);
    setBlockReason('');
    setActionRequiredBy('');
  };

  const selectedEvent = events.find((e) => e.id === filterEventId);
  const selectedAssignee = users.find((u) => u.id === filterAssigneeId);
  const selectedDemandType = demandTypes.find((dt) => dt.type === filterDemandType);


  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 p-4 sm:p-6 overflow-hidden">
      {/* Board Top Header (Discreto, compacto no padrão Pipefy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Quadro de Demandas
          </h1>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os campus'}
          </span>

          <span className="text-xs text-slate-500">
            ({filteredTasks.length} {filteredTasks.length === 1 ? 'card' : 'cards'})
          </span>
        </div>

        {/* Right Toolbar: Search + Filter Popover + New Demand Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <KanbanFilterPopover
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterOnlyMyTasks={filterOnlyMyTasks}
            setFilterOnlyMyTasks={setFilterOnlyMyTasks}
            filterEventId={filterEventId}
            setFilterEventId={setFilterEventId}
            filterAssigneeId={filterAssigneeId}
            setFilterAssigneeId={setFilterAssigneeId}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            filterDemandType={filterDemandType}
            setFilterDemandType={setFilterDemandType}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            clearFilters={clearFilters}
            events={events}
            users={users}
            demandTypes={demandTypes}
            allTags={allTags}
            totalTasksCount={tasks.length}
            filteredTasksCount={filteredTasks.length}
          />

          {canCreateDemand && (
            <button
              onClick={() => handleQuickAdd('INBOX')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Demanda</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips (Ultra-discreto: só aparece quando filtros são aplicados!) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5 px-0.5 py-0.5 text-xs shrink-0 animate-fade-in">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Filtros ativos:
          </span>

          {filterOnlyMyTasks && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
              Atribuído a mim
              <button onClick={() => setFilterOnlyMyTasks(false)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterPriority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium">
              Prioridade: {filterPriority}
              <button onClick={() => setFilterPriority('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedDemandType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-medium">
              Tipo: {selectedDemandType.label}
              <button onClick={() => setFilterDemandType('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedEvent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium">
              Projeto: {selectedEvent.title}
              <button onClick={() => setFilterEventId('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedAssignee && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
              Membro: {selectedAssignee.name}
              <button onClick={() => setFilterAssigneeId('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
              #{filterTag}
              <button onClick={() => setFilterTag('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1 transition-colors"
          >
            Limpar todos
          </button>
        </div>
      )}


      {/* 6 Kanban Columns Horizontal Scrolling Container */}
      <div className="flex-1 overflow-x-auto pb-4 flex gap-4 custom-scrollbar items-start">
        {columns.map((column, index) => {
          const columnTasks = filteredTasks.filter((t) => t.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              index={index}
              tasks={columnTasks}
              onSelectTask={handleSelectTask}
              onQuickAdd={handleQuickAdd}
              onDropTask={handleDropTask}
            />
          );
        })}
      </div>

      {/* Task Details Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />

      {/* New Demand Form Modal */}
      <NewDemandModal
        isOpen={isNewDemandModalOpen}
        defaultStatus={defaultColumnForNew}
        onClose={() => setIsNewDemandModalOpen(false)}
      />

      {/* Dependency Alert Modal */}
      <DependencyAlertModal
        isOpen={isDepAlertOpen}
        onClose={() => {
          setIsDepAlertOpen(false);
          setTargetBlockedTask(null);
          setTargetStatusToForce(null);
          setBlockingTasks([]);
        }}
        targetTask={targetBlockedTask}
        blockedByTasks={blockingTasks}
        onRemind={() => {
          if (targetBlockedTask) {
            remindPredecessors(targetBlockedTask.id);
          }
        }}
        onForceMove={handleForceMove}
      />

      {/* Prompt Block Reason Modal (Drag to Blocked) */}
      {isPromptBlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Registrar Motivo do Bloqueio
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Para mover esta demanda para a coluna <strong>Bloqueado</strong>, informe a justificativa e quem precisa agir.
            </p>

            <form onSubmit={handleBlockPromptSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo do Bloqueio *
                </label>
                <textarea
                  rows={2}
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Aguardando aprovação da copy pelo pastor..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quem precisa agir?
                </label>
                <input
                  type="text"
                  value={actionRequiredBy}
                  onChange={(e) => setActionRequiredBy(e.target.value)}
                  placeholder="Ex: Pr. Tiago Rocha ou Equipe de Som"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPromptBlockOpen(false);
                    setBlockTargetTaskId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
