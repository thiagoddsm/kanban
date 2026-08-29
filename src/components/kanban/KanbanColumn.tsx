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
      className={`flex flex-col w-80 shrink-0 bg-slate-950/40 rounded-3xl border transition-all duration-200 ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
          : 'border-slate-800/80 hover:border-slate-700/80'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center border border-slate-700">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              {column.title}
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
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
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Adicionar nesta coluna"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[420px] max-h-[calc(100vh-230px)] custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-xs font-medium text-slate-500">Nenhuma demanda nesta etapa</p>
            <span className="text-[10px] text-slate-600 mt-1">Arraste cards aqui</span>
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

      {/* Quick Add Footer Button */}
      {canCreateDemand && (
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={() => onQuickAdd(column.id)}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-700/80 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Demanda</span>
          </button>
        </div>
      )}
    </div>
  );
};
