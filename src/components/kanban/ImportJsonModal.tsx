import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { JsonTaskParser, ParsedTaskResult } from '../../services/jsonTaskParser';
import { 
  AiTranscriptionService, 
  AI_MODELS, 
  AiModelId, 
  AiTaskItem 
} from '../../services/aiTranscriptionService';
import { WhatsAppNotificationService } from '../../services/whatsappNotificationService';
import { PriorityBadge, StatusBadge, DemandTypeBadge } from '../common/Badge';
import { Task, TaskPriority, TaskStatus } from '../../types';
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
  Layers,
  Key,
  ExternalLink,
  Loader2,
  Trash2,
  Plus,
  Edit3,
  Bot,
  Settings2,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  FolderPlus
} from 'lucide-react';

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface EditableTaskItem {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  demandType: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  deadline: string;
  assigneeIds: string[];
  campusId?: string;
  campusName?: string;
  eventId?: string;
  eventName?: string;
  effortEstimate?: string;
  checklist: Array<{
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    assigneeId?: string;
  }>;
  tags: string[];
  isExpanded?: boolean;
}

const SAMPLE_MEETING_TRANSCRIPT = `Reunião Semanal de Comunicação & Mídia - Alinhamento de Demandas:

1. Produzir o vídeo do IBM News do dia 27:
- O Francisco é o responsável pela gravação e edição.
- Prazo final: 2026-09-27.
- Subtarefas acordadas: Definir roteiro até 2026-09-20 e gravar o material no templo.
- Focar na divulgação da Conferência e no encerramento das inscrições do Trilho.

2. Identidade Visual e Carrossel para a Conferência:
- A equipe de design fica encarregada das artes para o Instagram.
- Prazo de entrega: próxima sexta-feira. Prioridade Alta.
- Subtarefas: Escolher paleta de cores oficial, criar slide de telão (16:9) e post carrossel de 5 lâminas.

3. Transmissão e Redes Sociais do Culto de Domingo:
- Prazo: Domingo pela manhã. Prioridade Urgente.
- Subtarefas: Checar cabos das câmeras, testar microfones sem fio e atualizar overlays da live.`;

const SAMPLE_JSON = `{
  "tarefas": [
    {
      "id": "conf_001",
      "titulo": "Produzir IBM News do dia 27",
      "descricao_orientacoes": "• Focar na Conferência e nas inscrições para o próximo ciclo do Trilho.\\n• Temas sugeridos: Missão de Casa e Festa Novo Amanhecer.",
      "status": "Em Andamento",
      "prioridade": "Alta",
      "tipo": "Vídeo",
      "campus_unidade": "Todos os campus (Geral)",
      "projeto_evento": "Conferência",
      "datas": {
        "data_inicio": "2026-09-13",
        "prazo_final": "2026-09-27"
      },
      "responsaveis": [
        { "nome": "Francisco", "selecionado": true }
      ],
      "checklist_subtarefas": [
        { "titulo": "Definir roteiro da edição", "concluida": false, "prazo": "2026-09-20" },
        { "titulo": "Gravar e publicar vídeo", "concluida": false, "prazo": "2026-09-27" }
      ]
    }
  ]
}`;

export const ImportJsonModal: React.FC<ImportJsonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { users, events, demandTypes, createTask } = useData();
  const { currentUser } = useAuth();
  const { currentOrganization, campuses } = useTenant();
  const { success, warning, error: notifyError } = useNotification();

  // Abas de Entrada: 'ai' (Transcrição / Granola) ou 'json' (Editor JSON Direto)
  const [activeTab, setActiveTab] = useState<'ai' | 'json'>('ai');

  // Estado da IA
  const [transcriptInput, setTranscriptInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<AiModelId>(() => 
    AiTranscriptionService.getSelectedModel(currentOrganization.id, currentUser?.id || 'sys')
  );
  const [apiKey, setApiKey] = useState(() => 
    AiTranscriptionService.getApiKey(currentOrganization.id, currentUser?.id || 'sys')
  );
  const [isConfiguringKey, setIsConfiguringKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<string | null>(null);

  // Estado do JSON
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);

  // Estado de Revisão e Edição Interativa das Tarefas Extraídas
  const [editableTasks, setEditableTasks] = useState<EditableTaskItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualiza chave temporária ao abrir a edição da chave
  useEffect(() => {
    setTempApiKey(apiKey);
  }, [isConfiguringKey, apiKey]);

  // Sincroniza modelo selecionado
  const handleModelChange = (newModel: AiModelId) => {
    setSelectedModel(newModel);
    AiTranscriptionService.setSelectedModel(currentOrganization.id, currentUser?.id || 'sys', newModel);
  };

  // Salva chave do Gemini com isolamento SaaS por tenant e usuário
  const handleSaveApiKey = () => {
    AiTranscriptionService.setApiKey(currentOrganization.id, currentUser?.id || 'sys', tempApiKey);
    setApiKey(tempApiKey);
    setIsConfiguringKey(false);
    if (tempApiKey.trim()) {
      success('Chave da IA salva com sucesso para o seu usuário!');
    } else {
      warning('Chave removida.');
    }
  };

  // Parse do JSON na aba direta
  const parsedJsonResult = useMemo(() => {
    if (activeTab !== 'json' || !jsonInput.trim()) return null;
    return JsonTaskParser.parseJsonInput(jsonInput, {
      organizationId: currentOrganization.id,
      users,
      events,
      campuses,
      currentUserId: currentUser?.id || 'sys',
      currentUserName: currentUser?.name || 'Administrador',
    });
  }, [activeTab, jsonInput, currentOrganization.id, users, events, campuses, currentUser]);

  // Sincroniza tarefas a partir do editor JSON quando ativo
  useEffect(() => {
    if (activeTab === 'json' && parsedJsonResult?.success && parsedJsonResult.tasks) {
      const mapped: EditableTaskItem[] = parsedJsonResult.tasks.map((t, idx) => ({
        id: 'json_task_' + idx + '_' + Date.now(),
        selected: true,
        title: t.title,
        description: t.description,
        demandType: t.demandType,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        deadline: t.deadline,
        assigneeIds: t.assigneeIds,
        campusId: t.campusId,
        campusName: t.campusName,
        eventId: t.eventId,
        eventName: t.eventName,
        effortEstimate: t.effortEstimate,
        checklist: t.checklist.map((c) => ({ ...c })),
        tags: t.tags || [],
        isExpanded: idx === 0,
      }));
      setEditableTasks(mapped);
    }
  }, [activeTab, parsedJsonResult]);

  // Ação: Chamar Gemini para analisar a transcrição da reunião
  const handleAnalyzeTranscriptWithAi = async () => {
    if (!apiKey.trim()) {
      setIsConfiguringKey(true);
      notifyError('Chave do Gemini necessária', 'Configure sua chave do Google AI Studio para interpretar a reunião.');
      return;
    }

    if (!transcriptInput.trim() || transcriptInput.trim().length < 15) {
      notifyError('Texto muito curto', 'Por favor, cole as anotações ou a transcrição da reunião para a IA analisar.');
      return;
    }

    setIsAnalyzingAi(true);
    setMeetingSummary(null);

    try {
      const response = await AiTranscriptionService.extractTasksFromTranscript({
        transcriptText: transcriptInput,
        apiKey,
        model: selectedModel,
        context: {
          organizationName: currentOrganization.name,
          users,
          events,
          campuses,
          demandTypes,
        },
      });

      if (!response.success || !response.tasks) {
        notifyError('Falha na análise', response.error || 'Não foi possível extrair tarefas desta transcrição.');
        return;
      }

      // Converte e normatiza através do JsonTaskParser
      const normalized = JsonTaskParser.normalizeTasksList(response.tasks, {
        organizationId: currentOrganization.id,
        users,
        events,
        campuses,
        currentUserId: currentUser?.id || 'sys',
        currentUserName: currentUser?.name || 'Administrador',
      });

      const mapped: EditableTaskItem[] = normalized.map((t, idx) => ({
        id: 'ai_task_' + idx + '_' + Date.now(),
        selected: true,
        title: t.title,
        description: t.description,
        demandType: t.demandType,
        status: t.status,
        priority: t.priority,
        startDate: t.startDate,
        deadline: t.deadline,
        assigneeIds: t.assigneeIds,
        campusId: t.campusId,
        campusName: t.campusName,
        eventId: t.eventId,
        eventName: t.eventName,
        effortEstimate: t.effortEstimate,
        checklist: t.checklist.map((c) => ({ ...c })),
        tags: t.tags || [],
        isExpanded: idx === 0,
      }));

      setEditableTasks(mapped);
      if (response.summary) {
        setMeetingSummary(response.summary);
      }

      success(
        'Tarefas Extraídas com Sucesso!',
        `A IA identificou ${mapped.length} demanda(s) acionável(is). Você pode revisá-las e editá-las à direita.`
      );
    } catch (err: any) {
      notifyError('Erro na requisição da IA', err?.message || 'Falha ao conectar com o serviço do Gemini.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Funções de manipulação e edição interativa de tarefas
  const handleToggleTaskSelect = (id: string) => {
    setEditableTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = editableTasks.every((t) => t.selected);
    setEditableTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  };

  const handleUpdateTaskField = <K extends keyof EditableTaskItem>(
    id: string,
    field: K,
    value: EditableTaskItem[K]
  ) => {
    setEditableTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleToggleExpand = (id: string) => {
    setEditableTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setEditableTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Checklist de subtarefas
  const handleAddChecklistItem = (taskId: string) => {
    setEditableTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newItem = {
          id: 'chk_' + Date.now().toString(36) + '_' + (t.checklist.length + 1),
          text: 'Nova etapa a realizar',
          completed: false,
          dueDate: t.deadline,
          assigneeId: t.assigneeIds[0],
        };
        return { ...t, checklist: [...t.checklist, newItem] };
      })
    );
  };

  const handleUpdateChecklistItem = (
    taskId: string,
    chkId: string,
    field: 'text' | 'completed' | 'dueDate',
    val: any
  ) => {
    setEditableTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          checklist: t.checklist.map((c) => (c.id === chkId ? { ...c, [field]: val } : c)),
        };
      })
    );
  };

  const handleDeleteChecklistItem = (taskId: string, chkId: string) => {
    setEditableTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          checklist: t.checklist.filter((c) => c.id !== chkId),
        };
      })
    );
  };

  // Criar uma nova tarefa manual na lista de revisão
  const handleAddNewManualTask = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const newTask: EditableTaskItem = {
      id: 'task_manual_' + Date.now(),
      selected: true,
      title: 'Nova demanda alinhada',
      description: '',
      demandType: demandTypes[0]?.label || 'Arte',
      status: 'INBOX',
      priority: 'MEDIUM',
      startDate: today,
      deadline: defaultDeadline,
      assigneeIds: users[0] ? [users[0].id] : [],
      checklist: [],
      tags: ['Importado IA'],
      isExpanded: true,
    };
    setEditableTasks((prev) => [newTask, ...prev]);
  };

  // Contagem de tarefas selecionadas
  const selectedTasks = editableTasks.filter((t) => t.selected);

  // Ação Final: Salvar no Kanban / Firestore
  const handleImportSelected = async () => {
    if (selectedTasks.length === 0) {
      notifyError('Nenhuma tarefa selecionada', 'Selecione pelo menos uma tarefa para importar.');
      return;
    }

    setIsSubmitting(true);
    const createdTasksList: Task[] = [];

    try {
      selectedTasks.forEach((item) => {
        const created = createTask(
          {
            title: item.title.trim() || 'Nova Demanda Importada',
            description: item.description,
            status: item.status,
            priority: item.priority,
            demandType: item.demandType,
            startDate: item.startDate,
            deadline: item.deadline,
            effortEstimate: item.effortEstimate || 'Médio',
            campusId: item.campusId,
            campusName: item.campusName,
            eventId: item.eventId,
            eventName: item.eventName,
            assigneeIds: item.assigneeIds,
            checklist: item.checklist,
            tags: item.tags.length > 0 ? item.tags : ['Importação IA'],
            requesterId: currentUser?.id || 'sys',
            requesterName: currentUser?.name || 'Sistema',
            attachmentLinks: [],
          },
          { skipNotification: true } // Não dispara spam individual no WhatsApp
        );
        createdTasksList.push(created);
      });

      // Dispara resumo consolidado do WhatsApp (Apenas 1 mensagem agrupada por responsável)
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
        'Tarefas Importadas com Sucesso!',
        `${createdTasksList.length} demanda(s) adicionada(s) ao Kanban.${
          wppSentCount > 0 ? ` Notificação WhatsApp enviada para ${wppSentCount} membro(s).` : ''
        }`
      );
      onClose();
    } catch (err: any) {
      notifyError('Erro ao criar tarefas', err?.message || 'Falha ao gravar no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* ── TOP HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Criar Tarefas com IA / JSON
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  GRANOLA & IA EM TEMPO REAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cole a ata ou notas da reunião do Granola para extrair tarefas com o Gemini, ou use o editor JSON.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status / Configuração da Chave da IA */}
            <button
              type="button"
              onClick={() => setIsConfiguringKey(!isConfiguringKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                apiKey.trim()
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
              }`}
              title="Configurar chave de API pessoal do Gemini (Isolamento Multi-tenant)"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey.trim() ? 'Chave Conectada' : 'Configurar Chave IA'}</span>
              <Settings2 className="w-3 h-3 opacity-60" />
            </button>

            {/* Fechar Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BANNER / MODAL DE CONFIGURAÇÃO DE CHAVE GEMINI (ISOLAMENTO MULTI-TENANT) ── */}
        {isConfiguringKey && (
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-indigo-500/30 animate-fade-in text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Configurar Chave Google Gemini do seu Usuário</span>
              </div>
              <button
                onClick={() => setIsConfiguringKey(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed max-w-3xl">
              <strong>Isolamento Multi-Tenant Garantido:</strong> Sua chave de API fica salva estritamente para o seu perfil (<strong>{currentUser?.name}</strong>) dentro desta organização (<strong>{currentOrganization.name}</strong>). Nenhum outro usuário ou tenant tem acesso aos seus créditos.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKeyText ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Cole sua chave de API do Gemini (AIzaSy...)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono focus:outline-none focus:border-indigo-500 pr-16 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyText(!showApiKeyText)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800"
                >
                  {showApiKeyText ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar para Meu Usuário</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Não tem uma chave?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Obtenha sua chave gratuita no Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* ── SUBHEADER COM ABAS DE ENTRADA & SELETORES ───────────────── */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Abas */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transcrição / Ata (IA)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'json'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor JSON Direto</span>
            </button>
          </div>

          {/* Controles da IA (Apenas se aba IA ativa) */}
          {activeTab === 'ai' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-slate-400">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modelo:</span>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value as AiModelId)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.tag})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setTranscriptInput(SAMPLE_MEETING_TRANSCRIPT)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Inserir ata típica de teste"
              >
                <FileCode className="w-3 h-3 text-amber-400" />
                <span>Exemplo de Reunião</span>
              </button>
            </div>
          )}

          {activeTab === 'json' && (
            <button
              type="button"
              onClick={() => setJsonInput(SAMPLE_JSON)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              <span>Carregar JSON Exemplo</span>
            </button>
          )}
        </div>

        {/* ── BODY: GRID 2 COLUNAS (ENTRADA + PAINEL INTERATIVO DE EDIÇÃO) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar">
          
          {/* COLUNA ESQUERDA: ENTRADA (IA OU JSON) - 5 Colunas */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {activeTab === 'ai' ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Anotações ou Transcrição do Granola</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {transcriptInput.length} caractere(s)
                  </span>
                </div>

                <textarea
                  rows={14}
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  placeholder={`Cole aqui as notas da reunião, ata ou transcrição do Granola, Otter, Whisper...\n\nA IA utilizará os nomes reais da sua equipe (${users.slice(0, 3).map((u) => u.name).join(', ')}...) e projetos para associar automaticamente as tarefas.`}
                  className="flex-1 w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 shadow-inner custom-scrollbar resize-none leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleAnalyzeTranscriptWithAi}
                  disabled={isAnalyzingAi || !transcriptInput.trim()}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 disabled:opacity-40 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
                >
                  {isAnalyzingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Interpretando Transcrição com {selectedModel}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Interpretar e Gerar Tarefas com IA</span>
                    </>
                  )}
                </button>

                {/* Resumo da Reunião (Se retornado pela IA) */}
                {meetingSummary && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <p className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Resumo da Reunião (Identificado pela IA):</span>
                    </p>
                    <p className="text-slate-300 leading-relaxed">{meetingSummary}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span>Payload JSON</span>
                  </span>

                  {parsedJsonResult && (
                    <div>
                      {parsedJsonResult.success ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{parsedJsonResult.tasks?.length || 1} tarefa(s) detectada(s)</span>
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
                  className="flex-1 w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500 shadow-inner custom-scrollbar resize-none"
                  spellCheck={false}
                />

                {parsedJsonResult && !parsedJsonResult.success && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 font-mono">
                    {parsedJsonResult.error}
                  </p>
                )}
              </>
            )}
          </div>

          {/* COLUNA DIREITA: PAINEL DE VALIDAÇÃO E EDIÇÃO INTERATIVA - 7 Colunas */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Revisão e Edição de Tarefas ({editableTasks.length})</span>
                </span>
                {editableTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline ml-1"
                  >
                    {editableTasks.every((t) => t.selected) ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddNewManualTask}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  title="Adicionar outra tarefa manualmente na lista"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nova Demanda</span>
                </button>
              </div>
            </div>

            {/* LISTA INTERATIVA DE CARDS EDITÁVEIS */}
            {editableTasks.length > 0 ? (
              <div className="space-y-3.5 overflow-y-auto max-h-[500px] pr-1.5 custom-scrollbar">
                {editableTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl border transition-all ${
                      task.selected
                        ? 'bg-slate-950 border-slate-800 shadow-xl'
                        : 'bg-slate-950/50 border-slate-900 opacity-60'
                    }`}
                  >
                    {/* Header do Card com Checkbox, Título Rápido e Botão de Expandir */}
                    <div className="p-3.5 flex items-center gap-3 border-b border-slate-800/80">
                      <input
                        type="checkbox"
                        checked={task.selected}
                        onChange={() => handleToggleTaskSelect(task.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                        title={task.selected ? 'Desmarcar para não importar' : 'Marcar para importar'}
                      />

                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleUpdateTaskField(task.id, 'title', e.target.value)}
                          placeholder="Título da demanda..."
                          className="w-full bg-transparent font-bold text-white text-xs sm:text-sm focus:outline-none focus:bg-slate-900/60 rounded px-1.5 py-0.5 border border-transparent focus:border-indigo-500/50 truncate"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(task.id)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 font-semibold"
                        >
                          <span>{task.isExpanded ? 'Recolher' : 'Editar'}</span>
                          {task.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remover esta tarefa da lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Linha de Badges Rápidos quando recolhido */}
                    {!task.isExpanded && (
                      <div className="p-3 flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold text-[11px]">
                            {task.demandType}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold text-[11px]">
                            Prazo: {task.deadline}
                          </span>
                          <span className="text-[11px] text-emerald-400">
                            {task.assigneeIds.length > 0
                              ? `${users.find((u) => u.id === task.assigneeIds[0])?.name || 'Responsável'}`
                              : 'Sem responsável'}
                          </span>
                        </div>
                        {task.checklist.length > 0 && (
                          <span className="text-[11px] text-cyan-400 font-mono">
                            {task.checklist.length} subtarefa(s)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Corpo Completo e Editável (quando Expandido) */}
                    {task.isExpanded && (
                      <div className="p-4 space-y-3.5 bg-slate-950/80 rounded-b-2xl animate-fade-in text-xs">
                        {/* Linha 1: Tipo, Prioridade, Status */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Tipo
                            </label>
                            <select
                              value={task.demandType}
                              onChange={(e) => handleUpdateTaskField(task.id, 'demandType', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              {demandTypes.map((dt) => (
                                <option key={dt.id} value={dt.label}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Prioridade
                            </label>
                            <select
                              value={task.priority}
                              onChange={(e) => handleUpdateTaskField(task.id, 'priority', e.target.value as TaskPriority)}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              <option value="LOW">Baixa</option>
                              <option value="MEDIUM">Média</option>
                              <option value="HIGH">Alta</option>
                              <option value="URGENT">Urgente</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Status Inicial
                            </label>
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskField(task.id, 'status', e.target.value as TaskStatus)}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              <option value="INBOX">Triagem (Inbox)</option>
                              <option value="PLANNING">Planejamento</option>
                              <option value="IN_PROGRESS">Em Andamento</option>
                            </select>
                          </div>
                        </div>

                        {/* Linha 2: Responsável Principal, Prazo, Campus, Evento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-emerald-400" />
                              <span>Responsável Principal</span>
                            </label>
                            <select
                              value={task.assigneeIds[0] || ''}
                              onChange={(e) =>
                                handleUpdateTaskField(
                                  task.id,
                                  'assigneeIds',
                                  e.target.value ? [e.target.value] : []
                                )
                              }
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">Nenhum (Atribuir depois)</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-400" />
                              <span>Prazo Final</span>
                            </label>
                            <input
                              type="date"
                              value={task.deadline}
                              onChange={(e) => handleUpdateTaskField(task.id, 'deadline', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-cyan-400" />
                              <span>Campus / Unidade</span>
                            </label>
                            <select
                              value={task.campusId || ''}
                              onChange={(e) => {
                                const cId = e.target.value;
                                const camp = campuses.find((c) => c.id === cId);
                                handleUpdateTaskField(task.id, 'campusId', cId || undefined);
                                handleUpdateTaskField(task.id, 'campusName', camp ? camp.name : undefined);
                              }}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">Toda a Organização / Geral</option>
                              {campuses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FolderPlus className="w-3 h-3 text-amber-400" />
                              <span>Projeto / Evento</span>
                            </label>
                            <select
                              value={task.eventId || ''}
                              onChange={(e) => {
                                const evId = e.target.value;
                                const ev = events.find((item) => item.id === evId);
                                handleUpdateTaskField(task.id, 'eventId', evId || undefined);
                                handleUpdateTaskField(task.id, 'eventName', ev ? ev.title : undefined);
                              }}
                              className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">Nenhum Projeto Específico</option>
                              {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Descrição / Orientações */}
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Orientações / Briefing da Reunião
                          </label>
                          <textarea
                            rows={3}
                            value={task.description}
                            onChange={(e) => handleUpdateTaskField(task.id, 'description', e.target.value)}
                            placeholder="Instruções ou apontamentos acordados..."
                            className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-sans text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
                          />
                        </div>

                        {/* Checklist de Subtarefas com Edição Inline */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-cyan-400" />
                              <span>Subtarefas / Checklist ({task.checklist.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddChecklistItem(task.id)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Adicionar Etapa</span>
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {task.checklist.map((chk) => (
                              <div
                                key={chk.id}
                                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800/80"
                              >
                                <input
                                  type="checkbox"
                                  checked={chk.completed}
                                  onChange={(e) =>
                                    handleUpdateChecklistItem(task.id, chk.id, 'completed', e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 shrink-0"
                                />

                                <input
                                  type="text"
                                  value={chk.text}
                                  onChange={(e) =>
                                    handleUpdateChecklistItem(task.id, chk.id, 'text', e.target.value)
                                  }
                                  placeholder="Descrição da subtarefa..."
                                  className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none border-none p-0"
                                />

                                <input
                                  type="date"
                                  value={chk.dueDate || ''}
                                  onChange={(e) =>
                                    handleUpdateChecklistItem(task.id, chk.id, 'dueDate', e.target.value)
                                  }
                                  className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 rounded px-1 py-0.5"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(task.id, chk.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-500 space-y-2 min-h-[300px]">
                <Sparkles className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">
                  Nenhuma demanda interpretada ainda.
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  {activeTab === 'ai'
                    ? 'Cole as anotações da reunião ou a transcrição do Granola à esquerda e clique em "Interpretar e Gerar Tarefas com IA".'
                    : 'Insira um payload JSON válido à esquerda para carregar a lista de tarefas.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER: AÇÕES FINAIS E IMPORTAÇÃO EM LOTE ───────────────── */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            {editableTasks.length > 0 && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {selectedTasks.length} de {editableTasks.length} tarefa(s) selecionada(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedTasks.length === 0 || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Demandas no Kanban...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Importar {selectedTasks.length} Demanda(s) Selecionada(s)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
