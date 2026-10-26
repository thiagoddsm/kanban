import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  Activity,
  Cpu,
  X,
  Square,
  Sparkles,
  Network,
  Cloud,
  FileText,
  Users,
  RefreshCw,
  Key,
  Check,
  CheckCircle2,
  PlusCircle,
  Copy,
  Play,
  Trash2,
  AlertCircle,
  Radio,
  LayoutGrid,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  Loader2,
  Save,
  History,
  Clock,
  Bookmark,
  ChevronRight,
  FolderOpen,
  Tv,
  Printer,
  Maximize2,
  Minimize2,
  Edit3,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  UserCheck,
  HelpCircle
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import {
  AiTranscriptionService,
  AiLiveMeetingHelper,
  AI_MODELS,
  AiModelId,
  LiveMeetingIntelligence,
  WordCloudEntry
} from '../services/aiTranscriptionService';
import { JsonTaskParser } from '../services/jsonTaskParser';
import { FirestoreRepository } from '../services/firestoreRepository';
import { StorageService } from '../services/storageService';
import { JarvisMeetingSession, JarvisTranscriptSegment } from '../types';

type TranscriptSegment = JarvisTranscriptSegment;

type JarvisMainMode = 'assistant' | 'meeting';
type MeetingHudTab = 'ALL' | 'MINDMAP' | 'WORDCLOUD' | 'SUMMARY' | 'PEOPLE';

const DEMO_MEETING_SEGMENTS: string[] = [
  'Pessoal, vamos alinhar as entregas da Conferência Anual e do culto de domingo.',
  'O Francisco vai ficar responsável por editar o vídeo teaser da Conferência até sexta-feira com prioridade alta.',
  'Também precisamos que o Francisco revise os cortes do Reels e suba no drive até quinta.',
  'A Maria vai assumir toda a identidade visual, o carrossel do Instagram e os slides do telão principal.',
  'Sobre a transmissão ao vivo, o Lucas vai testar os cabos SDI, configurar o OBS e alinhar o áudio com a equipe de som no sábado às 14h.',
  'Decidimos que a abertura das inscrições do próximo lote começa na segunda-feira às 19h com disparo no WhatsApp.',
  'Ficou pendente confirmar o orçamento dos banners impressos com a gráfica ainda hoje.'
];

export const AILiveModePage: React.FC = () => {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { currentUser } = useAuth();
  const { currentOrganization, campuses } = useTenant();
  const { users, events, demandTypes, createTask } = useData();
  const { success, warning, info, error: notifyError } = useNotification();

  const {
    isListening: isAssistantListening,
    status: assistantStatus,
    stopAudio,
    isLiveMode: isAssistantLiveMode,
    toggleLiveMode: toggleAssistantLiveMode,
    clearHistory
  } = useAI();

  // ── Modo Principal: 'assistant' (Core HUD) ou 'meeting' (Modo Reunião Ao Vivo) ──
  const [mainMode, setMainMode] = useState<JarvisMainMode>('meeting');
  const [activeHudTab, setActiveHudTab] = useState<MeetingHudTab>('ALL');

  // ── HUD Estética ──
  const [hudText, setHudText] = useState('AGUARDANDO INSTRUÇÕES...');
  const [hz, setHz] = useState('432.4');

  // ── Configuração de IA (Isolada por Tenant + Usuário) ──
  const orgId = currentOrganization?.id || 'default';
  const userId = currentUser?.id || 'sys';
  const [apiKey, setApiKey] = useState(() => AiTranscriptionService.getApiKey(orgId, userId));
  const [selectedModel, setSelectedModel] = useState<AiModelId>(() =>
    AiTranscriptionService.getSelectedModel(orgId, userId)
  );
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  // ── Estado do Modo Reunião Ao Vivo ──
  const [currentMeetingId, setCurrentMeetingId] = useState<string>(
    () => 'meet_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6)
  );
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitleInput, setTempTitleInput] = useState('');
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [manualNoteInput, setManualNoteInput] = useState('');

  // ── Modo Telão / Apresentação (Projetor / TV de Sala de Reunião) ──
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isFeedCollapsedInPresentation, setIsFeedCollapsedInPresentation] = useState(true);

  // ── Inteligência Ao Vivo (Mapa Mental, Nuvem, Resumo, Pessoas) ──
  const [intelligence, setIntelligence] = useState<LiveMeetingIntelligence | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [createdTaskKeys, setCreatedTaskKeys] = useState<Record<string, boolean>>({});

  // ── Modal de Ajuste de Tarefa antes do envio ao Kanban ──
  interface EditingMeetingTaskState {
    pIdx: number;
    tIdx: number;
    taskKey: string;
    title: string;
    description: string;
    selectedUserId: string;
    personName: string;
    priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
    demandType: string;
    deadline: string;
    checklist: string[];
    newChecklistInput: string;
  }
  const [editingTask, setEditingTask] = useState<EditingMeetingTaskState | null>(null);

  // ── Histórico de Reuniões Gravadas ──
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [savedMeetings, setSavedMeetings] = useState<JarvisMeetingSession[]>(() =>
    StorageService.getMeetings(orgId)
  );
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Carrega e assina reuniões da organização em tempo real
  useEffect(() => {
    if (!orgId) return;
    setSavedMeetings(StorageService.getMeetings(orgId));
    FirestoreRepository.fetchMeetings(orgId).then((remote) => {
      if (remote && remote.length > 0) setSavedMeetings(remote);
    });

    const unsub = FirestoreRepository.subscribeMeetings(orgId, (list) => {
      if (list) setSavedMeetings(list);
    });
    return () => unsub();
  }, [orgId]);

  // Refs para Web Speech API contínua com Auto-Healing
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const lastAnalyzedLengthRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isRecordingRef.current = isRecordingMeeting;
  }, [isRecordingMeeting]);

  // Atualiza texto do Core HUD
  useEffect(() => {
    if ( assistantStatus === 'speaking') setHudText('TRANSMITINDO DADOS...');
    else if (assistantStatus === 'thinking' || isAnalyzingAi) setHudText('PROCESSANDO REDE NEURAL...');
    else if (isAssistantListening || isRecordingMeeting) setHudText('CAPTANDO ÁUDIO AMBIENTE...');
    else setHudText('AGUARDANDO INSTRUÇÕES...');
  }, [assistantStatus, isAssistantListening, isRecordingMeeting, isAnalyzingAi]);

  // Flutuação de frequência neural
  useEffect(() => {
    const interval = setInterval(() => {
      setHz((Math.random() * 50 + 400).toFixed(1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Cronômetro da reunião
  useEffect(() => {
    if (!isRecordingMeeting) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecordingMeeting]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  // Alternar Modo Telão / Apresentação (Projetor/TV)
  const togglePresentationMode = useCallback(() => {
    if (!isPresentationMode) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsPresentationMode(true);
      success('Modo Telão Ativado', 'Layout otimizado para TV e Projetor. Pressione Esc ou F para sair.');
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsPresentationMode(false);
    }
  }, [isPresentationMode, success]);

  // Listener de tecla de atalho (F = Telão) e sincronização do Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mainMode !== 'meeting') return;
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePresentationMode();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode, togglePresentationMode, mainMode]);

  // Salvar título personalizado da reunião
  const handleSaveMeetingTitle = (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }
    setMeetingTitle(trimmed);
    setIsEditingTitle(false);
    if (segments.length > 0 || intelligence) {
      handleSaveCurrentMeeting(trimmed);
    }
  };

  // Texto completo acumulado da reunião
  const fullTranscriptText = useMemo(() => {
    return segments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n');
  }, [segments]);

  // Nuvem de palavras híbrida (0ms local + enriquecida pela IA)
  const wordCloudItems = useMemo<WordCloudEntry[]>(() => {
    const localWords = AiLiveMeetingHelper.computeLocalWordCloud(
      segments.map((s) => s.text).join(' ') + ' ' + interimText,
      30
    );
    if (!intelligence?.keywords || intelligence.keywords.length === 0) {
      return localWords;
    }
    const mergedMap = new Map<string, WordCloudEntry>();
    for (const kw of intelligence.keywords) {
      mergedMap.set(kw.word.toLowerCase(), {
        word: kw.word,
        weight: kw.weight,
        count: kw.count || Math.max(1, Math.round(kw.weight / 2))
      });
    }
    for (const lw of localWords) {
      const key = lw.word.toLowerCase();
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        mergedMap.set(key, {
          ...existing,
          count: lw.count,
          weight: Math.min(10, Math.max(existing.weight, lw.weight))
        });
      } else if (mergedMap.size < 32) {
        mergedMap.set(key, lw);
      }
    }
    return Array.from(mergedMap.values()).sort((a, b) => b.weight - a.weight);
  }, [segments, interimText, intelligence]);

  // Auto-scroll no feed de transcrição
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  // Refs auxiliares para evitar re-criação de callbacks a cada segundo do cronômetro
  const elapsedSecondsRef = useRef(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;
  const wordCloudItemsRef = useRef(wordCloudItems);
  wordCloudItemsRef.current = wordCloudItems;
  const createdTaskKeysRef = useRef(createdTaskKeys);
  createdTaskKeysRef.current = createdTaskKeys;

  // ── Sincronização com Gemini (Mapa Mental, Resumo e Atividades por Pessoa) ──
  const triggerMeetingAnalysis = useCallback(
    async (silent = false) => {
      const rawText = segments.map((s) => s.text).join('\n').trim();
      if (rawText.length < 15) {
        if (!silent) {
          warning('Conteúdo insuficiente', 'Fale ou adicione mais anotações para gerar o mapa mental e resumos.');
        }
        return;
      }

      if (!apiKey.trim()) {
        if (!silent) {
          setIsKeyModalOpen(true);
          notifyError('Chave Gemini necessária', 'Configure sua chave do Google AI Studio no topo da tela.');
        }
        return;
      }

      setIsAnalyzingAi(true);
      try {
        const res = await AiLiveMeetingHelper.analyzeLiveMeeting({
          transcriptText: rawText,
          apiKey,
          model: selectedModel,
          context: {
            organizationName: currentOrganization?.name || 'Organização',
            users,
            events,
            campuses,
            demandTypes
          }
        });

        if (res.success && res.data) {
          setIntelligence(res.data);
          lastAnalyzedLengthRef.current = rawText.length;
          setLastSyncTime(
            new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          if (!silent) {
            success('Inteligência Atualizada', 'Mapa mental, resumo e atividades por pessoa sincronizados!');
          }

          // Auto-save contínuo em background (persiste ata, nuvem, mapa mental e tarefas)
          const autoTitle =
            meetingTitle.trim() ||
            res.data.centralTopic ||
            `Reunião Jarvis ${new Date().toLocaleDateString('pt-BR')}`;
          FirestoreRepository.saveMeeting(orgId, {
            id: currentMeetingId,
            organizationId: orgId,
            title: autoTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            durationSeconds: elapsedSeconds,
            segments,
            intelligence: res.data,
            wordCloud: wordCloudItems,
            createdTaskKeys,
            modelUsed: selectedModel,
            status: 'IN_PROGRESS'
          }).catch(() => {});
        } else if (!silent && res.error) {
          notifyError('Aviso da IA', res.error);
        }
      } catch (err: any) {
        if (!silent) {
          notifyError('Erro na análise', err?.message || 'Falha ao processar inteligência da reunião.');
        }
      } finally {
        setIsAnalyzingAi(false);
      }
    },
    [segments, apiKey, selectedModel, currentOrganization, users, events, campuses, demandTypes, notifyError, success, warning, meetingTitle, orgId, currentMeetingId, elapsedSeconds, wordCloudItems, createdTaskKeys]
  );

  // Ciclo automático a cada 25 segundos quando há pelo menos 35 novos caracteres falados
  useEffect(() => {
    if (!autoSyncEnabled || mainMode !== 'meeting') return;
    const rawText = segments.map((s) => s.text).join('\n').trim();
    const diff = rawText.length - lastAnalyzedLengthRef.current;

    if (diff >= 35 && !isAnalyzingAi && apiKey.trim()) {
      const timer = setTimeout(() => {
        triggerMeetingAnalysis(true);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [segments, autoSyncEnabled, mainMode, isAnalyzingAi, apiKey, triggerMeetingAnalysis]);

  // ── Controle do Microfone Contínuo (Modo Reunião com Auto-Restart) ──
  const startMeetingRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      notifyError(
        'Navegador incompatível',
        'Use o Google Chrome ou Edge para captura de voz contínua em reuniões.'
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecordingMeeting(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        setInterimText(interim);

        if (finalChunk.trim()) {
          const nowStr = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          setSegments((prev) => [
            ...prev,
            {
              id: 'seg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              timestamp: nowStr,
              text: finalChunk.trim()
            }
          ]);
          setInterimText('');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          notifyError('Microfone Bloqueado', 'Permita o acesso ao microfone no navegador.');
          isRecordingRef.current = false;
          setIsRecordingMeeting(false);
        }
      };

      // Watchdog: se a reunião ainda estiver ativa e o navegador pausar a sessão, reconecta imediatamente
      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch {
                // Se a instância expirar, recria
                startMeetingRecognition();
              }
            }
          }, 250);
        } else {
          setIsRecordingMeeting(false);
          setInterimText('');
        }
      };

      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecordingMeeting(true);
      recognition.start();
    } catch (err: any) {
      notifyError('Falha ao iniciar microfone', err?.message || 'Verifique as permissões de áudio.');
      setIsRecordingMeeting(false);
    }
  }, [notifyError]);

  const stopMeetingRecognition = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecordingMeeting(false);
    setInterimText('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  const toggleMeetingRecording = () => {
    if (isRecordingMeeting) {
      stopMeetingRecognition();
      // Ao pausar, se houver texto novo, dispara uma análise final
      if (segments.length > 0 && apiKey.trim()) {
        triggerMeetingAnalysis(true);
      }
    } else {
      stopAudio(); // Garante que o modo conversa pare de falar
      startMeetingRecognition();
    }
  };

  // Limpa microfone ao sair da página
  useEffect(() => {
    return () => {
      stopMeetingRecognition();
    };
  }, [stopMeetingRecognition]);

  // Adicionar nota manual ao feed da reunião
  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNoteInput.trim()) return;
    const nowStr = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setSegments((prev) => [
      ...prev,
      {
        id: 'seg_manual_' + Date.now(),
        timestamp: nowStr,
        text: manualNoteInput.trim()
      }
    ]);
    setManualNoteInput('');
  };

  // Carregar simulação de reunião ao vivo para testar imediatamente
  const handleLoadDemoMeeting = () => {
    const baseTime = new Date();
    const demoSegs: TranscriptSegment[] = DEMO_MEETING_SEGMENTS.map((text, idx) => {
      const t = new Date(baseTime.getTime() + idx * 42000);
      return {
        id: 'seg_demo_' + idx + '_' + Date.now(),
        timestamp: t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text
      };
    });
    setSegments(demoSegs);
    success('Transcrição de demonstração carregada!', 'Sincronizando Mapa Mental, Nuvem e Atividades...');
  };

  // Salvar Reunião no Firestore e LocalStorage
  const handleSaveCurrentMeeting = async (customTitle?: string) => {
    if (segments.length === 0 && !intelligence) {
      warning('Reunião vazia', 'Inicie a escuta ou adicione notas antes de salvar a reunião.');
      return;
    }

    const titleToUse =
      (customTitle || meetingTitle).trim() ||
      intelligence?.centralTopic ||
      `Reunião Jarvis ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    setIsSavingMeeting(true);
    try {
      const sessionObj: JarvisMeetingSession = {
        id: currentMeetingId,
        organizationId: orgId,
        title: titleToUse,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
        segments,
        intelligence,
        wordCloud: wordCloudItems,
        createdTaskKeys,
        modelUsed: selectedModel,
        status: isRecordingMeeting ? 'IN_PROGRESS' : 'COMPLETED'
      };

      await FirestoreRepository.saveMeeting(orgId, sessionObj);
      setMeetingTitle(titleToUse);
      success('Reunião Salva!', `Ata, nuvem de palavras e mapa mental de "${titleToUse}" foram salvos no histórico.`);
    } catch (err: any) {
      notifyError('Erro ao salvar reunião', err?.message || 'Falha ao persistir reunião.');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  // Carregar reunião do histórico para o HUD
  const handleLoadSavedMeeting = (meeting: JarvisMeetingSession) => {
    stopMeetingRecognition();
    setCurrentMeetingId(meeting.id);
    setMeetingTitle(meeting.title);
    setSegments(meeting.segments || []);
    setIntelligence(meeting.intelligence || null);
    setElapsedSeconds(meeting.durationSeconds || 0);
    setCreatedTaskKeys(meeting.createdTaskKeys || {});
    setLastSyncTime(
      new Date(meeting.updatedAt || meeting.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
    setIsHistoryDrawerOpen(false);
    success('Reunião Carregada!', `"${meeting.title}" foi carregada no J.A.R.V.I.S.`);
  };

  // Iniciar nova reunião em branco
  const handleStartNewMeeting = () => {
    stopMeetingRecognition();
    setCurrentMeetingId('meet_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6));
    setMeetingTitle('');
    setSegments([]);
    setInterimText('');
    setIntelligence(null);
    setElapsedSeconds(0);
    setLastSyncTime(null);
    setCreatedTaskKeys({});
    lastAnalyzedLengthRef.current = 0;
    setIsHistoryDrawerOpen(false);
    info('Nova Sessão', 'Pronto para uma nova reunião.');
  };

  // Excluir reunião do histórico
  const handleDeleteSavedMeeting = async (meetingId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir a gravação da reunião "${title}"?`)) return;

    try {
      await FirestoreRepository.deleteMeeting(orgId, meetingId);
      setSavedMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      if (currentMeetingId === meetingId) {
        handleStartNewMeeting();
      }
      success('Reunião Excluída', `"${title}" foi removida do histórico.`);
    } catch (err: any) {
      notifyError('Erro ao excluir', err?.message || 'Não foi possível excluir.');
    }
  };

  // Limpar reunião
  const handleClearMeeting = () => {
    stopMeetingRecognition();
    setSegments([]);
    setInterimText('');
    setIntelligence(null);
    setElapsedSeconds(0);
    setLastSyncTime(null);
    setCreatedTaskKeys({});
    lastAnalyzedLengthRef.current = 0;
  };

  // Salvar chave API do Gemini
  const handleSaveApiKey = () => {
    AiTranscriptionService.setApiKey(orgId, userId, tempKey);
    setApiKey(tempKey);
    setIsKeyModalOpen(false);
    if (tempKey.trim()) {
      success('Chave Gemini Conectada!', 'Pronto para processar reuniões ao vivo no Jarvis.');
    }
  };

  // Atribuição rápida de membro a um bloco de atividades
  const handleQuickAssignPerson = (personIdx: number, newUserId: string) => {
    if (!intelligence?.peopleActivities) return;
    const selectedUser = users.find((u) => u.id === newUserId);
    const updated = [...intelligence.peopleActivities];
    if (selectedUser) {
      updated[personIdx] = {
        ...updated[personIdx],
        personName: selectedUser.name,
        matchedUserId: selectedUser.id,
        roleOrMinistry: updated[personIdx].roleOrMinistry || 'Membro'
      };
      success('Responsável Atualizado', `Atividades vinculadas a ${selectedUser.name}.`);
    } else {
      updated[personIdx] = {
        ...updated[personIdx],
        personName: 'A Definir',
        matchedUserId: undefined,
        roleOrMinistry: 'Pendente de Definição'
      };
    }
    setIntelligence({
      ...intelligence,
      peopleActivities: updated
    });
  };

  // Abrir modal para ajustar tarefa antes de importar
  const handleOpenEditTask = (pIdx: number, tIdx: number) => {
    if (!intelligence?.peopleActivities) return;
    const person = intelligence.peopleActivities[pIdx];
    const task = person?.tasks?.[tIdx];
    if (!person || !task) return;

    const taskKey = `${pIdx}_${tIdx}`;
    setEditingTask({
      pIdx,
      tIdx,
      taskKey,
      title: task.title || '',
      description:
        task.description ||
        `Demanda extraída no Modo Reunião J.A.R.V.I.S.\nResponsável indicado: ${person.personName}`,
      selectedUserId: person.matchedUserId || '',
      personName: person.personName || 'A Definir',
      priority: (task.priority as any) || 'Alta',
      demandType: task.demandType || 'Arte',
      deadline: task.deadline || '',
      checklist: task.checklist ? [...task.checklist] : [],
      newChecklistInput: ''
    });
  };

  // Salvar ajustes feitos na tarefa (e opcionalmente criar direto no Kanban)
  const handleSaveEditedTask = (createInKanban = false) => {
    if (!editingTask) return;
    const {
      pIdx,
      tIdx,
      taskKey,
      title,
      description,
      selectedUserId,
      priority,
      demandType,
      deadline,
      checklist
    } = editingTask;

    const assignedUser = users.find((u) => u.id === selectedUserId);
    const finalPersonName = assignedUser ? assignedUser.name : 'A Definir';

    // 1. Atualizar inteligência em memória
    if (intelligence?.peopleActivities) {
      const updated = [...intelligence.peopleActivities];
      if (updated[pIdx]) {
        const sourcePerson = updated[pIdx];
        const taskToMove = {
          ...sourcePerson.tasks[tIdx],
          title,
          description,
          priority,
          demandType,
          deadline: deadline || undefined,
          checklist
        };

        const targetUserMatched = assignedUser ? assignedUser.id : undefined;
        const targetPersonName = finalPersonName;

        // Se o responsável da tarefa mudou (é diferente do bloco atual)
        const isSamePerson =
          (sourcePerson.matchedUserId && sourcePerson.matchedUserId === targetUserMatched) ||
          (!sourcePerson.matchedUserId && !targetUserMatched && sourcePerson.personName === targetPersonName);

        if (isSamePerson) {
          // Mantém no mesmo bloco da pessoa, apenas atualiza a tarefa
          const updatedTasks = [...sourcePerson.tasks];
          updatedTasks[tIdx] = taskToMove;
          updated[pIdx] = { ...sourcePerson, tasks: updatedTasks };
        } else {
          // Remove a tarefa do bloco de origem
          const remainingTasks = sourcePerson.tasks.filter((_, i) => i !== tIdx);

          // Procura se já existe um bloco para o novo responsável
          const destIdx = updated.findIndex((p, idx) =>
            idx !== pIdx && (
              (targetUserMatched && p.matchedUserId === targetUserMatched) ||
              (!targetUserMatched && p.personName.toLowerCase() === targetPersonName.toLowerCase())
            )
          );

          if (destIdx >= 0) {
            // Adiciona a tarefa ao bloco já existente do novo responsável
            const destPerson = updated[destIdx];
            updated[destIdx] = {
              ...destPerson,
              tasks: [...(destPerson.tasks || []), taskToMove]
            };
          } else {
            // Cria um novo bloco de pessoa para o novo responsável
            updated.push({
              personName: targetPersonName,
              matchedUserId: targetUserMatched,
              roleOrMinistry: assignedUser ? 'Membro da Equipe' : 'Pendente de Definição',
              summary: `Atividades e demandas atribuídas individualmente para ${targetPersonName}.`,
              tasks: [taskToMove]
            });
          }

          // Se o bloco de origem ficou sem tarefas, remove-o (a menos que não queiramos órfãos)
          if (remainingTasks.length === 0) {
            updated.splice(pIdx, 1);
          } else {
            updated[pIdx] = { ...sourcePerson, tasks: remainingTasks };
          }
        }

        setIntelligence({ ...intelligence, peopleActivities: updated });
      }
    }

    // 2. Criar no Kanban se solicitado
    if (createInKanban) {
      const checklistItems = checklist.map((item, idx) => ({
        id: `chk_${Date.now()}_${idx}`,
        text: item,
        completed: false
      }));

      createTask({
        title,
        description:
          description ||
          `Demanda extraída no Modo Reunião J.A.R.V.I.S.\nResponsável: ${finalPersonName}`,
        status: 'INBOX',
        priority: priority as any,
        demandType: demandType as any,
        startDate: new Date().toISOString().split('T')[0],
        deadline: deadline || undefined,
        assigneeIds: selectedUserId ? [selectedUserId] : [],
        checklist: checklistItems,
        tags: ['Jarvis Reunião Ao Vivo'],
        requesterId: userId,
        requesterName: currentUser?.name || 'J.A.R.V.I.S.',
        attachmentLinks: []
      });

      setCreatedTaskKeys((prev) => ({ ...prev, [taskKey]: true }));
      success('Tarefa criada no Kanban!', `"${title}" atribuída a ${finalPersonName}.`);
    } else {
      success('Ajustes salvos!', `A tarefa "${title}" foi atualizada.`);
    }

    setEditingTask(null);
  };

  // Criar tarefa individual de uma pessoa direto no Kanban
  const handleCreateSinglePersonTask = (
    personName: string,
    matchedUserId: string | undefined,
    taskItem: { title: string; description?: string; deadline?: string; priority?: string; demandType?: string; checklist?: string[] },
    taskKey: string,
    pIdx?: number,
    tIdx?: number
  ) => {
    if (createdTaskKeys[taskKey]) return;

    // Se a pessoa estiver 'A Definir' e não tiver usuário vinculado, abre o modal de ajuste para definir
    if (!matchedUserId && (personName === 'A Definir' || !personName.trim()) && pIdx !== undefined && tIdx !== undefined) {
      handleOpenEditTask(pIdx, tIdx);
      info('Defina o Responsável', 'Selecione quem executará esta tarefa antes de enviá-la para o Kanban.');
      return;
    }

    const checklistItems = (taskItem.checklist || []).map((item, idx) => ({
      id: `chk_${Date.now()}_${idx}`,
      text: item,
      completed: false
    }));

    const finalDescription =
      taskItem.description ||
      `Extraído ao vivo no Modo Reunião J.A.R.V.I.S.\nResponsável: ${personName}`;

    createTask({
      title: taskItem.title,
      description: finalDescription,
      status: 'INBOX',
      priority: (taskItem.priority as any) || 'Alta',
      demandType: (taskItem.demandType as any) || 'Arte',
      startDate: new Date().toISOString().split('T')[0],
      deadline: taskItem.deadline,
      assigneeIds: matchedUserId ? [matchedUserId] : [],
      checklist: checklistItems,
      tags: ['Jarvis Reunião Ao Vivo'],
      requesterId: userId,
      requesterName: currentUser?.name || 'J.A.R.V.I.S.',
      attachmentLinks: []
    });

    setCreatedTaskKeys((prev) => ({ ...prev, [taskKey]: true }));
    success('Tarefa criada no Kanban!', `"${taskItem.title}" atribuída a ${personName}.`);
  };

  // Criar todas as tarefas da reunião em lote no Kanban
  const handleCreateAllMeetingTasks = () => {
    if (!intelligence?.peopleActivities || intelligence.peopleActivities.length === 0) return;
    let count = 0;
    let pendingCount = 0;

    intelligence.peopleActivities.forEach((person, pIdx) => {
      person.tasks.forEach((t, tIdx) => {
        const key = `${pIdx}_${tIdx}`;
        if (!createdTaskKeys[key]) {
          if (!person.matchedUserId && (person.personName === 'A Definir' || !person.personName.trim())) {
            pendingCount++;
          } else {
            handleCreateSinglePersonTask(person.personName, person.matchedUserId, t, key, pIdx, tIdx);
            count++;
          }
        }
      });
    });

    if (count > 0) {
      success('Importação Concluída!', `${count} tarefa(s) com responsável enviada(s) ao Kanban.`);
    }
    if (pendingCount > 0) {
      warning(
        'Tarefas Pendentes de Responsável',
        `${pendingCount} tarefa(s) continuam como "A Definir". Selecione os responsáveis ou use o botão Ajustar.`
      );
    }
  };

  // Copiar ata completa da reunião
  const handleCopyMeetingMinutes = () => {
    const lines: string[] = [];
    lines.push(`# ATA INTELIGENTE J.A.R.V.I.S. — ${currentOrganization?.name || 'Oiko'}`);
    lines.push(`Data: ${new Date().toLocaleString('pt-BR')} | Duração: ${formatDuration(elapsedSeconds)}\n`);

    if (intelligence) {
      lines.push(`## 🎯 Tema Central: ${intelligence.centralTopic}`);
      lines.push(`\n## 📋 Resumo Executivo\n${intelligence.executiveSummary}`);

      if (intelligence.keyDecisions?.length > 0) {
        lines.push(`\n## ✅ Decisões Tomadas`);
        intelligence.keyDecisions.forEach((d) => lines.push(`- ${d}`));
      }

      if (intelligence.peopleActivities?.length > 0) {
        lines.push(`\n## 👥 Atividades por Pessoa`);
        intelligence.peopleActivities.forEach((p) => {
          lines.push(`\n### ${p.personName} (${p.roleOrMinistry || 'Equipe'})`);
          lines.push(`${p.summary}`);
          p.tasks.forEach((t) =>
            lines.push(`- [ ] ${t.title} ${t.deadline ? `(Prazo: ${t.deadline})` : ''}`)
          );
        });
      }
    }

    if (segments.length > 0) {
      lines.push(`\n## 🎙️ Transcrição na Íntegra`);
      segments.forEach((s) => lines.push(`[${s.timestamp}] ${s.text}`));
    }

    navigator.clipboard.writeText(lines.join('\n'));
    success('Ata copiada!', 'Resumo, mapa mental, tarefas por pessoa e transcrição copiados para a área de transferência.');
  };

  // ── Exportação Executiva da Ata em PDF (Layout A4 Formal para Liderança / Conselho) ──
  const handleExportPdfMinutes = () => {
    if (segments.length === 0 && !intelligence) {
      warning('Reunião Vazia', 'Inicie a escuta ou adicione notas antes de exportar a ata em PDF.');
      return;
    }

    const titleToUse =
      meetingTitle.trim() ||
      intelligence?.centralTopic ||
      `Ata de Reunião - ${new Date().toLocaleDateString('pt-BR')}`;

    const orgName = currentOrganization?.name || 'Igreja / Organização';
    const logoUrl = currentOrganization?.branding?.logoUrl || '';
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const durationFormatted = formatDuration(elapsedSeconds);
    const modelTag = selectedModel || 'Gemini 3.8 Flash';

    // Decisões Confirmadas
    const decisionsHtml =
      intelligence?.keyDecisions && intelligence.keyDecisions.length > 0
        ? intelligence.keyDecisions
            .map(
              (d) => `
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; padding: 8px 12px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px;">
            <span style="color: #16a34a; font-weight: bold; font-size: 14px;">✓</span>
            <div style="font-size: 13px; color: #166534; line-height: 1.4;">${d}</div>
          </div>
        `
            )
            .join('')
        : '<p style="color: #64748b; font-style: italic; font-size: 12px;">Nenhuma decisão explícita registrada.</p>';

    // Pendências / Pontos em Aberto
    const openQuestionsHtml =
      intelligence?.openQuestions && intelligence.openQuestions.length > 0
        ? intelligence.openQuestions
            .map(
              (q) => `
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; padding: 8px 12px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <span style="color: #f59e0b; font-weight: bold; font-size: 14px;">?</span>
            <div style="font-size: 13px; color: #92400e; line-height: 1.4;">${q}</div>
          </div>
        `
            )
            .join('')
        : '';

    // Tabela Executiva de Tarefas e Entregas por Pessoa
    let tasksTableHtml = '';
    if (intelligence?.peopleActivities && intelligence.peopleActivities.length > 0) {
      const rows: string[] = [];
      intelligence.peopleActivities.forEach((person) => {
        if (person.tasks && person.tasks.length > 0) {
          person.tasks.forEach((t) => {
            const isHigh = t.priority === 'Urgente' || t.priority === 'Alta';
            const badgeStyle = isHigh
              ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;'
              : 'background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;';

            rows.push(`
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; font-size: 12px;">
                  ${person.personName}
                  ${person.roleOrMinistry ? `<br/><span style="font-size: 10px; font-weight: normal; color: #64748b;">${person.roleOrMinistry}</span>` : ''}
                </td>
                <td style="padding: 10px 12px; color: #1e293b; font-size: 12px; line-height: 1.4;">${t.title}</td>
                <td style="padding: 10px 12px; color: #475569; font-size: 12px; white-space: nowrap;">${t.deadline || 'A definir'}</td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; ${badgeStyle}">
                    ${t.priority || 'Normal'}
                  </span>
                </td>
                <td style="padding: 10px 12px; color: #64748b; font-size: 11px;">${t.demandType || 'Geral'}</td>
              </tr>
            `);
          });
        } else {
          rows.push(`
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; font-size: 12px;">${person.personName}</td>
              <td colspan="4" style="padding: 10px 12px; color: #64748b; font-style: italic; font-size: 12px;">${person.summary || 'Acompanhou os alinhamentos da reunião.'}</td>
            </tr>
          `);
        }
      });

      tasksTableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 12px; text-align: left;">Responsável</th>
              <th style="padding: 10px 12px; text-align: left;">Demanda / Entrega</th>
              <th style="padding: 10px 12px; text-align: left;">Prazo</th>
              <th style="padding: 10px 12px; text-align: center;">Prioridade</th>
              <th style="padding: 10px 12px; text-align: left;">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      `;
    }

    // Mapa Mental em Tópicos
    let mindMapHtml = '';
    if (intelligence?.mindMap?.branches && intelligence.mindMap.branches.length > 0) {
      mindMapHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 8px;">
          ${intelligence.mindMap.branches
            .map(
              (b) => `
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <strong style="color: #0f172a; font-size: 12px;">${b.label}</strong>
                ${b.category ? `<span style="font-size: 9px; background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${b.category}</span>` : ''}
              </div>
              ${
                b.children && b.children.length > 0
                  ? `
                <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 11px; color: #475569; line-height: 1.4;">
                  ${b.children.map((c) => `<li>${c.label}</li>`).join('')}
                </ul>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    // Palavras Mais Debatidas
    let keywordsHtml = '';
    if (wordCloudItems && wordCloudItems.length > 0) {
      keywordsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          ${wordCloudItems
            .slice(0, 24)
            .map(
              (w) => `
            <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 11px; color: #334155;">
              ${w.word} ${w.count && w.count > 1 ? `<strong style="color: #0284c7;">(${w.count}x)</strong>` : ''}
            </span>
          `
            )
            .join('')}
        </div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ata - ${titleToUse}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title-area h1 {
            font-size: 18px;
            font-weight: 800;
            margin: 0 0 4px 0;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-row {
            display: flex;
            gap: 16px;
            font-size: 11px;
            color: #475569;
            flex-wrap: wrap;
          }
          .section {
            margin-bottom: 18px;
            page-break-inside: auto;
          }
          .section-title {
            font-size: 12px;
            font-weight: 800;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .summary-box {
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #1e293b;
            font-size: 12px;
            line-height: 1.6;
          }
          .footer-note {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signatures {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            gap: 40px;
            page-break-inside: avoid;
          }
          .sign-col {
            flex: 1;
            border-top: 1px solid #94a3b8;
            padding-top: 6px;
            text-align: center;
            font-size: 11px;
            color: #475569;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>${titleToUse}</h1>
            <div class="meta-row">
              <span><strong>Organização:</strong> ${orgName}</span>
              <span>•</span>
              <span><strong>Data:</strong> ${dateFormatted}</span>
              <span>•</span>
              <span><strong>Duração:</strong> ${durationFormatted}</span>
              <span>•</span>
              <span><strong>Processamento:</strong> J.A.R.V.I.S. (${modelTag})</span>
            </div>
          </div>
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; max-width: 140px; object-fit: contain;" />`
              : `<div style="font-size: 14px; font-weight: 800; color: #0284c7; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 6px; background: #f0f9ff;">${orgName}</div>`
          }
        </div>

        ${
          intelligence?.centralTopic
            ? `
          <div class="section" style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px;">
            <strong style="color: #166534; font-size: 11px; text-transform: uppercase;">🎯 Tema Central da Reunião:</strong>
            <span style="color: #14532d; font-size: 13px; font-weight: 700; margin-left: 6px;">${intelligence.centralTopic}</span>
          </div>
        `
            : ''
        }

        ${
          intelligence?.executiveSummary
            ? `
          <div class="section">
            <div class="section-title">📋 Resumo Executivo</div>
            <div class="summary-box">${intelligence.executiveSummary}</div>
          </div>
        `
            : ''
        }

        ${
          intelligence?.keyDecisions && intelligence.keyDecisions.length > 0
            ? `
          <div class="section">
            <div class="section-title">✅ Decisões Confirmadas (${intelligence.keyDecisions.length})</div>
            ${decisionsHtml}
          </div>
        `
            : ''
        }

        ${
          intelligence?.openQuestions && intelligence.openQuestions.length > 0
            ? `
          <div class="section">
            <div class="section-title">⚠️ Pontos em Aberto / Pendências (${intelligence.openQuestions.length})</div>
            ${openQuestionsHtml}
          </div>
        `
            : ''
        }

        ${
          tasksTableHtml
            ? `
          <div class="section">
            <div class="section-title">👥 Plano de Ação e Entregas por Responsável</div>
            ${tasksTableHtml}
          </div>
        `
            : ''
        }

        ${
          mindMapHtml
            ? `
          <div class="section" style="page-break-inside: avoid;">
            <div class="section-title">🧠 Estrutura do Mapa Mental</div>
            ${mindMapHtml}
          </div>
        `
            : ''
        }

        ${
          keywordsHtml
            ? `
          <div class="section" style="page-break-inside: avoid;">
            <div class="section-title">☁️ Termos Mais Debatidos na Reunião</div>
            ${keywordsHtml}
          </div>
        `
            : ''
        }

        <div class="signatures">
          <div class="sign-col">
            <strong>Secretaria / Registro</strong><br/>
            ${currentUser?.name || 'Responsável pela Ata'}
          </div>
          <div class="sign-col">
            <strong>Liderança / Direção</strong><br/>
            Visto da Coordenação
          </div>
        </div>

        <div class="footer-note">
          <span>Ata gerada e consolidada via inteligência artificial J.A.R.V.I.S. • ${orgName}</span>
          <span>Emitido em ${dateFormatted} às ${timeFormatted}</span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notifyError('Pop-up bloqueado', 'Permita pop-ups no navegador para visualizar e salvar o PDF da ata.');
      return;
    }

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
    success('Ata em PDF gerada!', 'A janela de impressão/salvar como PDF foi aberta.');
  };

  const handleClose = () => {
    stopAudio();
    stopMeetingRecognition();
    navigate(`/${orgSlug}/dashboard`);
  };

  return (
    <div className="min-h-screen h-screen w-full bg-[#020617] text-cyan-400 font-mono flex flex-col relative overflow-hidden select-none">
      {/* Background HUD Grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* ── TOP HUD HEADER ─────────────────────────────────────────────────── */}
      {isPresentationMode && mainMode === 'meeting' ? (
        /* ── MODO TELÃO / PROJETOR: HEADER CINEMÁTICO DE SALA DE REUNIÃO ── */
        <header className="px-5 py-3 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 z-30 shrink-0 shadow-[0_10px_30px_rgba(6,182,212,0.15)]">
          {/* Esquerda: Logo + Título da Reunião (Editável) + Cronômetro */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-pulse" />
              <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
                {currentOrganization?.name || 'OIKO'} • TELÃO REUNIÃO
              </span>
            </div>

            <div className="h-5 w-px bg-cyan-800/60 hidden sm:block" />

            {/* Título da Reunião Inline Editável */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempTitleInput}
                    onChange={(e) => setTempTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveMeetingTitle(tempTitleInput);
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    placeholder="Título da reunião..."
                    className="px-3 py-1 bg-slate-900 border border-cyan-400 rounded-lg text-cyan-200 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    onClick={() => handleSaveMeetingTitle(tempTitleInput)}
                    className="p-1.5 bg-cyan-500 text-slate-950 rounded-lg font-bold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1.5 bg-slate-800 text-slate-400 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempTitleInput(meetingTitle || intelligence?.centralTopic || 'Reunião de Alinhamento');
                    setIsEditingTitle(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-200 font-bold text-sm tracking-wide group"
                  title="Clique para editar o título da reunião"
                >
                  <span className="max-w-[200px] sm:max-w-[340px] truncate text-cyan-100 font-bold">
                    {meetingTitle || intelligence?.centralTopic || 'Reunião de Alinhamento'}
                  </span>
                  <Edit3 className="w-3.5 h-3.5 text-cyan-500 opacity-60 group-hover:opacity-100" />
                </button>
              )}
            </div>

            {/* Cronômetro */}
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
                isRecordingMeeting
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-cyan-900/60 text-cyan-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
          </div>

          {/* Centro: Navegador de Foco do Telão (Pills de Telões) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-cyan-900/80">
            <button
              type="button"
              onClick={() => setActiveHudTab('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHudTab === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>4 TELÕES</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveHudTab('MINDMAP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHudTab === 'MINDMAP'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>MAPA MENTAL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveHudTab('SUMMARY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHudTab === 'SUMMARY'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>RESUMO & DECISÕES</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveHudTab('PEOPLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHudTab === 'PEOPLE'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ATIVIDADES</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveHudTab('WORDCLOUD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHudTab === 'WORDCLOUD'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-cyan-400 hover:text-cyan-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>NUVEM</span>
            </button>
          </div>

          {/* Direita: Controles Rápidos da Sala (Gravar/Pausar, Alternar Feed, Atualizar IA, Exportar PDF, Sair Telão) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMeetingRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                isRecordingMeeting
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200'
              }`}
              title={isRecordingMeeting ? 'Pausar escuta da reunião' : 'Retomar escuta'}
            >
              {isRecordingMeeting ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSAR</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>OUVIR</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFeedCollapsedInPresentation(!isFeedCollapsedInPresentation)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-800/60 text-cyan-300 hover:text-cyan-100 text-xs font-bold transition-all"
              title={
                isFeedCollapsedInPresentation
                  ? 'Mostrar feed lateral de transcrição'
                  : 'Expandir telão total (ocultar feed)'
              }
            >
              {isFeedCollapsedInPresentation ? (
                <PanelLeftOpen className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden xl:inline">
                {isFeedCollapsedInPresentation ? 'Mostrar Feed' : 'Telão Total'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => triggerMeetingAnalysis(false)}
              disabled={isAnalyzingAi || segments.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold disabled:opacity-40 transition-all"
              title="Sincronizar Inteligência com Gemini"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden xl:inline">{isAnalyzingAi ? 'Sincronizando...' : 'Atualizar IA'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdfMinutes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              title="Gerar e Imprimir/Salvar PDF Executivo da Reunião"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ata PDF</span>
            </button>

            <button
              type="button"
              onClick={togglePresentationMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all"
              title="Sair do Modo Telão (Atalho: F ou Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Sair (F)</span>
            </button>
          </div>
        </header>
      ) : (
        /* ── TOP HUD HEADER PADRÃO ─────────────────────────────────────────── */
        <header className="px-4 sm:px-6 py-3.5 border-b border-cyan-900/40 bg-slate-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
          {/* Left: Brand + Frequency */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-cyan-950/80 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <div
                className={`w-4 h-4 rounded-full ${
                  isRecordingMeeting || isAssistantLiveMode
                    ? 'bg-cyan-400 animate-ping'
                    : 'bg-cyan-600'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-cyan-300 text-xs sm:text-sm tracking-widest">
                  J.A.R.V.I.S. // MK-VIII
                </span>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  {hz} HZ
                </span>
              </div>
              <p className="text-[10px] text-cyan-600 tracking-wider uppercase">
                {currentOrganization?.name || 'Oiko Ministry'} • {hudText}
              </p>
            </div>
          </div>

          {/* Center: Mode Switcher (Modo Reunião Ao Vivo vs Core Assistente) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-cyan-900/60">
            <button
              type="button"
              onClick={() => {
                stopAudio();
                setMainMode('meeting');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                mainMode === 'meeting'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'text-cyan-600 hover:text-cyan-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isRecordingMeeting ? 'text-rose-400 animate-pulse' : ''}`} />
              <span>MODO REUNIÃO AO VIVO</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopMeetingRecognition();
                setMainMode('assistant');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                mainMode === 'assistant'
                  ? 'bg-cyan-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'text-cyan-600 hover:text-cyan-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>CORE ASSISTENTE</span>
            </button>
          </div>

          {/* Right: AI Model + Key Config + Close */}
          <div className="flex items-center gap-2">
            {mainMode === 'meeting' && (
              <>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const m = e.target.value as AiModelId;
                    setSelectedModel(m);
                    AiTranscriptionService.setSelectedModel(orgId, userId, m);
                  }}
                  className="hidden lg:block px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-900/60 text-cyan-300 text-[11px] font-bold focus:outline-none focus:border-cyan-500"
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setTempKey(apiKey);
                    setIsKeyModalOpen(!isKeyModalOpen);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    apiKey.trim()
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                      : 'bg-amber-950/50 border-amber-500/50 text-amber-300 animate-pulse'
                  }`}
                  title="Configurar Chave Google Gemini"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {apiKey.trim() ? 'IA Conectada' : 'Configurar Chave'}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={handleClose}
              className="p-2 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-cyan-400 hover:bg-rose-950/60 hover:border-rose-500/50 hover:text-rose-300 transition-colors"
              title="Sair do Modo Tela Cheia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* ── MODAL INLINE DE CHAVE GEMINI ───────────────────────────────────── */}
      {isKeyModalOpen && (
        <div className="px-6 py-4 bg-slate-950/95 border-b border-cyan-500/40 z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fade-in">
          <div className="text-xs space-y-0.5">
            <div className="text-cyan-300 font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Chave Google Gemini Pessoal ({currentUser?.name})</span>
            </div>
            <p className="text-[11px] text-cyan-600">
              Isolada para seu usuário nesta organização. Usada para construir o Mapa Mental, Resumo e Tarefas em tempo real.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Cole sua chave AQ... ou AIzaSy..."
              className="w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-800 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODO 1: MODO REUNIÃO AO VIVO (MEETING INTELLIGENCE HUD)
         ══════════════════════════════════════════════════════════════════════ */}
      {mainMode === 'meeting' ? (
        <div className="flex-1 flex flex-col min-h-0 z-10 overflow-hidden">
          {/* ── BARRA DE CONTROLE DA REUNIÃO AO VIVO (PADRÃO) ──────────────── */}
          {!isPresentationMode && (
            <div className="px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-cyan-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Botão Principal de Escuta + Cronômetro */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={toggleMeetingRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs tracking-wider transition-all ${
                    isRecordingMeeting
                      ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  {isRecordingMeeting ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>PAUSAR ESCUTA ({formatDuration(elapsedSeconds)})</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>
                        {segments.length > 0
                          ? `RETOMAR REUNIÃO (${formatDuration(elapsedSeconds)})`
                          : 'INICIAR ESCUTA DA REUNIÃO'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => triggerMeetingAnalysis(false)}
                  disabled={isAnalyzingAi || segments.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/70 disabled:opacity-40 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all"
                  title="Forçar atualização imediata do Mapa Mental, Resumo e Atividades via Gemini"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAi ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isAnalyzingAi ? 'Sincronizando IA...' : 'Atualizar IA Agora'}</span>
                </button>

                {segments.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadDemoMeeting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-800/50 text-cyan-400 text-xs font-bold transition-all"
                    title="Carregar exemplo de reunião para testar o Mapa Mental e os painéis"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simular Reunião</span>
                  </button>
                )}

                {/* Botão de Histórico de Reuniões */}
                <button
                  type="button"
                  onClick={() => setIsHistoryDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-300 text-xs font-bold transition-all"
                  title="Ver e carregar reuniões gravadas anteriormente"
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Histórico ({savedMeetings.length})</span>
                </button>

                {/* Botão Salvar Reunião */}
                {(segments.length > 0 || intelligence) && (
                  <button
                    type="button"
                    onClick={() => handleSaveCurrentMeeting()}
                    disabled={isSavingMeeting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    title="Salvar todas as anotações, mapa mental, resumo e nuvem no histórico"
                  >
                    <Save className={`w-3.5 h-3.5 ${isSavingMeeting ? 'animate-spin' : ''}`} />
                    <span>{isSavingMeeting ? 'Salvando...' : 'Salvar Reunião'}</span>
                  </button>
                )}
              </div>

              {/* Indicadores, Modo Telão & Exportação */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <label className="flex items-center gap-1.5 text-cyan-500 cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="rounded border-cyan-800 bg-slate-900 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-Sync IA</span>
                </label>

                {/* Título Inline Editável */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tempTitleInput}
                      onChange={(e) => setTempTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveMeetingTitle(tempTitleInput);
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      autoFocus
                      placeholder="Nome da reunião..."
                      className="px-2 py-0.5 bg-slate-900 border border-cyan-400 rounded-lg text-cyan-200 text-xs font-bold focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveMeetingTitle(tempTitleInput)}
                      className="p-1 bg-cyan-500 text-slate-950 rounded font-bold"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="p-1 bg-slate-800 text-slate-400 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempTitleInput(meetingTitle || intelligence?.centralTopic || 'Reunião de Alinhamento');
                      setIsEditingTitle(true);
                    }}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-200 font-bold text-xs max-w-[200px] truncate group"
                    title="Clique para nomear a reunião"
                  >
                    <span className="truncate">📌 {meetingTitle || intelligence?.centralTopic || 'Nomear Reunião'}</span>
                    <Edit3 className="w-3 h-3 text-cyan-600 group-hover:text-cyan-400 opacity-60" />
                  </button>
                )}

                {/* Botão Modo Telão */}
                <button
                  type="button"
                  onClick={togglePresentationMode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/50 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all"
                  title="Modo Telão / Projetor para Apresentação em Sala de Reunião (Tecla: F)"
                >
                  <Tv className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modo Telão (F)</span>
                </button>

                {/* Botão Exportar PDF */}
                <button
                  type="button"
                  onClick={handleExportPdfMinutes}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  title="Exportar ata executiva formal em PDF para envio à diretoria e conselho"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar PDF</span>
                </button>

                {lastSyncTime && (
                  <span className="text-cyan-600 hidden 2xl:inline">
                    Sync: {lastSyncTime}
                  </span>
                )}

                {segments.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyMeetingMinutes}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-800/50 text-cyan-300 font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">Copiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartNewMeeting}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-800/50 text-cyan-400 font-bold"
                      title="Iniciar nova reunião zerada"
                    >
                      <PlusCircle className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline">Nova Sessão</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearMeeting}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400"
                      title="Limpar Reunião"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── ÁREA PRINCIPAL: FEED DE TRANSCRIÇÃO + 4 PAINÉIS HOLOGRÁFICOS ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* COLUNA ESQUERDA: NÚCLEO NEURAL + TRANSCRIÇÃO AO VIVO */}
            {(!isPresentationMode || !isFeedCollapsedInPresentation) && (
              <div
                className={`${
                  isPresentationMode ? 'lg:col-span-4' : 'lg:col-span-3'
                } flex flex-col bg-slate-950/70 border border-cyan-900/40 rounded-2xl overflow-hidden min-h-[280px] lg:min-h-0 transition-all`}
              >
                {/* Mini Jarvis Pulse Header */}
                <div className="p-3 border-b border-cyan-900/40 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                      Feed Ao Vivo ({segments.length})
                    </span>
                  </div>
                  {isRecordingMeeting && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      GRAVANDO
                    </span>
                  )}
                </div>

                {/* Lista de falas captadas */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar text-xs">
                  {segments.length === 0 && !interimText ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-cyan-700 space-y-2">
                      <Mic className="w-8 h-8 opacity-40" />
                      <p className="text-xs text-cyan-500/80 font-sans">
                        Clique em <strong>"Iniciar Escuta da Reunião"</strong> para o Jarvis ouvir a conversa e gerar o mapa mental ao vivo.
                      </p>
                    </div>
                  ) : (
                    <>
                      {segments.map((seg) => (
                        <div
                          key={seg.id}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-900/30 text-slate-200 font-sans leading-relaxed"
                        >
                          <span className="text-[10px] font-mono text-cyan-500 block mb-0.5">
                            [{seg.timestamp}]
                          </span>
                          {seg.text}
                        </div>
                      ))}

                      {interimText && (
                        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 font-sans italic animate-pulse">
                          <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">
                            [Ouvindo agora...]
                          </span>
                          {interimText}
                        </div>
                      )}
                      <div ref={transcriptEndRef} />
                    </>
                  )}
                </div>

                {/* Input rápido para adicionar anotação digitada durante a reunião */}
                <form
                  onSubmit={handleAddManualNote}
                  className="p-2.5 border-t border-cyan-900/40 bg-slate-900/40 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={manualNoteInput}
                    onChange={(e) => setManualNoteInput(e.target.value)}
                    placeholder="Adicionar nota rápida à reunião..."
                    className="flex-1 bg-slate-950 border border-cyan-900/50 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder-cyan-800 font-sans focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
                  >
                    +
                  </button>
                </form>
              </div>
            )}

            {/* COLUNA DIREITA: DASHBOARD HOLOGRÁFICO DE 4 QUADRANTES OU ABA EXPANDIDA */}
            <div
              className={`${
                isPresentationMode && isFeedCollapsedInPresentation
                  ? 'lg:col-span-12'
                  : isPresentationMode
                  ? 'lg:col-span-8'
                  : 'lg:col-span-9'
              } grid gap-4 min-h-0 lg:overflow-y-auto custom-scrollbar ${
                activeHudTab === 'ALL' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {/* ────────────────────────────────────────────────────────────
                  QUADRANTE 1: MAPA MENTAL AO VIVO (MIND MAP HUD)
                 ──────────────────────────────────────────────────────────── */}
              {(activeHudTab === 'ALL' || activeHudTab === 'MINDMAP') && (
                <div className="flex flex-col bg-slate-950/80 border border-cyan-800/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)] min-h-[290px]">
                  <div className="px-4 py-2.5 border-b border-cyan-900/40 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                        Mapa Mental Ao Vivo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveHudTab(activeHudTab === 'MINDMAP' ? 'ALL' : 'MINDMAP')}
                      className="text-[10px] text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5"
                    >
                      <span>{activeHudTab === 'MINDMAP' ? 'Ver 4 Painéis' : 'Expandir'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-auto flex flex-col justify-center">
                    {intelligence?.mindMap && intelligence.mindMap.branches?.length > 0 ? (
                      <div className="space-y-4">
                        {/* Nó Central */}
                        <div className="flex justify-center">
                          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-950 via-indigo-950 to-cyan-950 border-2 border-cyan-400/70 shadow-[0_0_25px_rgba(6,182,212,0.3)] text-center">
                            <span className="text-[10px] text-cyan-400 uppercase tracking-widest block">
                              EIXO CENTRAL
                            </span>
                            <span className="text-sm sm:text-base font-black text-white font-sans">
                              {intelligence.mindMap.centralTopic || intelligence.centralTopic}
                            </span>
                          </div>
                        </div>

                        {/* Ramos Conectados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {intelligence.mindMap.branches.map((branch, bIdx) => {
                            const badgeColor =
                              branch.category === 'DECISAO'
                                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                                : branch.category === 'ALERTA'
                                ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                                : 'border-cyan-700/50 bg-slate-900/70 text-cyan-200';

                            return (
                              <div
                                key={branch.id || bIdx}
                                className={`p-3 rounded-xl border ${badgeColor} space-y-2 relative`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold font-sans text-white">
                                    {branch.label}
                                  </span>
                                  {branch.category && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950/80 text-cyan-400 font-mono">
                                      {branch.category}
                                    </span>
                                  )}
                                </div>

                                {branch.children && branch.children.length > 0 && (
                                  <div className="pl-3 border-l-2 border-cyan-500/30 space-y-1.5">
                                    {branch.children.map((child, cIdx) => (
                                      <div
                                        key={child.id || cIdx}
                                        className="text-[11px] text-slate-300 font-sans flex items-start gap-1.5"
                                      >
                                        <span className="text-cyan-400 mt-0.5">▹</span>
                                        <span>{child.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-cyan-700 space-y-2 py-8">
                        {isAnalyzingAi ? (
                          <>
                            <Loader2 className="w-7 h-7 mx-auto animate-spin text-cyan-400" />
                            <p className="text-xs text-cyan-400 font-sans">
                              Construindo conexões neurais do Mapa Mental...
                            </p>
                          </>
                        ) : (
                          <>
                            <Network className="w-8 h-8 mx-auto opacity-30" />
                            <p className="text-xs font-sans text-cyan-600 max-w-xs mx-auto">
                              O mapa mental ramificado aparecerá automaticamente conforme a reunião avança.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  QUADRANTE 2: NUVEM DE PALAVRAS AO VIVO (WORD CLOUD HUD)
                 ──────────────────────────────────────────────────────────── */}
              {(activeHudTab === 'ALL' || activeHudTab === 'WORDCLOUD') && (
                <div className="flex flex-col bg-slate-950/80 border border-cyan-800/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)] min-h-[290px]">
                  <div className="px-4 py-2.5 border-b border-cyan-900/40 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                        Nuvem de Palavras em Tempo Real
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveHudTab(activeHudTab === 'WORDCLOUD' ? 'ALL' : 'WORDCLOUD')}
                      className="text-[10px] text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5"
                    >
                      <span>{activeHudTab === 'WORDCLOUD' ? 'Ver 4 Painéis' : 'Expandir'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                    {wordCloudItems.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-2.5 p-2">
                        {wordCloudItems.map((item, idx) => {
                          const sizeClass =
                            item.weight >= 9
                              ? 'text-lg sm:text-xl font-black text-cyan-300 border-cyan-400/60 bg-cyan-950/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                              : item.weight >= 7
                              ? 'text-sm sm:text-base font-bold text-purple-300 border-purple-500/40 bg-purple-950/40'
                              : item.weight >= 5
                              ? 'text-xs sm:text-sm font-semibold text-emerald-300 border-emerald-500/30 bg-emerald-950/30'
                              : 'text-xs text-slate-400 border-slate-800 bg-slate-900/60';

                          return (
                            <span
                              key={item.word + idx}
                              className={`px-3 py-1 rounded-full border transition-all duration-300 font-sans flex items-center gap-1.5 ${sizeClass}`}
                            >
                              <span>{item.word}</span>
                              {item.count && item.count > 1 && (
                                <span className="text-[9px] font-mono opacity-75 px-1 rounded bg-black/30">
                                  {item.count}x
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-cyan-700 space-y-2 py-8">
                        <Cloud className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-xs font-sans text-cyan-600 max-w-xs mx-auto">
                          As palavras e temas mais enfatizados na conversa ganham destaque instantaneamente aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  QUADRANTE 3: RESUMO DA REUNIÃO & DECISÕES
                 ──────────────────────────────────────────────────────────── */}
              {(activeHudTab === 'ALL' || activeHudTab === 'SUMMARY') && (
                <div className="flex flex-col bg-slate-950/80 border border-cyan-800/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)] min-h-[290px]">
                  <div className="px-4 py-2.5 border-b border-cyan-900/40 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                        Resumo Executivo da Reunião
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveHudTab(activeHudTab === 'SUMMARY' ? 'ALL' : 'SUMMARY')}
                      className="text-[10px] text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5"
                    >
                      <span>{activeHudTab === 'SUMMARY' ? 'Ver 4 Painéis' : 'Expandir'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-xs custom-scrollbar">
                    {intelligence?.executiveSummary ? (
                      <>
                        <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-900/50 text-slate-200 leading-relaxed">
                          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block mb-1">
                            Síntese Geral
                          </span>
                          {intelligence.executiveSummary}
                        </div>

                        {intelligence.keyDecisions && intelligence.keyDecisions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Decisões Confirmadas ({intelligence.keyDecisions.length})</span>
                            </span>
                            <div className="space-y-1">
                              {intelligence.keyDecisions.map((dec, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 flex items-start gap-2"
                                >
                                  <span className="text-emerald-400 font-bold">✓</span>
                                  <span>{dec}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {intelligence.openQuestions && intelligence.openQuestions.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Pontos em Aberto / Pendências</span>
                            </span>
                            <div className="space-y-1">
                              {intelligence.openQuestions.map((q, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-start gap-2"
                                >
                                  <span className="text-amber-400 font-bold">?</span>
                                  <span>{q}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-cyan-700 space-y-2 py-8">
                        <FileText className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-xs text-cyan-600 max-w-xs mx-auto">
                          O resumo executivo, decisões tomadas e pendências serão consolidados aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  QUADRANTE 4: RESUMO DE ATIVIDADES POR PESSOA + KANBAN
                 ──────────────────────────────────────────────────────────── */}
              {(activeHudTab === 'ALL' || activeHudTab === 'PEOPLE') && (
                <div className="flex flex-col bg-slate-950/80 border border-cyan-800/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)] min-h-[290px]">
                  <div className="px-4 py-2.5 border-b border-cyan-900/40 bg-slate-900/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                        Atividades por Pessoa ({intelligence?.peopleActivities?.length || 0})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {intelligence?.peopleActivities && intelligence.peopleActivities.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCreateAllMeetingTasks}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Criar todas as tarefas identificadas diretamente no Kanban"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Enviar Todas p/ Kanban</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveHudTab(activeHudTab === 'PEOPLE' ? 'ALL' : 'PEOPLE')}
                        className="text-[10px] text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5"
                      >
                        <span>{activeHudTab === 'PEOPLE' ? 'Ver 4 Painéis' : 'Expandir'}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs custom-scrollbar">
                    {intelligence?.peopleActivities && intelligence.peopleActivities.length > 0 ? (
                      intelligence.peopleActivities.map((person, pIdx) => {
                        const isPending =
                          !person.matchedUserId &&
                          (!person.personName || person.personName === 'A Definir');

                        return (
                          <div
                            key={person.personName + pIdx}
                            className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                              isPending
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : 'bg-slate-900/90 border-cyan-900/50'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${
                                    isPending
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                      : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white'
                                  }`}
                                >
                                  {isPending ? '⚠️' : person.personName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`font-bold text-xs sm:text-sm ${
                                        isPending ? 'text-amber-300' : 'text-white'
                                      }`}
                                    >
                                      {person.personName}
                                    </span>
                                    {person.matchedUserId ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                                        Membro Vinculado
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono animate-pulse">
                                        Responsável Pendente
                                      </span>
                                    )}
                                  </div>
                                  {person.roleOrMinistry && (
                                    <span className="text-[10px] text-cyan-500 block">
                                      {person.roleOrMinistry}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Dropdown de Seleção / Alteração do Membro Responsável */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 hidden sm:inline">
                                  {isPending ? 'Atribuir a:' : 'Alterar:'}
                                </span>
                                <select
                                  value={person.matchedUserId || ''}
                                  onChange={(e) => handleQuickAssignPerson(pIdx, e.target.value)}
                                  className={`px-2 py-1 rounded-lg text-xs font-sans focus:outline-none transition-all ${
                                    isPending
                                      ? 'bg-amber-950/40 border border-amber-500/60 text-amber-200 focus:border-amber-400'
                                      : 'bg-slate-950 border border-cyan-800/60 text-cyan-200 focus:border-cyan-400'
                                  }`}
                                >
                                  <option value="">
                                    {isPending ? 'Selecione o Responsável...' : 'Desvincular (Pendente)'}
                                  </option>
                                  {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed">
                              {person.summary}
                            </p>

                            {person.tasks && person.tasks.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                                {person.tasks.map((t, tIdx) => {
                                  const taskKey = `${pIdx}_${tIdx}`;
                                  const isCreated = !!createdTaskKeys[taskKey];

                                  return (
                                    <div
                                      key={taskKey}
                                      className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-slate-200 font-semibold truncate">
                                          {t.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                          {t.demandType && <span>• {t.demandType}</span>}
                                          {t.priority && <span>• Prioridade {t.priority}</span>}
                                          {t.deadline && (
                                            <span className="text-cyan-400 flex items-center gap-0.5">
                                              <Calendar className="w-2.5 h-2.5" />
                                              {t.deadline}
                                            </span>
                                          )}
                                          {t.checklist && t.checklist.length > 0 && (
                                            <span className="text-emerald-400 hidden sm:inline">
                                              • {t.checklist.length} subtarefa(s)
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Botão de Ajustar Tarefa */}
                                        <button
                                          type="button"
                                          disabled={isCreated}
                                          onClick={() => handleOpenEditTask(pIdx, tIdx)}
                                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-cyan-300 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 flex items-center gap-1 transition-all disabled:opacity-40"
                                          title="Ajustar título, responsável, prazo, prioridade e checklist antes de importar"
                                        >
                                          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                                          <span className="hidden sm:inline">Ajustar</span>
                                        </button>

                                        {/* Botão Criar Card */}
                                        <button
                                          type="button"
                                          disabled={isCreated}
                                          onClick={() =>
                                            handleCreateSinglePersonTask(
                                              person.personName,
                                              person.matchedUserId,
                                              t,
                                              taskKey,
                                              pIdx,
                                              tIdx
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                            isCreated
                                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                                              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                                          }`}
                                        >
                                          {isCreated ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              <span>No Kanban</span>
                                            </>
                                          ) : (
                                            <>
                                              <PlusCircle className="w-3 h-3" />
                                              <span>Criar Card</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-cyan-700 space-y-2 py-8">
                        <Users className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-xs text-cyan-600 max-w-xs mx-auto">
                          As responsabilidades e entregas de cada participante da reunião serão listadas aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM HUD NAVIGATION TABS (ATIVAS E INTERATIVAS NO MODO NORMAL) ── */}
          {!isPresentationMode && (
            <div className="flex items-center justify-around px-4 py-3 border-t border-cyan-900/40 text-[10px] tracking-widest bg-slate-950/90 backdrop-blur-md z-20 shrink-0">
              <button
                type="button"
                onClick={() => setActiveHudTab('ALL')}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  activeHudTab === 'ALL'
                    ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-cyan-700 hover:text-cyan-400'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>4 QUADRANTES</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHudTab('MINDMAP')}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  activeHudTab === 'MINDMAP'
                    ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-cyan-700 hover:text-cyan-400'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>MAPA MENTAL</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHudTab('WORDCLOUD')}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  activeHudTab === 'WORDCLOUD'
                    ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-cyan-700 hover:text-cyan-400'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>NUVEM DE PALAVRAS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHudTab('SUMMARY')}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  activeHudTab === 'SUMMARY'
                    ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-cyan-700 hover:text-cyan-400'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>RESUMO DA REUNIÃO</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHudTab('PEOPLE')}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  activeHudTab === 'PEOPLE'
                    ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                    : 'text-cyan-700 hover:text-cyan-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>POR PESSOA</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           MODO 2: CORE ASSISTENTE DE VOZ (O MODO CLÁSSICO J.A.R.V.I.S.)
           ══════════════════════════════════════════════════════════════════════ */
        <>
          <div className="flex-1 flex flex-col items-center justify-center relative z-0">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
              <div
                className={`absolute inset-0 border-[2px] border-dashed rounded-full transition-all duration-[3000ms] ${
                  isAssistantLiveMode
                    ? 'border-cyan-500/60 animate-[spin_10s_linear_infinite]'
                    : 'border-cyan-800/40 animate-[spin_30s_linear_infinite]'
                }`}
              />

              <div
                className="absolute inset-6 border border-cyan-600/30 rounded-full animate-[spin_20s_linear_infinite_reverse]"
                style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }}
              />

              <div
                className={`absolute inset-10 border border-cyan-400/20 rounded-full transition-all duration-700 ${
                  assistantStatus === 'speaking' ? 'animate-ping opacity-30' : 'opacity-0'
                }`}
              />

              <div
                className={`absolute inset-14 rounded-full bg-cyan-950/50 border backdrop-blur-md transition-all duration-500 flex items-center justify-center ${
                  assistantStatus === 'speaking'
                    ? 'shadow-[0_0_120px_rgba(6,182,212,0.7)] border-cyan-400/50 scale-105'
                    : assistantStatus === 'thinking'
                    ? 'shadow-[0_0_80px_rgba(168,85,247,0.4)] border-purple-500/40'
                    : isAssistantListening
                    ? 'shadow-[0_0_100px_rgba(6,182,212,0.5)] border-cyan-500/40 scale-100'
                    : 'shadow-[0_0_40px_rgba(6,182,212,0.15)] border-cyan-800/30 scale-95'
                }`}
              >
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-300 ${
                    assistantStatus === 'speaking'
                      ? 'bg-cyan-400 shadow-[0_0_80px_rgba(34,211,238,1)]'
                      : assistantStatus === 'thinking'
                      ? 'bg-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.8)] animate-pulse'
                      : isAssistantListening
                      ? 'bg-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.8)]'
                      : 'bg-cyan-800/80 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <div
                    className="w-full h-full rounded-full border-[4px] border-cyan-200/20 animate-[spin_5s_linear_infinite]"
                    style={{ borderBottomColor: 'transparent' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-2 text-center tracking-widest">
              <span className="text-cyan-300/90 text-sm sm:text-base font-medium uppercase">
                Pronto, {currentUser?.name?.split(' ')[0] || 'Usuário'}
              </span>
              <span
                className={`text-xs sm:text-sm transition-colors ${
                  assistantStatus === 'speaking'
                    ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                    : assistantStatus === 'thinking'
                    ? 'text-purple-400 font-bold'
                    : isAssistantListening
                    ? 'text-cyan-300 font-medium'
                    : 'text-cyan-700'
                }`}
              >
                {hudText}
              </span>
            </div>
          </div>

          <div className="pb-10 px-6 flex flex-col items-center gap-6 z-10">
            <div className="flex items-center justify-center gap-8 w-full max-w-sm relative">
              <button
                onClick={clearHistory}
                className="p-3 text-cyan-800 hover:text-cyan-500 transition-colors"
                title="Limpar Memória de Sessão"
              >
                <Activity className="w-6 h-6" />
              </button>

              <div className="relative">
                {isAssistantLiveMode && (
                  <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl animate-pulse" />
                )}

                <button
                  onClick={toggleAssistantLiveMode}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                    isAssistantLiveMode
                      ? 'bg-cyan-500 text-slate-900 shadow-[0_0_40px_rgba(6,182,212,0.8)] scale-110'
                      : 'bg-slate-900 text-cyan-600 border border-cyan-800/60 hover:border-cyan-500/80 hover:text-cyan-400 hover:scale-105'
                  }`}
                >
                  {isAssistantLiveMode ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                </button>
              </div>

              <button
                onClick={stopAudio}
                className={`p-3 transition-colors ${
                  assistantStatus === 'speaking'
                    ? 'text-rose-500 hover:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                    : 'text-cyan-800 hover:text-cyan-500'
                }`}
                title="Parar Áudio"
              >
                {assistantStatus === 'speaking' ? (
                  <Square className="w-6 h-6 fill-current" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
            </div>

            <span
              className={`text-[10px] sm:text-xs tracking-[0.2em] font-medium transition-colors ${
                isAssistantLiveMode
                  ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]'
                  : 'text-cyan-800'
              }`}
            >
              {isAssistantLiveMode ? 'MODO CONVERSA ATIVADO' : 'TOQUE PARA CONVERSAR COM J.A.R.V.I.S.'}
            </span>
          </div>
        </>
      )}

      {/* ── GAVETA LATERAL: HISTÓRICO DE REUNIÕES GRAVADAS ─────────────────── */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md h-full bg-slate-950 border-l border-cyan-800/60 p-5 flex flex-col space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-slide-left font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da Gaveta */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black text-white tracking-wider">
                    HISTÓRICO DE REUNIÕES
                  </h3>
                  <p className="text-[10px] text-cyan-600">
                    {savedMeetings.length} reuniões salvas nesta organização
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ações Rápidas no Topo da Gaveta */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartNewMeeting}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nova Reunião</span>
              </button>

              {(segments.length > 0 || intelligence) && (
                <button
                  type="button"
                  onClick={() => handleSaveCurrentMeeting()}
                  className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Atual</span>
                </button>
              )}
            </div>

            {/* Lista de Reuniões */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {savedMeetings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cyan-800 space-y-2">
                  <FolderOpen className="w-10 h-10 opacity-40 text-cyan-600" />
                  <p className="text-xs text-cyan-600 font-sans">
                    Nenhuma reunião gravada ainda. Inicie uma reunião ao vivo e clique em <strong>"Salvar Reunião"</strong>.
                  </p>
                </div>
              ) : (
                savedMeetings.map((m) => {
                  const isCurrent = m.id === currentMeetingId;
                  const dateFormatted = new Date(m.createdAt).toLocaleDateString('pt-BR');
                  const timeFormatted = new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const durationStr = formatDuration(m.durationSeconds || 0);
                  const wordCount = m.wordCloud?.length || 0;
                  const decisionsCount = m.intelligence?.keyDecisions?.length || 0;
                  const peopleCount = m.intelligence?.peopleActivities?.length || 0;

                  return (
                    <div
                      key={m.id}
                      onClick={() => handleLoadSavedMeeting(m)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-900/60 border-cyan-900/30 hover:border-cyan-600/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-white truncate font-sans">
                              {m.title}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                                ABERTA AGORA
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-cyan-600 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-cyan-500" />
                              {dateFormatted} às {timeFormatted}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-cyan-500" />
                              {durationStr}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedMeeting(m.id, m.title, e)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors shrink-0"
                          title="Excluir gravação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Badges de Conteúdo Salvo */}
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-cyan-950/60 flex-wrap text-[9px] font-mono">
                        {m.intelligence?.mindMap && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/40 text-cyan-300">
                            🧠 Mapa Mental
                          </span>
                        )}
                        {wordCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/40 text-purple-300">
                            ☁️ Nuvem ({wordCount})
                          </span>
                        )}
                        {decisionsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/40 text-emerald-300">
                            ✓ {decisionsCount} Decisões
                          </span>
                        )}
                        {peopleCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/40 text-amber-300">
                            👥 {peopleCount} Pessoas
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer com status */}
            <div className="pt-2 border-t border-cyan-900/40 text-[10px] text-cyan-700 text-center">
              Sincronizado na Nuvem via Firestore & LocalStorage
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE AJUSTE DE TAREFA ANTES DO ENVIO AO KANBAN ──────────────── */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-cyan-900/50 bg-slate-950/80 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs sm:text-sm tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span>AJUSTAR DEMANDA ANTES DO KANBAN</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 overflow-y-auto space-y-4 font-sans text-xs custom-scrollbar">
              {/* Título */}
              <div className="space-y-1">
                <label className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wider font-mono">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  placeholder="Nome objetivo da entrega..."
                  className="w-full bg-slate-950 border border-cyan-900/60 rounded-xl px-3 py-2 text-sm text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Responsável */}
              <div className="space-y-1">
                <label className="text-cyan-400 font-bold flex items-center justify-between text-[11px] uppercase tracking-wider font-mono">
                  <span>Membro Responsável</span>
                  {!editingTask.selectedUserId && (
                    <span className="text-amber-400 text-[10px] font-normal font-sans">⚠️ Pendente de seleção</span>
                  )}
                </label>
                <select
                  value={editingTask.selectedUserId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    const u = users.find((usr) => usr.id === uId);
                    setEditingTask({
                      ...editingTask,
                      selectedUserId: uId,
                      personName: u ? u.name : 'A Definir'
                    });
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    editingTask.selectedUserId
                      ? 'border-cyan-900/60 text-cyan-100 focus:border-cyan-400'
                      : 'border-amber-500/60 text-amber-200 focus:border-amber-400'
                  }`}
                >
                  <option value="">⚠️ Sem Responsável Definido (A Definir)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid 3 colunas: Prioridade, Tipo, Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wider font-mono">
                    Prioridade
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value as any
                      })
                    }
                    className="w-full bg-slate-950 border border-cyan-900/60 rounded-xl px-2.5 py-1.5 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wider font-mono">
                    Tipo de Demanda
                  </label>
                  <select
                    value={editingTask.demandType}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        demandType: e.target.value
                      })
                    }
                    className="w-full bg-slate-950 border border-cyan-900/60 rounded-xl px-2.5 py-1.5 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                  >
                    {demandTypes.length > 0 ? (
                      demandTypes.map((dt) => (
                        <option key={dt.type} value={dt.label || dt.type}>
                          {dt.label || dt.type}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Arte">Arte</option>
                        <option value="Vídeo">Vídeo</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Som/Música">Som/Música</option>
                        <option value="Geral">Geral</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wider font-mono">
                    Prazo Final
                  </label>
                  <input
                    type="date"
                    value={editingTask.deadline}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        deadline: e.target.value
                      })
                    }
                    className="w-full bg-slate-950 border border-cyan-900/60 rounded-xl px-2 py-1.5 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Descrição / Orientações */}
              <div className="space-y-1">
                <label className="text-cyan-400 font-bold block text-[11px] uppercase tracking-wider font-mono">
                  Descrição & Orientações da Tarefa
                </label>
                <textarea
                  rows={3}
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value
                    })
                  }
                  placeholder="Orientações detalhadas registradas durante a conversa..."
                  className="w-full bg-slate-950 border border-cyan-900/60 rounded-xl px-3 py-2 text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Checklist / Subtarefas */}
              <div className="space-y-2">
                <label className="text-cyan-400 font-bold flex items-center justify-between text-[11px] uppercase tracking-wider font-mono">
                  <span>Subtarefas / Checklist ({editingTask.checklist.length})</span>
                </label>

                {editingTask.checklist.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {editingTask.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                      >
                        <span className="text-xs truncate flex-1">
                          {idx + 1}. {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingTask.checklist.filter((_, i) => i !== idx);
                            setEditingTask({ ...editingTask, checklist: updated });
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input para nova etapa */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingTask.newChecklistInput}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        newChecklistInput: e.target.value
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (editingTask.newChecklistInput.trim()) {
                          setEditingTask({
                            ...editingTask,
                            checklist: [...editingTask.checklist, editingTask.newChecklistInput.trim()],
                            newChecklistInput: ''
                          });
                        }
                      }
                    }}
                    placeholder="Adicionar etapa à checklist (Enter)..."
                    className="flex-1 bg-slate-950 border border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTask.newChecklistInput.trim()) {
                        setEditingTask({
                          ...editingTask,
                          checklist: [...editingTask.checklist, editingTask.newChecklistInput.trim()],
                          newChecklistInput: ''
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 border-t border-cyan-900/50 bg-slate-950/80 flex items-center justify-between gap-3 font-mono">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEditedTask(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-800/60 text-cyan-300 text-xs font-bold transition-all"
                >
                  Salvar Ajustes
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveEditedTask(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wide flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Salvar e Criar no Kanban</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
