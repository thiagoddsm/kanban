import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { KanbanColumn } from './KanbanColumn';
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 p-4 sm:p-6 overflow-hidden">
      {/* Board Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quadro de Fluxo Kanban
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os Campi'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {selectedEvent
              ? `Filtrando por projeto: ${selectedEvent.title}`
              : 'Fluxo visual com filtros rápidos por evento, responsável, prioridade e tags.'}
          </p>
        </div>

        {/* Right action button */}
        {canCreateDemand && (
          <button
            onClick={() => handleQuickAdd('INBOX')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Demanda</span>
          </button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mb-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 shrink-0 shadow-lg">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, tag, pessoa..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* My Tasks Toggle */}
            <button
              onClick={() => setFilterOnlyMyTasks(!filterOnlyMyTasks)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterOnlyMyTasks
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Minhas Tarefas</span>
            </button>
          </div>

          {/* Active filters counter & Reset */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">
              Exibindo <strong className="text-white">{filteredTasks.length}</strong> de <strong className="text-white">{tasks.length}</strong> demandas
            </span>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar Filtros ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips (1-Click) */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-indigo-400" />
            Filtros Rápidos:
          </span>

          <button
            onClick={clearFilters}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              activeFiltersCount === 0
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Todas
          </button>

          <button
            onClick={() => setFilterOnlyMyTasks(!filterOnlyMyTasks)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
              filterOnlyMyTasks
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <UserIcon className="w-3 h-3" />
            <span>Minhas Tarefas</span>
          </button>

          <button
            onClick={() => setFilterPriority(filterPriority === 'URGENT' ? '' : 'URGENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
              filterPriority === 'URGENT'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-rose-300'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Urgentes</span>
          </button>

          <button
            onClick={() => setFilterDemandType(filterDemandType === 'ARTE' ? '' : 'ARTE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
              filterDemandType === 'ARTE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-purple-300'
            }`}
          >
            <span>Artes / Visual</span>
          </button>

          <button
            onClick={() => setFilterDemandType(filterDemandType === 'VIDEO' ? '' : 'VIDEO')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all ${
              filterDemandType === 'VIDEO'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
          >
            <span>Vídeos / Telão</span>
          </button>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          {/* By Event / Project */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400" />
              <span>Evento / Projeto</span>
            </label>
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                filterEventId ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 font-bold' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <option value="">Todos os eventos</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>

          {/* By Assignee */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-cyan-400" />
              <span>Responsável</span>
            </label>
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                filterAssigneeId ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 font-bold' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <option value="">Todos os membros</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* By Demand Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Tipo de Demanda</span>
            </label>
            <select
              value={filterDemandType}
              onChange={(e) => setFilterDemandType(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                filterDemandType ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 font-bold' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <option value="">Todos os tipos</option>
              {demandTypes.map((dt) => (
                <option key={dt.type} value={dt.type}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          {/* By Priority */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Prioridade</span>
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                filterPriority ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 font-bold' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <option value="">Todas as prioridades</option>
              <option value="URGENT">🔴 Urgente</option>
              <option value="HIGH">🟠 Alta</option>
              <option value="MEDIUM">🔵 Média</option>
              <option value="LOW">⚪ Baixa</option>
            </select>
          </div>

          {/* By Tag */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-400" />
              <span>Tag / Marcador</span>
            </label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                filterTag ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold' : 'bg-slate-800 border-slate-700'
              }`}
            >
              <option value="">Todas as tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
