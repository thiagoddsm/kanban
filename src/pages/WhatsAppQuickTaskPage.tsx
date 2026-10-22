import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TaskStatus, ChecklistItem, AttachmentLink } from '../types';
import { StorageUploadService } from '../services/storageUploadService';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Tag,
  Paperclip,
  Send,
  MessageSquare,
  ListTodo,
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
  Check,
  Plus,
  Upload,
  Link2,
  Image as ImageIcon,
  Film,
  FileText,
  Download,
  Eye,
  X,
  Maximize2
} from 'lucide-react';

export const WhatsAppQuickTaskPage: React.FC = () => {
  const { orgSlug, taskId } = useParams<{ orgSlug: string; taskId: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask, comments, addComment } = useData();
  const { currentOrganization } = useTenant();
  const { currentUser } = useAuth();
  const { success, warning } = useNotification();

  const [newCommentText, setNewCommentText] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Anexos & Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Link form state
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<AttachmentLink['type']>('canva');

  // Localiza a tarefa
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find(
      (t) => t.id === taskId || t.id.endsWith(taskId) || t.id.includes(taskId)
    );
  }, [tasks, taskId]);

  // Comentários da tarefa
  const taskComments = useMemo(() => {
    if (!task) return [];
    return comments
      .filter((c) => c.taskId === task.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, task]);

  // Status disponíveis para troca rápida
  const statusOptions: { id: TaskStatus; label: string; color: string; activeBg: string }[] = [
    { id: 'PLANNING', label: 'Planejamento', color: 'border-blue-500 text-blue-400', activeBg: 'bg-blue-600 text-white border-blue-500' },
    { id: 'IN_PROGRESS', label: 'Em Andamento', color: 'border-amber-500 text-amber-400', activeBg: 'bg-amber-600 text-white border-amber-500' },
    { id: 'BLOCKED', label: 'Bloqueado', color: 'border-rose-500 text-rose-400', activeBg: 'bg-rose-600 text-white border-rose-500' },
    { id: 'REVIEW', label: 'Revisão', color: 'border-purple-500 text-purple-400', activeBg: 'bg-purple-600 text-white border-purple-500' },
    { id: 'APPROVED', label: 'Aprovado', color: 'border-teal-500 text-teal-400', activeBg: 'bg-teal-600 text-white border-teal-500' },
    { id: 'DONE', label: 'Concluído', color: 'border-emerald-500 text-emerald-400', activeBg: 'bg-emerald-600 text-white border-emerald-500' },
  ];

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Demanda não encontrada</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-xs">
          A tarefa pode ter sido concluída, arquivada ou o link expirou.
        </p>
        <Link
          to={`/${orgSlug || 'ib'}/tasks`}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
        >
          <span>Ir para o Kanban</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Checklist normalizada
  const checklistItems: ChecklistItem[] = (task.checklist || []).map((item, idx) =>
    typeof item === 'string' ? { id: `chk_${idx}`, text: item, completed: false } : item
  );
  const completedCheckCount = checklistItems.filter((i) => i.completed).length;
  const totalCheckCount = checklistItems.length;
  const checkPct = totalCheckCount > 0 ? Math.round((completedCheckCount / totalCheckCount) * 100) : 0;

  // Handler para troca rápida de status
  const handleStatusChange = (newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    const isDone = newStatus === 'DONE';
    const updatedTask = {
      ...task,
      status: newStatus,
      completedAt: isDone ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    updateTask(updatedTask);
    success('Status Atualizado!', `Demanda alterada para "${newStatus}".`);
  };

  // Handler para checklist toggle
  const handleToggleChecklist = (itemId: string) => {
    const updated = checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask({
      ...task,
      checklist: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handler para adicionar novo item no checklist
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;

    const newItem: ChecklistItem = {
      id: 'chk_' + Date.now().toString(36),
      text: newSubtaskText.trim(),
      completed: false,
    };

    const updated = [...checklistItems, newItem];
    updateTask({
      ...task,
      checklist: updated,
      updatedAt: new Date().toISOString(),
    });

    setNewSubtaskText('');
    success('Subtarefa adicionada!');
  };

  // Handler para enviar comentário
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    addComment(task.id, newCommentText.trim());
    setNewCommentText('');
    setIsSubmittingComment(false);
    success('Comentário enviado!', 'Sua resposta foi registrada no Kanban.');
  };

  // Handler para upload direto de arquivos e artes
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const safeOrgId = task.organizationId || currentOrganization?.id || 'default';
      const newAtt = await StorageUploadService.uploadTaskAttachment(
        safeOrgId,
        task.id,
        file,
        currentUser?.name || 'Membro WhatsApp',
        (pct) => setUploadProgress(pct)
      );

      const existing = task.attachmentLinks || [];
      const updatedLinks = [...existing.filter((a) => a.id !== newAtt.id), newAtt];

      updateTask({
        ...task,
        attachmentLinks: updatedLinks,
        updatedAt: new Date().toISOString(),
      });

      success('Arquivo anexado!', `"${file.name}" foi salvo e já está disponível.`);
      setUploadProgress(null);
    } catch (err: any) {
      console.error('Erro no upload na página rápida:', err);
      warning('Falha no Upload', err?.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler para adicionar links externos (Canva, Drive, Figma)
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !linkTitle.trim() || !linkUrl.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('/')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newAtt: AttachmentLink = {
      id: 'att_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      title: linkTitle.trim(),
      url: formattedUrl,
      type: linkType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name || 'Membro WhatsApp',
    };

    const existing = task.attachmentLinks || [];
    const updatedLinks = [...existing, newAtt];

    updateTask({
      ...task,
      attachmentLinks: updatedLinks,
      updatedAt: new Date().toISOString(),
    });

    success('Link adicionado!', `"${newAtt.title}" foi vinculado.`);
    setLinkTitle('');
    setLinkUrl('');
    setIsAddingLink(false);
  };

  // Handler para remover anexo
  const handleRemoveAttachment = async (attId: string) => {
    if (!task) return;
    const attToRemove = task.attachmentLinks?.find((a) => a.id === attId);
    const updatedLinks = (task.attachmentLinks || []).filter((a) => a.id !== attId);

    updateTask({
      ...task,
      attachmentLinks: updatedLinks,
      updatedAt: new Date().toISOString(),
    });

    success('Anexo removido!');

    if (attToRemove?.storagePath) {
      try {
        await StorageUploadService.deleteAttachment(attToRemove.storagePath);
      } catch (err) {
        console.warn('Erro ao deletar arquivo do Storage:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link
          to={`/${orgSlug || 'ib'}/tasks`}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar ao Quadro</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Edição Expressa WhatsApp</span>
          </span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-12">
        {/* Task Header Card */}
        <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} size="sm" />
            </div>

            {task.deadline && (
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-xl border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </span>
            )}
          </div>

          <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
            {task.title}
          </h1>

          {task.description && (
            <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          )}

          {task.campusName && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              <span>{task.campusName}</span>
            </div>
          )}
        </section>

        {/* Anexos & Materiais para Análise (Destaque Principal para Revisores) */}
        <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Anexos & Materiais ({task.attachmentLinks?.length || 0})
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="wa-file-upload-input"
                disabled={isUploading}
              />
              <label
                htmlFor="wa-file-upload-input"
                className={`px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Enviando...' : 'Anexar Arte'}</span>
              </label>

              <button
                type="button"
                onClick={() => setIsAddingLink(!isAddingLink)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                <Link2 className="w-3 h-3" />
                <span>Link</span>
              </button>
            </div>
          </div>

          {/* Upload progress */}
          {uploadProgress !== null && (
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
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

          {/* Form to add link */}
          {isAddingLink && (
            <form onSubmit={handleAddLink} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Adicionar Link Externo</span>
                <button
                  type="button"
                  onClick={() => setIsAddingLink(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Título (ex: Arte Canva, Pasta Drive...)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://canva.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as AttachmentLink['type'])}
                  className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="canva">Canva</option>
                  <option value="drive">Drive</option>
                  <option value="figma">Figma</option>
                  <option value="document">Doc</option>
                  <option value="other">Outro</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Attachments List / Gallery */}
          {(!task.attachmentLinks || task.attachmentLinks.length === 0) ? (
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
              <Paperclip className="w-5 h-5 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Nenhum anexo ou arte vinculada a esta demanda ainda.</p>
              <p className="text-[10px] text-slate-500">Clique em "Anexar Arte" acima para carregar o arquivo ou link do Canva.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Separate Images in a prominent Visual Cards View */}
              {task.attachmentLinks.some((a) => a.type === 'image') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {task.attachmentLinks.filter((a) => a.type === 'image').map((att) => (
                    <div
                      key={att.id}
                      className="group relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md flex flex-col"
                    >
                      <div
                        className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
                        onClick={() => setPreviewImage({ url: att.url, title: att.title })}
                      >
                        <img
                          src={att.url}
                          alt={att.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2 rounded-xl bg-slate-900/80 text-white text-xs font-bold flex items-center gap-1 shadow-lg">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Ampliar</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between gap-2 bg-slate-900/90">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate" title={att.title}>{att.title}</p>
                          <span className="text-[10px] text-slate-400">
                            {att.size ? `${(att.size / (1024 * 1024)).toFixed(1)} MB • ` : ''}ARTE / IMAGEM
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: att.url, title: att.title })}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Ver em tela cheia"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white"
                            title="Abrir imagem original"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other attachments (Canva, Drive, Documents, Videos) */}
              {task.attachmentLinks.filter((a) => a.type !== 'image').map((att) => {
                const isCanva = att.type === 'canva' || att.url.toLowerCase().includes('canva.com');
                const isDrive = att.type === 'drive' || att.url.toLowerCase().includes('drive.google.com');
                const isFigma = att.type === 'figma' || att.url.toLowerCase().includes('figma.com');

                return (
                  <div
                    key={att.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCanva
                          ? 'bg-gradient-to-tr from-cyan-600 to-purple-600 text-white shadow-sm'
                          : isDrive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isFigma
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : att.type === 'video'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {att.type === 'video' ? (
                          <Film className="w-4 h-4" />
                        ) : isCanva || isDrive || isFigma ? (
                          <Link2 className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-white hover:text-indigo-300 truncate block transition-colors"
                        >
                          {att.title}
                        </a>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {att.size ? `${(att.size / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                          {isCanva ? 'Canva' : isDrive ? 'Google Drive' : isFigma ? 'Figma' : att.type}
                        </span>
                      </div>
                    </div>

                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Action 1: Status Picker (1-Touch) */}
        <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Mudar Status com 1 Toque</span>
            </h2>
            <span className="text-[10px] text-slate-400">Status atual: <strong>{task.status}</strong></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {statusOptions.map((opt) => {
              const isActive = task.status === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleStatusChange(opt.id)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                    isActive
                      ? opt.activeBg
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {isActive && <Check className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Action 2: Checklist / Subtarefas (2/3) */}
        <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Subtarefas ({completedCheckCount}/{totalCheckCount})
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-400">{checkPct}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${checkPct}%` }}
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 pt-1">
            {checklistItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                Nenhuma subtarefa adicionada.
              </p>
            ) : (
              checklistItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 select-none active:scale-[0.98] ${
                    item.completed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <span className={`text-xs font-medium leading-relaxed ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    <strong className="text-slate-400 mr-1.5">{idx + 1}.</strong>
                    {item.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Add Subtask Input */}
          <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              placeholder="Adicionar nova subtarefa..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
              title="Adicionar subtarefa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Action 3: Comments & Fast Reply */}
        <section className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Comentários ({taskComments.length})
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">Sincronizado com WhatsApp</span>
          </div>

          {/* Comments List */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {taskComments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Ainda não há comentários nesta demanda.
              </p>
            ) : (
              taskComments.map((cmt) => (
                <div
                  key={cmt.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-indigo-300">{cmt.userName || 'Membro'}</span>
                    <span>{new Date(cmt.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {cmt.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleSendComment} className="space-y-2 pt-1">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Digite sua resposta ou observação..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Resposta</span>
              </button>
            </div>
          </form>
        </section>

        {/* Footer Navigation */}
        <div className="text-center pt-2">
          <Link
            to={`/${orgSlug || 'ib'}/tasks`}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
          >
            <span>Abrir no Quadro Kanban Completo</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </main>

      {/* Modal Lightbox para Ampliar Imagens */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                {previewImage.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Baixar imagem"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[78vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WhatsAppQuickTaskPage;
