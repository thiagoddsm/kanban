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
import { Plus, MapPin, ShieldAlert, Sparkles } from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { 
    columns, 
    filteredTasks, 
    moveTask, 
    remindPredecessors,
    blockTaskWithReason,
    filterEventId,
    events
  } = useData();
  const { canCreateDemand, canMoveTasks, isLeader, isAdmin } = useAccess();
  const { currentOrganization, currentCampus } = useTenant();
  const { warning, info } = useNotification();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [defaultColumnForNew, setDefaultColumnForNew] = useState<TaskStatus>('INBOX');

  // Dependency Alert Modal State
  const [isDepAlertOpen, setIsDepAlertOpen] = useState(false);
  const [targetBlockedTask, setTargetBlockedTask] = useState<Task | null>(null);
  const [targetStatusToForce, setTargetStatusToForce] = useState<TaskStatus | null>(null);
  const [blockingTasks, setBlockingTasks] = useState<Task[]>([]);

  // Blocking Prompt State for Drag-to-Blocked
  const [isPromptBlockOpen, setIsPromptBlockOpen] = useState(false);
  const [blockTargetTaskId, setBlockTargetTaskId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionRequiredBy, setActionRequiredBy] = useState('');

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

    // Governance Rule 2: Moving from IN_PROGRESS or PLANNING directly to DONE requires REVIEW (unless Leader/Admin)
    if (targetStatus === 'DONE' && (task.status === 'IN_PROGRESS' || task.status === 'PLANNING') && !isLeader) {
      warning(
        'Fluxo de Governança',
        'Demandas em produção devem ser enviadas para "Revisão e Aprovação" antes da conclusão final.'
      );
      // Auto-route to REVIEW instead
      moveTask(taskId, 'REVIEW');
      return;
    }

    // Governance Rule 3: Moving to IN_PROGRESS, REVIEW or DONE checks dependencies
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

  const handleConfirmBlockPrompt = (e: React.FormEvent) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quadro de Fluxo Kanban
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name} (+ Institucionais)` : '• Todos os Campi'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {selectedEvent
              ? `Filtrando por projeto: ${selectedEvent.title}`
              : 'Fluxo visual de 6 etapas com controle rigoroso de dependências, aprovações e bloqueios.'}
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

            <form onSubmit={handleConfirmBlockPrompt} className="space-y-3">
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
