import React from 'react';
import { Task } from '../../types';
import { PriorityBadge, DemandTypeBadge } from '../common/Badge';
import { 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  MapPin, 
  Building2,
  Lock,
  Flame
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface KanbanCardProps {
  task: Task;
  onSelect: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onSelect,
  onDragStart,
}) => {
  const { checkDependencies } = useData();

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.status !== 'DONE' && task.deadline < todayStr;
  const isDueSoon = task.status !== 'DONE' && !isOverdue && task.deadline === todayStr;

  const depResult = checkDependencies(task);
  const hasPendingDependencies = depResult.hasPending;

  const completedChecklistCount = task.checklist ? task.checklist.filter((i) => i.completed).length : 0;
  const totalChecklistCount = task.checklist ? task.checklist.length : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onSelect(task)}
      className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 cursor-grab active:cursor-grabbing transition-all duration-200 space-y-3 group"
    >
      {/* Top Header: Demand Type + Priority + Campus Scope */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <DemandTypeBadge type={task.demandType} size="sm" />
          {task.campusName ? (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700/80 flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
              <span className="truncate">{task.campusName}</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-500/20 flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
              <span>Institucional</span>
            </span>
          )}
        </div>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>

      {/* Task Title */}
      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
        {task.title}
      </h4>

      {/* Linked Event / Project */}
      {task.eventName && (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium truncate max-w-full">
          <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="truncate">{task.eventName}</span>
        </div>
      )}

      {/* Blocked or Pending Predecessors Warning Banner */}
      {task.status === 'BLOCKED' && (
        <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">
            {task.blockedReason ? `Bloqueio: ${task.blockedReason}` : 'Aguardando ação externa'}
          </span>
        </div>
      )}

      {hasPendingDependencies && task.status !== 'BLOCKED' && task.status !== 'DONE' && (
        <div 
          className="p-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300 space-y-0.5"
          title={`Dependências pendentes: ${depResult.pendingTasks.map((t) => t.title).join(', ')}`}
        >
          <div className="flex items-center gap-1 font-semibold">
            <Lock className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
            <span>Aguardando {depResult.pendingTasks.length} dependência(s):</span>
          </div>
          <div className="pl-4 text-[9.5px] text-amber-200/80 truncate font-medium">
            {depResult.pendingTasks.map((t) => t.title).join(' • ')}
          </div>
        </div>
      )}

      {/* Footer: Assignee & Indicators */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        {/* Assignees (Single or Multiple) */}
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex items-center -space-x-2 overflow-hidden">
              {task.assignees.slice(0, 3).map((a, idx) => (
                <img
                  key={a.id || idx}
                  src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={a.name}
                  title={a.name}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-900 shrink-0"
                />
              ))}
              {task.assignees.length > 3 && (
                <span className="w-5 h-5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-300 flex items-center justify-center ring-1 ring-slate-900">
                  +{task.assignees.length - 3}
                </span>
              )}
            </div>
          ) : task.assigneeName ? (
            <div className="flex items-center gap-1 min-w-0">
              <img
                src={task.assigneeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={task.assigneeName}
                title={task.assigneeName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
              />
              <span className="text-[11px] text-slate-300 truncate font-medium max-w-[85px]">
                {task.assigneeName.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 italic">Sem responsável</span>
          )}
        </div>

        {/* Indicators: Deadline, Checklist, Comments, Attachments */}
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          {/* Deadline */}
          <div
            className={`flex items-center gap-1 text-[11px] font-semibold ${
              isOverdue
                ? 'text-rose-400 animate-pulse'
                : isDueSoon
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
            title={`Prazo: ${new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}`}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>{new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>

          {/* Checklist Counter */}
          {totalChecklistCount > 0 && (
            <div
              className={`flex items-center gap-0.5 text-[11px] ${
                completedChecklistCount === totalChecklistCount ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`}
              title={`Checklist: ${completedChecklistCount}/${totalChecklistCount}`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>{completedChecklistCount}/{totalChecklistCount}</span>
            </div>
          )}

          {/* Comments Count */}
          {(task.commentsCount || 0) > 0 && (
            <div className="flex items-center gap-0.5 text-[11px] text-slate-400" title="Comentários">
              <MessageSquare className="w-3 h-3" />
              <span>{task.commentsCount}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachmentLinks && task.attachmentLinks.length > 0 && (
            <div className="flex items-center gap-0.5 text-[11px] text-indigo-400" title="Anexos">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachmentLinks.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
