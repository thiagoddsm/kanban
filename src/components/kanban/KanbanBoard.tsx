import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilterPopover } from './KanbanFilterPopover';
import { TaskModal } from './TaskModal';

import { DependencyAlertModal } from './DependencyAlertModal';
import { NewDemandModal } from './NewDemandModal';
import { ImportJsonModal } from './ImportJsonModal';
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
  RotateCcw, 
  Code2,
  ChevronDown,
  ChevronUp,
  LayoutGrid
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
  const { currentOrganization, currentCampus, isTrialExpired, openTrialExpiredModal } = useTenant();
  const { warning, info } = useNotification();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;
  const isTaskModalOpen = selectedTaskId !== null;
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
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

  // Mobile Display Mode: 'ACCORDION' (Pipefy grouped style) vs 'COLUMNS' (classic horizontal)
  const [mobileViewMode, setMobileViewMode] = useState<'ACCORDION' | 'COLUMNS'>('ACCORDION');
  const [expandedColumnIds, setExpandedColumnIds] = useState<Record<string, boolean>>({
    INBOX: true,
  });

  const toggleColumnExpanded = (columnId: string) => {
    setExpandedColumnIds((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const COLUMN_ACCORDION_STYLES: Record<string, {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
  }> = {
    INBOX: {
      bg: 'bg-purple-50/90 dark:bg-purple-950/30',
      border: 'border-purple-200/80 dark:border-purple-800/50',
      text: 'text-purple-900 dark:text-purple-300',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
      badgeText: 'text-purple-800 dark:text-purple-200',
      dot: 'bg-purple-500',
    },
    PLANNING: {
      bg: 'bg-blue-50/90 dark:bg-blue-950/30',
      border: 'border-blue-200/80 dark:border-blue-800/50',
      text: 'text-blue-900 dark:text-blue-300',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
      badgeText: 'text-blue-800 dark:text-blue-200',
      dot: 'bg-blue-500',
    },
    IN_PROGRESS: {
      bg: 'bg-amber-50/90 dark:bg-amber-950/30',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      text: 'text-amber-900 dark:text-amber-300',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
      badgeText: 'text-amber-800 dark:text-amber-200',
      dot: 'bg-amber-500',
    },
    REVIEW: {
      bg: 'bg-indigo-50/90 dark:bg-indigo-950/30',
      border: 'border-indigo-200/80 dark:border-indigo-800/50',
      text: 'text-indigo-900 dark:text-indigo-300',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60',
      badgeText: 'text-indigo-800 dark:text-indigo-200',
      dot: 'bg-indigo-500',
    },
    BLOCKED: {
      bg: 'bg-rose-50/90 dark:bg-rose-950/30',
      border: 'border-rose-200/80 dark:border-rose-800/50',
      text: 'text-rose-900 dark:text-rose-300',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/60',
      badgeText: 'text-rose-800 dark:text-rose-200',
      dot: 'bg-rose-500',
    },
    DONE: {
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      text: 'text-emerald-900 dark:text-emerald-300',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
      badgeText: 'text-emerald-800 dark:text-emerald-200',
      dot: 'bg-emerald-500',
    },
  };

  // Global Keyboard Shortcuts (N for new, J for JSON import, / for search, Esc to close)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT');

      if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setIsNewDemandModalOpen(false);
        setIsImportJsonOpen(false);
        setIsDepAlertOpen(false);
        setIsPromptBlockOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (isTrialExpired) {
          openTrialExpiredModal();
        } else {
          setIsNewDemandModalOpen(true);
        }
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        if (isTrialExpired) {
          openTrialExpiredModal();
        } else {
          setIsImportJsonOpen(true);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTrialExpired, openTrialExpiredModal]);

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
    setSelectedTaskId(task.id);
  };

  const handleQuickAdd = (status: TaskStatus) => {
    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }
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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-6 overflow-hidden">
      {/* Board Top Header (Discreto, compacto no padrão Pipefy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Quadro de Demandas
          </h1>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
            {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os campus'}
          </span>

          <span className="text-xs text-slate-500">
            ({filteredTasks.length} {filteredTasks.length === 1 ? 'card' : 'cards'})
          </span>

          {/* Mobile View Switcher (Agrupado Pipefy vs Colunas) */}
          <div className="sm:hidden flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setMobileViewMode('ACCORDION')}
              className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
                mobileViewMode === 'ACCORDION'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Visualização Agrupada (Pipefy Mobile)"
            >
              <Layers className="w-3 h-3" />
              <span>Agrupado</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('COLUMNS')}
              className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
                mobileViewMode === 'COLUMNS'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Visualização em Colunas"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Colunas</span>
            </button>
          </div>
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
              onClick={() => {
                if (isTrialExpired) {
                  openTrialExpiredModal();
                } else {
                  setIsImportJsonOpen(true);
                }
              }}
              title="Criar tarefas com IA (Transcrição / Granola) ou JSON (Atalho: J)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Criar com IA / JSON</span>
              <span className="sm:hidden">IA / JSON</span>
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-medium">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 dark:hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold ml-1 transition-colors"
          >
            Limpar todos
          </button>
        </div>
      )}


      {/* 1. Mobile Accordion View (Padrão Pipefy Mobile) */}
      {mobileViewMode === 'ACCORDION' && (
        <div className="sm:hidden flex-1 overflow-y-auto space-y-2.5 pb-6 custom-scrollbar">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            const isExpanded = !!expandedColumnIds[column.id];
            const style = COLUMN_ACCORDION_STYLES[column.id] || {
              bg: 'bg-slate-50 dark:bg-slate-900/60',
              border: 'border-slate-200 dark:border-slate-800',
              text: 'text-slate-800 dark:text-slate-200',
              badgeBg: 'bg-slate-200 dark:bg-slate-800',
              badgeText: 'text-slate-700 dark:text-slate-300',
              dot: 'bg-slate-500',
            };

            return (
              <div 
                key={column.id} 
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                  isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-700' : `${style.border}`
                }`}
              >
                {/* Pipefy Stage Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleColumnExpanded(column.id)}
                  className={`w-full p-3.5 flex items-center justify-between text-left transition-all ${style.bg} ${
                    isExpanded ? 'border-b border-slate-200/80 dark:border-slate-800/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
                    <span className={`text-xs font-black uppercase tracking-wider truncate ${style.text}`}>
                      {column.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText}`}>
                      {columnTasks.length}
                    </span>
                    <div className={`p-0.5 rounded-full text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : 'rotate-0'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </button>

                {/* Stage Cards (Expanded) */}
                {isExpanded && (
                  <div className="p-3 space-y-3 animate-fade-in bg-slate-100/40 dark:bg-slate-950/40">
                    {columnTasks.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Nenhuma demanda nesta etapa.
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          onSelect={handleSelectTask}
                          onDragStart={() => {}}
                        />
                      ))
                    )}

                    {canCreateDemand && (
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(column.id)}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-indigo-300 hover:border-brand-400 transition-colors flex items-center justify-center gap-1.5 bg-white/70 dark:bg-slate-900/40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar demanda em {column.title}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Desktop Kanban Columns Container (and Mobile when in 'COLUMNS' mode) */}
      <div className={`${
        mobileViewMode === 'ACCORDION' ? 'hidden sm:flex' : 'flex'
      } flex-1 overflow-x-auto pb-4 gap-3 sm:gap-4 custom-scrollbar items-start touch-pan-x overscroll-x-contain snap-x snap-mandatory`}>
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
      {isTaskModalOpen && selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          isOpen={true}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* New Demand Form Modal */}
      {isNewDemandModalOpen && (
        <NewDemandModal
          isOpen={isNewDemandModalOpen}
          defaultStatus={defaultColumnForNew}
          onClose={() => setIsNewDemandModalOpen(false)}
        />
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Registrar Motivo do Bloqueio
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Para mover esta demanda para a coluna <strong>Bloqueado</strong>, informe a justificativa e quem precisa agir.
            </p>

            <form onSubmit={handleBlockPromptSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo do Bloqueio *
                </label>
                <textarea
                  rows={2}
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Aguardando aprovação da copy pelo pastor..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quem precisa agir?
                </label>
                <input
                  type="text"
                  value={actionRequiredBy}
                  onChange={(e) => setActionRequiredBy(e.target.value)}
                  placeholder="Ex: Pr. Tiago Rocha ou Equipe de Som"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPromptBlockOpen(false);
                    setBlockTargetTaskId(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import JSON Modal */}
      <ImportJsonModal
        isOpen={isImportJsonOpen}
        onClose={() => setIsImportJsonOpen(false)}
      />
    </div>
  );
};
