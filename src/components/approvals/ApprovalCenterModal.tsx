import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { Task, ApprovalRecord } from '../../types';
import { ApprovalService } from '../../services/approvalService';
import { NotificationService } from '../../services/notificationService';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';

import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  ExternalLink, 
  Clock, 
  User, 
  Calendar,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';
import { DemandTypeBadge, PriorityBadge } from '../common/Badge';

interface ApprovalCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
}

export const ApprovalCenterModal: React.FC<ApprovalCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  const { tasks, updateTask, approveTask, users } = useData();
  const { currentUser } = useAuth();
  const { isLeader, isAdmin, canApproveTasks } = useAccess();
  const { currentOrganization } = useTenant();

  const [filterCampus, setFilterCampus] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState<string>('');
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);

  // Demands in REVIEW status
  const pendingApprovals = tasks.filter((t) => !t.isArchived && t.status === 'REVIEW');
  const activeTask = pendingApprovals.find((t) => t.id === selectedTaskId) || pendingApprovals[0] || null;

  const approvalHistory = activeTask
    ? ApprovalService.getHistoryForTask(currentOrganization.id, activeTask.id)
    : [];

  const handleApprove = (task: Task) => {
    if (!canApproveTasks) return;

    approveTask(task.id);

    ApprovalService.recordAction(
      currentOrganization.id,
      task.id,
      'APPROVED',
      task.requesterId,
      task.requesterName,
      currentUser?.id || 'sys',
      currentUser?.name || 'Aprovador',
      'Aprovado sem ressalvas.'
    );

    // Notify Assignee & Requester (In-App + WhatsApp)
    if (task.assigneeId) {
      NotificationService.createNotification({
        organizationId: currentOrganization.id,
        campusId: task.campusId,
        userId: task.assigneeId,
        type: 'TASK_APPROVED',
        title: 'Demanda Aprovada! 🎉',
        message: `Sua entrega para "${task.title}" foi aprovada por ${currentUser?.name || 'um líder'} e concluída.`,
        entityType: 'TASK',
        entityId: task.id,
      });

      const assignee = users.find((u) => u.id === task.assigneeId) || (task.assigneeId === currentUser?.id ? currentUser : undefined);
      if (assignee) {
        WhatsAppNotificationService.notifyTaskApproved({
          organization: currentOrganization,
          task,
          targetUser: assignee,
          actorUser: currentUser,
        });
      }
    }

    if (task.requesterId && task.requesterId !== currentUser?.id) {
      NotificationService.createNotification({
        organizationId: currentOrganization.id,
        campusId: task.campusId,
        userId: task.requesterId,
        type: 'REQUEST_APPROVED',
        title: 'Sua Solicitação foi Aprovada!',
        message: `A solicitação "${task.title}" foi concluída e está pronta para uso.`,
        entityType: 'TASK',
        entityId: task.id,
      });

      const requester = users.find((u) => u.id === task.requesterId);
      if (requester) {
        WhatsAppNotificationService.notifyTaskApproved({
          organization: currentOrganization,
          task,
          targetUser: requester,
          actorUser: currentUser,
        });
      }
    }
  };

  const handleConfirmRequestChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !changeReason.trim()) return;

    const updatedTask: Task = {
      ...activeTask,
      status: 'IN_PROGRESS',
      changesRequestedReason: changeReason.trim(),
      updatedAt: new Date().toISOString(),
    };
    updateTask(updatedTask);

    ApprovalService.recordAction(
      currentOrganization.id,
      activeTask.id,
      'CHANGES_REQUESTED',
      activeTask.requesterId,
      activeTask.requesterName,
      currentUser?.id || 'sys',
      currentUser?.name || 'Revisor',
      changeReason.trim()
    );

    if (activeTask.assigneeId) {
      NotificationService.createNotification({
        organizationId: currentOrganization.id,
        campusId: activeTask.campusId,
        userId: activeTask.assigneeId,
        type: 'TASK_REJECTED',
        title: 'Ajuste Solicitado na Entrega',
        message: `${currentUser.name} solicitou alterações em "${activeTask.title}": "${changeReason.trim()}".`,
        entityType: 'TASK',
        entityId: activeTask.id,
      });
    }

    setIsRequestingChanges(false);
    setChangeReason('');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Centro de Aprovações</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {pendingApprovals.length} pendentes
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Controle de qualidade e validação pastoral antes da publicação e conclusão.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Tudo em dia!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não há nenhuma entrega ou demanda aguardando aprovação no momento.
            </p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
            {/* Left Column: Pending List */}
            <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar max-h-80 md:max-h-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1 mb-2">
                Fila de Validação ({pendingApprovals.length})
              </span>

              {pendingApprovals.map((task) => {
                const isSelected = activeTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setIsRequestingChanges(false);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <DemandTypeBadge type={task.demandType} />
                      <PriorityBadge priority={task.priority} />
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-2 mb-1">
                      {task.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{task.assigneeName || 'Sem responsável'}</span>
                      <span>{new Date(task.deadline).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Review Details & Actions */}
            {activeTask && (
              <div className="md:col-span-2 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-4">
                  {/* Task Header Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DemandTypeBadge type={activeTask.demandType} />
                      <PriorityBadge priority={activeTask.priority} />
                      {activeTask.campusName && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                          {activeTask.campusName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white">{activeTask.title}</h3>
                    {activeTask.description && (
                      <p className="text-xs text-slate-300 mt-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {activeTask.description}
                      </p>
                    )}
                  </div>

                  {/* Attachment Previews */}
                  {activeTask.attachmentLinks && activeTask.attachmentLinks.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Materiais & Links para Aprovação ({activeTask.attachmentLinks.length})</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeTask.attachmentLinks.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center justify-between text-xs text-indigo-300 hover:text-indigo-200 transition-colors group"
                          >
                            <span className="font-semibold truncate">{att.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checklist Summary */}
                  {activeTask.checklist && activeTask.checklist.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                        Critérios de Entrega
                      </label>
                      <div className="space-y-1 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800">
                        {activeTask.checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-slate-300">
                            <span className={item.completed ? 'text-emerald-400' : 'text-slate-500'}>
                              {item.completed ? '✓' : '○'}
                            </span>
                            <span className={item.completed ? 'line-through text-slate-500' : ''}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audit History for this task */}
                  {approvalHistory.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Histórico de Validações</span>
                      </label>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {approvalHistory.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-2 rounded-xl bg-slate-850 border border-slate-800 text-[11px] flex items-start justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-white">{rec.approverName || rec.requestedByName}</span>
                              <span className="text-slate-400 ml-1">
                                {rec.action === 'APPROVED' ? 'aprovou a entrega' : 'solicitou alterações'}
                              </span>
                              {rec.comment && (
                                <p className="text-slate-300 text-[10px] mt-0.5 italic">
                                  "{rec.comment}"
                                </p>
                              )}
                            </div>
                            <span className="text-slate-500 shrink-0 text-[9px]">
                              {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Changes Form */}
                  {isRequestingChanges && (
                    <form onSubmit={handleConfirmRequestChanges} className="space-y-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
                      <label className="block text-xs font-bold text-amber-300">
                        Motivo / Orientações do Ajuste *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Ex: Por favor trocar a data no banner para 19:30 e aumentar o logo..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRequestingChanges(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                        >
                          Confirmar Devolução
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Bottom Decision Actions */}
                {!isRequestingChanges && (
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsRequestingChanges(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Solicitar Alterações</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(activeTask)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar Entrega</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
