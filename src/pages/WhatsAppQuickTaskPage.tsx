import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TaskStatus, ChecklistItem } from '../types';
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
  Plus
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
    </div>
  );
};
export default WhatsAppQuickTaskPage;
