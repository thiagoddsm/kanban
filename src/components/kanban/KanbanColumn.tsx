import React, { useState } from 'react';
import { ColumnDefinition, Task, TaskStatus } from '../../types';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';

interface KanbanColumnProps {
  column: ColumnDefinition;
  index: number;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  index,
  tasks,
  onSelectTask,
  onQuickAdd,
  onDropTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { canCreateDemand } = useAccess();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, column.id);
    }
  };

  const handleCardDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-80 shrink-0 bg-slate-100/70 dark:bg-slate-950/40 rounded-3xl border transition-all duration-200 ${
        isDragOver
          ? 'border-brand-500 bg-brand-50/50 dark:bg-indigo-950/20 shadow-lg shadow-brand-500/10'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center border border-slate-300 dark:border-slate-700">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
              {column.title}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {column.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${column.badgeBg}`}>
            {tasks.length}
          </span>
          {canCreateDemand && (
            <button
              onClick={() => onQuickAdd(column.id)}
              className="w-6 h-6 rounded-lg bg-slate-200/80 hover:bg-brand-600 border border-slate-300/80 hover:border-brand-500 text-slate-600 hover:text-white dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-400 dark:hover:bg-brand-600 dark:hover:border-brand-500 dark:hover:text-white transition-all flex items-center justify-center group"
              title={`Adicionar demanda em ${column.title}`}
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[420px] max-h-[calc(100vh-230px)] custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 dark:border-slate-800/80 rounded-2xl">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Nenhuma demanda nesta etapa</p>
            {canCreateDemand && (
              <button
                onClick={() => onQuickAdd(column.id)}
                className="mt-2 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors group"
              >
                <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
                <span>Criar card</span>
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onDragStart={handleCardDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
};
