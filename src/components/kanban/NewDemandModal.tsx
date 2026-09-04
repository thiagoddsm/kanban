import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { TaskPriority, TaskStatus, DemandType, AttachmentLink, ChecklistItem } from '../../types';
import { DEMAND_TYPES } from '../../services/mockData';
import { X, Trash2, Link2, CheckSquare, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

interface NewDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
}

export const NewDemandModal: React.FC<NewDemandModalProps> = ({
  isOpen,
  onClose,
  defaultStatus = 'INBOX',
}) => {
  const { events, users, tasks, createTask, demandTypes } = useData();
  const { currentUser } = useAuth();
  const { campuses, currentCampus } = useTenant();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [demandType, setDemandType] = useState<string>(() => demandTypes[0]?.type || 'ARTE');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [eventId, setEventId] = useState('');
  const [campusId, setCampusId] = useState(currentCampus?.id || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [effortEstimate, setEffortEstimate] = useState('Médio');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  
  // Attachments
  const [attachmentLinks, setAttachmentLinks] = useState<AttachmentLink[]>([]);
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attType, setAttType] = useState<AttachmentLink['type']>('canva');

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checkText, setCheckText] = useState('');

  if (!isOpen) return null;

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddAttachment = () => {
    if (!attTitle.trim() || !attUrl.trim()) return;
    setAttachmentLinks([
      ...attachmentLinks,
      {
        id: 'att_' + Date.now().toString(36),
        title: attTitle.trim(),
        url: attUrl.trim(),
        type: attType,
      },
    ]);
    setAttTitle('');
    setAttUrl('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachmentLinks(attachmentLinks.filter((a) => a.id !== id));
  };

  const handleAddCheckItem = () => {
    if (!checkText.trim()) return;
    setChecklist([
      ...checklist,
      {
        id: 'chk_' + Date.now().toString(36),
        text: checkText.trim(),
        completed: false,
      },
    ]);
    setCheckText('');
  };

  const handleRemoveCheckItem = (id: string) => {
    setChecklist(checklist.filter((c) => c.id !== id));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalTags = tagInput
      ? Array.from(new Set([...tags, ...tagInput.split(',').map((t) => t.trim()).filter(Boolean)]))
      : tags;

    createTask({
      title: title.trim(),
      description: description.trim(),
      demandType,
      status,
      priority,
      eventId: eventId || undefined,
      campusId: campusId || undefined,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      assigneeId: selectedAssigneeIds[0] || undefined,
      assigneeIds: selectedAssigneeIds,
      startDate,
      deadline,
      effortEstimate,
      tags: finalTags,
      attachmentLinks,
      dependencies,
      checklist,
    });

    onClose();
  };

  const availablePredecessors = tasks.filter((t) => !t.isArchived);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Formulário de Entrada</span>
          </div>
          <h2 className="text-xl font-bold text-white">Nova Demanda / Tarefa</h2>
          <p className="text-xs text-slate-400 mt-1">
            Preencha os dados e etapas para dar entrada no fluxo de produção da equipe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Demand Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Título da Demanda *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Carrossel Instagram: Lançamento da Campanha"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Demanda *
              </label>
              <select
                value={demandType}
                onChange={(e) => setDemandType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {demandTypes.map((d) => (
                  <option key={d.type} value={d.type}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descrição & Briefing Detalhado
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo, público-alvo, dimensões, referências e orientações da demanda..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Row: Event, Campus & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Campus / Unidade
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Geral (Todos os campus)</option>

                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Projeto / Evento
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Nenhum (Demanda Geral)</option>
                {events.filter((e) => !e.isArchived).map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Responsáveis ({selectedAssigneeIds.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700 min-h-[42px]">
                {users.map((u) => {
                  const isSelected = selectedAssigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
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
                      <span>{u.name}</span>
                      {isSelected && <span className="text-[10px] ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row: Status, Priority, Effort, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Coluna Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="INBOX">1. Inbox</option>
                <option value="PLANNING">2. Planejamento</option>
                <option value="IN_PROGRESS">3. Em Andamento</option>
                <option value="BLOCKED">4. Bloqueado</option>
                <option value="REVIEW">5. Revisão</option>
                <option value="DONE">6. Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prazo Final
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tags / Etiquetas (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Ex: Instagram, Vídeo, Telão LED, Impresso"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Predecessor Dependencies */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Tarefas Predecessoras (Dependências para Bloqueio)</span>
            </label>
            <select
              multiple
              value={dependencies}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setDependencies(selected);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 h-24 custom-scrollbar"
            >
              {availablePredecessors.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status}] {t.title} ({t.assigneeName || 'Sem responsável'})
                </option>
              ))}
            </select>
          </div>

          {/* Attachment Links */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              Links de Anexos (Google Drive, Canva, Figma)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Título do link (ex: Canva Arte)"
                value={attTitle}
                onChange={(e) => setAttTitle(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500"
              />
              <div className="flex gap-2">
                <select
                  value={attType}
                  onChange={(e) => setAttType(e.target.value as AttachmentLink['type'])}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="canva">Canva</option>
                  <option value="drive">Google Drive</option>
                  <option value="figma">Figma</option>
                  <option value="document">Documento</option>
                  <option value="other">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {attachmentLinks.length > 0 && (
              <div className="space-y-1 pt-1">
                {attachmentLinks.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs"
                  >
                    <span className="text-slate-200 truncate">{a.title} ({a.type})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(a.id)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
            >
              Criar Demanda
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
