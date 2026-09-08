import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { JsonTaskParser, ParsedTaskResult } from '../../services/jsonTaskParser';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';
import { PriorityBadge, StatusBadge, DemandTypeBadge } from '../common/Badge';
import { Task } from '../../types';
import { 
  X, 
  Code2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User as UserIcon, 
  CheckSquare, 
  ArrowRight,
  FileCode,
  Copy,
  Layers
} from 'lucide-react';

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_JSON = `{
  "tarefa": {
    "id": "conf_001",
    "titulo": "Produzir IBM News do dia 27",
    "tags_topo": {
      "tipo": "Vídeo",
      "status_badge": "Em Andamento",
      "prioridade_badge": "Alta",
      "alcance": "Toda a Organização"
    },
    "aba_ativa": "Detalhes da Demanda",
    "descricao_orientacoes": "• Focar na Conferência e nas inscrições para o próximo ciclo do Trilho.\\n• Temas sugeridos: Missão de Casa, Festa Novo Amanhecer e Conferência.",
    "status": "3. Em Andamento",
    "prioridade": "Alta",
    "campus_unidade": "Todos os campus (Geral)",
    "projeto_evento": "Conferência",
    "estimativa": "Médio",
    "datas": {
      "data_inicio": "2026-09-08",
      "prazo_final": "2026-09-27"
    },
    "responsaveis": [
      {
        "nome": "Francisco",
        "selecionado": true
      }
    ],
    "checklist_subtarefas": [
      {
        "id": "sub_01",
        "titulo": "Definir roteiro com os temas da edição",
        "concluida": false,
        "responsavel": "Francisco",
        "prazo": "2026-09-20"
      },
      {
        "id": "sub_02",
        "titulo": "Gravar e publicar o vídeo",
        "concluida": false,
        "responsavel": "Francisco",
        "prazo": "2026-09-27"
      }
    ],
    "arquivos_anexos": [],
    "dependencias_pre_requisitos": [],
    "comentarios_feedback": []
  }
}`;

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { users, events, createTask } = useData();
  const { currentUser } = useAuth();
  const { currentOrganization, campuses } = useTenant();
  const { success, error: notifyError } = useNotification();

  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Parse & Validation
  const parseResult = useMemo(() => {
    if (!jsonInput.trim()) return null;
    return JsonTaskParser.parseJsonInput(jsonInput, {
      organizationId: currentOrganization.id,
      users,
      events,
      campuses,
      currentUserId: currentUser?.id || 'sys',
      currentUserName: currentUser?.name || 'Administrador',
    });
  }, [jsonInput, currentOrganization.id, users, events, campuses, currentUser]);

  const handleLoadSample = () => {
    setJsonInput(SAMPLE_JSON);
  };

  const handleImport = async () => {
    if (!parseResult || !parseResult.success || !parseResult.tasks || parseResult.tasks.length === 0) {
      notifyError('JSON Inválido', parseResult?.error || 'Corrija os erros de formatação do JSON.');
      return;
    }

    setIsSubmitting(true);
    const createdTasksList: Task[] = [];

    try {
      parseResult.tasks.forEach((parsed) => {
        const created = createTask(
          {
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            priority: parsed.priority,
            demandType: parsed.demandType,
            startDate: parsed.startDate,
            deadline: parsed.deadline,
            effortEstimate: parsed.effortEstimate,
            campusId: parsed.campusId,
            eventId: parsed.eventId,
            assigneeIds: parsed.assigneeIds,
            checklist: parsed.checklist,
            tags: parsed.tags,
            requesterId: currentUser?.id || 'sys',
            requesterName: currentUser?.name || 'Sistema',
            attachmentLinks: [],
          },
          { skipNotification: true } // Não envia individualmente para não inundar o WhatsApp
        );
        createdTasksList.push(created);
      });

      // Dispara resumo consolidado do WhatsApp (Apenas 1 mensagem por responsável com todas as suas tarefas)
      let wppSentCount = 0;
      try {
        const batchRes = await WhatsAppNotificationService.notifyBatchTasksAssigned({
          organization: currentOrganization,
          tasks: createdTasksList,
          allUsers: users,
          actorUser: currentUser,
        });
        wppSentCount = batchRes.sentCount;
      } catch (wppErr) {
        console.warn('[WhatsApp Batch Error]:', wppErr);
      }

      success(
        'Importação Concluída!',
        `${createdTasksList.length} tarefa(s) adicionada(s) ao quadro.${
          wppSentCount > 0 ? ` Resumo enviado no WhatsApp para ${wppSentCount} membro(s).` : ''
        }`
      );
      onClose();
    } catch (err: any) {
      notifyError('Erro ao criar tarefas', err?.message || 'Falha ao salvar no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Criar Tarefas via JSON
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  IMPORTAÇÃO DIRETA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cole o payload JSON para gerar cards instantâneos no Kanban com subtarefas, prazos e responsáveis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exemplo Padrão</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (Grid 2 cols: Code Editor + Live Preview) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 custom-scrollbar">
          {/* Left: JSON Editor */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Editor JSON</span>
              </span>

              {parseResult && (
                <div>
                  {parseResult.success ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{parseResult.tasks?.length || 1} tarefa(s) detectada(s)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <AlertCircle className="w-3 h-3" />
                      <span>JSON Inválido</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <textarea
              rows={16}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Cole o JSON da tarefa aqui..."
              className="flex-1 w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500 shadow-inner custom-scrollbar"
              spellCheck={false}
            />

            {parseResult && !parseResult.success && (
              <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 font-mono">
                {parseResult.error}
              </p>
            )}
          </div>

          {/* Right: Live Preview */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Pré-visualização do Card</span>
              </span>
              <span className="text-[11px] text-slate-500">Renderização em Tempo Real</span>
            </div>

            {parseResult?.success && parseResult.tasks && parseResult.tasks.length > 0 ? (
              <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
                {parseResult.tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-xl"
                  >
                    {/* Header Badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <DemandTypeBadge type={task.demandType} size="sm" />
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} size="sm" />
                      </div>
                      {task.campusName && (
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {task.campusName}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 whitespace-pre-line bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Event & Dates */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">Prazo: {task.deadline}</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {task.assigneeIds.length > 0
                            ? `${task.assigneeIds.length} Responsável(is)`
                            : 'Sem responsável'}
                        </span>
                      </div>
                    </div>

                    {/* Checklist Subtasks */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Subtarefas ({task.checklist.length})</span>
                        </p>
                        <div className="space-y-1">
                          {task.checklist.map((sub, sIdx) => (
                            <div
                              key={sub.id || sIdx}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300"
                            >
                              <span className="truncate">{sub.text}</span>
                              {sub.dueDate && (
                                <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                                  {sub.dueDate}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 space-y-2">
                <Code2 className="w-8 h-8 text-slate-600" />
                <p className="text-xs">Cole um JSON válido à esquerda para visualizar a prévia.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={!parseResult?.success || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Criando Tarefas...'
                : `Importar ${parseResult?.tasks?.length || 1} Tarefa(s)`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
