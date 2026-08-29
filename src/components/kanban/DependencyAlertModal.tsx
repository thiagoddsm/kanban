import React from 'react';
import { Task } from '../../types';
import { useAccess } from '../../context/AccessContext';
import { 
  ShieldAlert, 
  AlertTriangle, 
  X, 
  MessageSquare, 
  ArrowRight,
  ExternalLink,
  Lock,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { PriorityBadge, DemandTypeBadge } from '../common/Badge';

interface DependencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTask: Task | null;
  blockedByTasks: Task[];
  onRemind: () => void;
  onForceMove: () => void;
}

export const DependencyAlertModal: React.FC<DependencyAlertModalProps> = ({
  isOpen,
  onClose,
  targetTask,
  blockedByTasks,
  onRemind,
  onForceMove,
}) => {
  const { isLeader } = useAccess();

  if (!isOpen || !targetTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
              Governança de Processo & Dependências
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Demanda Bloqueada por Tarefas Anteriores!
            </h3>
          </div>
        </div>

        {/* Target Task info */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">
            Demanda que você tentou mover:
          </span>
          <div className="flex items-center gap-2">
            <DemandTypeBadge type={targetTask.demandType} size="sm" />
            <h4 className="text-xs font-bold text-white truncate">{targetTask.title}</h4>
          </div>
        </div>

        {/* List of Blocking Predecessors */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">
            É necessário concluir antes as seguintes {blockedByTasks.length} tarefas:
          </span>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {blockedByTasks.map((blocker) => (
              <div
                key={blocker.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DemandTypeBadge type={blocker.demandType} size="sm" />
                    <span className="text-[10px] font-medium text-amber-400">
                      Status: {blocker.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{blocker.title}</p>
                  <p className="text-[10px] text-slate-400">
                    Responsável: <strong className="text-slate-200">{blocker.assigneeName || 'Não definido'}</strong> • Prazo:{' '}
                    {new Date(blocker.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <PriorityBadge priority={blocker.priority} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <button
            onClick={() => {
              onRemind();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Cobrar Responsável via WhatsApp</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
            >
              Manter Bloqueado
            </button>

            {isLeader && (
              <button
                onClick={() => {
                  onForceMove();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold"
                title="Apenas administradores e líderes podem forçar o avanço com pendências"
              >
                Forçar Avanço (Líder)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
