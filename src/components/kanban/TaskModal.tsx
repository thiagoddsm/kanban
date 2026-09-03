import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { StorageUploadService } from '../../services/storageUploadService';
import { Task, TaskPriority, TaskStatus, DemandType, AttachmentLink, ChecklistItem, User } from '../../types';
import { PriorityBadge, StatusBadge, DemandTypeBadge } from '../common/Badge';
import { 
  X, 
  Calendar, 
  User as UserIcon, 
  CheckSquare, 
  MessageSquare, 
  Link2, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  RotateCcw,
  Sparkles,
  MapPin,
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Download,
  History,
  Clock
} from 'lucide-react';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, isOpen, onClose }) => {
  if (!isOpen || !task) return null;

  const { 
    events, 
    users, 
    tasks, 
    updateTask, 
    archiveTask, 
    deleteTask, 
    addComment, 
    getCommentsForTask,
    blockTaskWithReason,
    unblockTask,
    approveTask,
    remindPredecessors
  } = useData();

  const { currentUser } = useAuth();
  const { canAssignResponsible, canChangePriority, canApproveTasks, canArchive } = useAccess();
  const { campuses } = useTenant();

  // Local editable states
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [eventId, setEventId] = useState(task.eventId || '');
  const [campusId, setCampusId] = useState(task.campusId || '');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(() => {
    if (task.assigneeIds && task.assigneeIds.length > 0) return task.assigneeIds;
    if (task.assigneeId) return [task.assigneeId];
    return [];
  });
  const [startDate, setStartDate] = useState(task.startDate);
  const [deadline, setDeadline] = useState(task.deadline);
  const [effortEstimate, setEffortEstimate] = useState(task.effortEstimate || '');
  
  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [newCheckText, setNewCheckText] = useState('');

  // Attachments
  const [attachmentLinks, setAttachmentLinks] = useState<AttachmentLink[]>(task.attachmentLinks || []);
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attType, setAttType] = useState<AttachmentLink['type']>('canva');

  // Dependencies
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);

  // Blocking Modal State
  const [isBlockPromptOpen, setIsBlockPromptOpen] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState(task.blockedReason || '');
  const [actionRequiredByInput, setActionRequiredByInput] = useState(task.blockedActionRequiredBy || '');

  // Tab State
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'history'>('details');

  // Direct File Upload State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activities } = useData();
  const taskActivities = useMemo(() => {
    return (activities || []).filter((a) => a.targetId === task.id || a.targetTitle?.includes(task.title));
  }, [activities, task.id, task.title]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const newAtt = await StorageUploadService.uploadTaskAttachment(
        task.organizationId,
        task.id,
        file,
        currentUser?.name || 'Membro',
        (progress) => setUploadProgress(progress)
      );
      setAttachmentLinks((prev) => [...prev, newAtt]);
      setUploadProgress(null);
    } catch (err) {
      console.error('Erro no upload de arquivo:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Comments with @mentions
  const [commentText, setCommentText] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const taskComments = getCommentsForTask(task.id);

  const filteredMentionUsers = useMemo(() => {
    if (!mentionQuery) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [users, mentionQuery]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const afterAt = val.slice(lastAtIdx + 1);
      if (!afterAt.includes('  ')) {
        setMentionQuery(afterAt.trim().toLowerCase());
        setIsMentionOpen(true);
        return;
      }
    }
    setIsMentionOpen(false);
  };

  const handleSelectMention = (user: User) => {
    const lastAtIdx = commentText.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const beforeAt = commentText.slice(0, lastAtIdx);
      const newText = `${beforeAt}@${user.name} `;
      setCommentText(newText);
      setMentionedUserIds((prev) => [...new Set([...prev, user.id])]);
    }
    setIsMentionOpen(false);
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = () => {
    const assigneesList = selectedAssigneeIds.map((id) => {
      const u = users.find((user) => user.id === id);
      return {
        id,
        name: u ? u.name : 'Responsável',
        avatar: u ? u.avatar : undefined,
      };
    });

    updateTask({
      ...task,
      title,
      description,
      status,
      priority,
      eventId: eventId || undefined,
      campusId: campusId || undefined,
      assigneeId: selectedAssigneeIds[0] || undefined,
      assigneeName: assigneesList.length > 0 ? assigneesList.map((a) => a.name).join(', ') : undefined,
      assigneeAvatar: assigneesList[0]?.avatar,
      assigneeIds: selectedAssigneeIds,
      assignees: assigneesList,
      startDate,
      deadline,
      effortEstimate,
      checklist,
      attachmentLinks,
      dependencies,
    });
    onClose();
  };

  const handleToggleCheck = (itemId: string) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    updateTask({ ...task, checklist: updated });
  };

  const handleAddCheckItem = () => {
    if (!newCheckText.trim()) return;
    const newItem: ChecklistItem = {
      id: 'chk_' + Date.now().toString(36),
      text: newCheckText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewCheckText('');
    updateTask({ ...task, checklist: updated });
  };

  const handleRemoveCheckItem = (itemId: string) => {
    const updated = checklist.filter((i) => i.id !== itemId);
    setChecklist(updated);
    updateTask({ ...task, checklist: updated });
  };

  const handleAddAttachment = () => {
    if (!attTitle.trim() || !attUrl.trim()) return;
    const newAtt: AttachmentLink = {
      id: 'att_' + Date.now().toString(36),
      title: attTitle.trim(),
      url: attUrl.trim(),
      type: attType,
    };
    const updated = [...attachmentLinks, newAtt];
    setAttachmentLinks(updated);
    setAttTitle('');
    setAttUrl('');
    updateTask({ ...task, attachmentLinks: updated });
  };

  const handleRemoveAttachment = (attId: string) => {
    const updated = attachmentLinks.filter((a) => a.id !== attId);
    setAttachmentLinks(updated);
    updateTask({ ...task, attachmentLinks: updated });
  };

  const handleAddDependency = (depId: string) => {
    if (!depId || dependencies.includes(depId)) return;
    const updated = [...dependencies, depId];
    setDependencies(updated);
    updateTask({ ...task, dependencies: updated });
  };

  const handleRemoveDependency = (depId: string) => {
    const updated = dependencies.filter((id) => id !== depId);
    setDependencies(updated);
    updateTask({ ...task, dependencies: updated });
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(task.id, commentText.trim(), mentionedUserIds);
    setCommentText('');
    setMentionedUserIds([]);
    setIsMentionOpen(false);
  };

  const handleBlockConfirm = () => {
    if (!blockReasonInput.trim()) return;
    blockTaskWithReason(task.id, blockReasonInput.trim(), actionRequiredByInput.trim());
    setStatus('BLOCKED');
    setIsBlockPromptOpen(false);
  };

  const handleUnblockConfirm = () => {
    unblockTask(task.id);
    setStatus('IN_PROGRESS');
  };

  const handleApproveConfirm = () => {
    approveTask(task.id);
    setStatus('DONE');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <DemandTypeBadge type={task.demandType} />
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
            {task.campusName && (
              <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-700">
                <MapPin className="w-3 h-3 text-rose-400" />
                {task.campusName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canApproveTasks && status === 'REVIEW' && (
              <button
                onClick={handleApproveConfirm}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar Entrega</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Tab Bar */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab('details')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeModalTab === 'details'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Detalhes da Demanda
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModalTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico & Auditoria ({taskActivities.length})</span>
          </button>
        </div>

        {/* Content Body */}
        {activeModalTab === 'details' ? (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Block Alert Banner if BLOCKED */}
          {status === 'BLOCKED' && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Demanda Bloqueada
                  </h4>
                  <p className="text-xs text-rose-200 mt-0.5">
                    Motivo: <strong>{task.blockedReason || 'Aguardando ação externa'}</strong>
                  </p>
                  {task.blockedActionRequiredBy && (
                    <p className="text-[11px] text-rose-300/80 mt-0.5">
                      Ação pendente de: <strong>{task.blockedActionRequiredBy}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => {
                    const { whatsappUrl } = remindPredecessors(task.id);
                    if (whatsappUrl) window.open(whatsappUrl, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Cobrar via WhatsApp
                </button>
                <button
                  onClick={handleUnblockConfirm}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg sm:text-xl font-black text-white bg-transparent border-b border-slate-800 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione orientações detalhadas, briefing, público e referências..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Grid of Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs">
            {/* Status */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value as TaskStatus;
                  if (val === 'BLOCKED') {
                    setIsBlockPromptOpen(true);
                  } else {
                    setStatus(val);
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none"
              >
                <option value="INBOX">1. Inbox</option>
                <option value="PLANNING">2. Planejamento</option>
                <option value="IN_PROGRESS">3. Em Andamento</option>
                <option value="BLOCKED">4. Bloqueado</option>
                <option value="REVIEW">5. Revisão</option>
                <option value="DONE">6. Concluído</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            {/* Responsible Assignees (Multi-select) */}
            <div className="sm:col-span-2">
              <label className="text-slate-400 font-semibold block mb-1">
                Responsáveis ({selectedAssigneeIds.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700 min-h-[38px]">
                {users.map((u) => {
                  const isSelected = selectedAssigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={u.name}
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                      />
                      <span>{u.name.split(' ')[0]}</span>
                      {isSelected && <span className="text-[10px] ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campus */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Campus / Unidade</label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none"
              >
                <option value="">Todos os Campi (Geral)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Projeto / Evento</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700 focus:outline-none"
              >
                <option value="">Nenhum (Demanda Avulsa)</option>
                {events.filter((e) => !e.isArchived).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 rounded-xl bg-slate-800 text-white border border-slate-700"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Prazo Final</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2 py-1 rounded-xl bg-slate-800 text-white border border-slate-700"
              />
            </div>

            {/* Effort */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Estimativa</label>
              <input
                type="text"
                value={effortEstimate}
                onChange={(e) => setEffortEstimate(e.target.value)}
                placeholder="Ex: 8h (1 dia)"
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-white border border-slate-700"
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Checklist / Subtarefas ({checklist.filter((i) => i.completed).length}/{checklist.length})
              </h4>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs transition-colors gap-2"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleCheck(item.id)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-700 border-slate-600 focus:ring-0"
                    />
                    <span className={`truncate ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {item.text}
                    </span>
                  </label>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* Sub-assignee */}
                    <select
                      value={item.assigneeId || ''}
                      onChange={(e) => {
                        const newAssignee = e.target.value;
                        setChecklist((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, assigneeId: newAssignee || undefined } : i))
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-none"
                    >
                      <option value="">Sem responsável</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    {/* Due date */}
                    <input
                      type="date"
                      value={item.dueDate || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setChecklist((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, dueDate: newDate || undefined } : i))
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveCheckItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Novo item do checklist..."
                value={newCheckText}
                onChange={(e) => setNewCheckText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCheckItem();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAddCheckItem}
                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Links & Direct File Upload */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-400" />
                Arquivos & Materiais Anexados ({attachmentLinks.length})
              </h4>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="task-file-upload-input"
                  disabled={isUploading}
                />
                <label
                  htmlFor="task-file-upload-input"
                  className={`px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Enviando...' : 'Enviar Arquivo / Foto'}</span>
                </label>
              </div>
            </div>

            {/* Upload progress bar */}
            {uploadProgress !== null && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                  <span>Enviando arquivo para o Cloud Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Attachments List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachmentLinks.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-850 border border-slate-750 text-xs group hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {att.type === 'image' ? (
                      <img
                        src={att.url}
                        alt={att.title}
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        {att.type === 'video' ? <Film className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 hover:text-indigo-200 font-semibold truncate block"
                      >
                        {att.title}
                      </a>
                      <span className="text-[10px] text-slate-400">
                        {att.size ? (att.size / (1024 * 1024)).toFixed(1) + ' MB • ' : ''}
                        {att.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                      title="Abrir anexo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10"
                      title="Remover anexo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add external Link inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
              <input
                type="text"
                placeholder="Título do link externo..."
                value={attTitle}
                onChange={(e) => setAttTitle(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <input
                type="url"
                placeholder="https://canva.com/..."
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
              <div className="flex gap-2">
                <select
                  value={attType}
                  onChange={(e) => setAttType(e.target.value as AttachmentLink['type'])}
                  className="flex-1 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="canva">Canva</option>
                  <option value="drive">Drive</option>
                  <option value="figma">Figma</option>
                  <option value="document">Doc</option>
                  <option value="other">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Anexar
                </button>
              </div>
            </div>
          </div>

          {/* Dependencies & Predecessors Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                Dependências & Pré-Requisitos ({dependencies.length})
              </h4>
              {dependencies.some((depId) => {
                const dep = tasks.find((t) => t.id === depId);
                return dep && dep.status !== 'DONE';
              }) && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                  Bloqueio Ativo
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Demandas que precisam ser concluídas antes que esta etapa possa avançar no fluxo.
            </p>

            {dependencies.length === 0 ? (
              <p className="text-xs text-slate-500 py-1">Nenhuma dependência prévia cadastrada para esta demanda.</p>
            ) : (
              <div className="space-y-2">
                {dependencies.map((depId) => {
                  const dep = tasks.find((t) => t.id === depId);
                  if (!dep) return null;
                  const isDone = dep.status === 'DONE';

                  return (
                    <div
                      key={dep.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                          : 'bg-amber-950/20 border-amber-500/30 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold truncate">{dep.title}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <StatusBadge status={dep.status} />
                            <span>•</span>
                            <span>{dep.assigneeName || 'Sem responsável'}</span>
                            <span>•</span>
                            <span>Prazo: {new Date(dep.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = remindPredecessors(task.id);
                              if (res.whatsappUrl) {
                                window.open(res.whatsappUrl, '_blank');
                              }
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="Cobrar via WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Cobrar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dep.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remover dependência"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Link New Dependency Dropdown */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Adicionar ou alterar dependência anterior:
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddDependency(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Selecione uma demanda para vincular...</option>
                {tasks
                  .filter((t) => !t.isArchived && t.id !== task.id && !dependencies.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status === 'DONE' ? 'Concluída' : t.status})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Comments & Discussion */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Comentários e Histórico de Feedback ({taskComments.length})
            </h4>

            <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
              {taskComments.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Nenhum comentário registrado ainda.</p>
              ) : (
                taskComments.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-slate-850 border border-slate-750 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{c.userName}</span>
                        <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                          {c.userRole}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {c.content.split(/(@[a-zA-Z0-9_À-ÿ\s]+?)(?=[.,!?]?(\s|$))/g).map((part, pIdx) => {
                        if (part && part.startsWith('@')) {
                          return (
                            <span
                              key={pIdx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-[11px] mx-0.5"
                            >
                              {part}
                            </span>
                          );
                        }
                        return <span key={pIdx}>{part}</span>;
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="relative pt-1">
              {/* Mention Autocomplete Popup */}
              {isMentionOpen && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-scale-in max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 py-1 border-b border-slate-800">
                    Mencionar Membro da Igreja
                  </span>
                  {filteredMentionUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectMention(u)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-800 transition-colors group"
                    >
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-indigo-500/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Escreva um comentário... (digite @ para mencionar membros)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
        ) : (
          /* Tab 2: Activity History & Audit Timeline */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Linha do Tempo de Atividades & Auditoria</span>
              </h4>
              <p className="text-xs text-slate-400">
                Histórico cronológico de movimentações, aprovações e edições realizadas nesta demanda.
              </p>

              {taskActivities.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800/80 text-slate-400 text-xs">
                  Nenhum registro de atividade gravado para esta demanda ainda.
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 pl-7 pt-2">
                  {taskActivities.map((act) => (
                    <div key={act.id} className="relative text-xs space-y-1">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-white font-semibold">{act.userName}</strong>
                        <span className="text-slate-300">{act.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(act.timestamp).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(act.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {canArchive && (
              <button
                type="button"
                onClick={() => {
                  archiveTask(task.id, true);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
              >
                Arquivar Tarefa
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      {/* Block Reason Prompt Modal */}
      {isBlockPromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Motivo do Bloqueio da Demanda
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Registre a justificativa do bloqueio e quem precisa agir para liberar a produção.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo do Impedimento *
              </label>
              <textarea
                rows={2}
                required
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="Ex: Aguardando envio das fotos em alta resolução do batismo..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quem precisa agir? (Nome / Equipe)
              </label>
              <input
                type="text"
                value={actionRequiredByInput}
                onChange={(e) => setActionRequiredByInput(e.target.value)}
                placeholder="Ex: Pr. Tiago Rocha ou Equipe de Fotografia"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBlockPromptOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBlockConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
