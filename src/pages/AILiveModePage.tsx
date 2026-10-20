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
  Loader2
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

interface TranscriptSegment {
  id: string;
  timestamp: string;
  text: string;
}

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
  const { success, warning, error: notifyError } = useNotification();

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
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [manualNoteInput, setManualNoteInput] = useState('');

  // ── Inteligência Ao Vivo (Mapa Mental, Nuvem, Resumo, Pessoas) ──
  const [intelligence, setIntelligence] = useState<LiveMeetingIntelligence | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [createdTaskKeys, setCreatedTaskKeys] = useState<Record<string, boolean>>({});

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
    [segments, apiKey, selectedModel, currentOrganization, users, events, campuses, demandTypes, notifyError, success, warning]
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

  // Criar tarefa individual de uma pessoa direto no Kanban
  const handleCreateSinglePersonTask = (
    personName: string,
    matchedUserId: string | undefined,
    taskItem: { title: string; deadline?: string; priority?: string; demandType?: string },
    taskKey: string
  ) => {
    if (createdTaskKeys[taskKey]) return;

    const normalizedList = JsonTaskParser.normalizeTasksList(
      [
        {
          titulo: taskItem.title,
          descricao_orientacoes: `Extraído ao vivo no Modo Reunião J.A.R.V.I.S.\nResponsável citado: ${personName}`,
          prioridade: (taskItem.priority as any) || 'Alta',
          tipo: taskItem.demandType || 'Arte',
          datas: {
            data_inicio: new Date().toISOString().split('T')[0],
            prazo_final: taskItem.deadline
          },
          responsaveis: [{ nome: personName, selecionado: true }]
        }
      ],
      {
        organizationId: orgId,
        users,
        events,
        campuses,
        currentUserId: userId,
        currentUserName: currentUser?.name || 'Jarvis'
      }
    );

    const parsed = normalizedList[0];
    createTask({
      title: parsed.title,
      description: parsed.description,
      status: 'INBOX',
      priority: parsed.priority,
      demandType: parsed.demandType,
      startDate: parsed.startDate,
      deadline: parsed.deadline,
      assigneeIds: matchedUserId ? [matchedUserId] : parsed.assigneeIds,
      checklist: [],
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

    intelligence.peopleActivities.forEach((person, pIdx) => {
      person.tasks.forEach((t, tIdx) => {
        const key = `${pIdx}_${tIdx}`;
        if (!createdTaskKeys[key]) {
          handleCreateSinglePersonTask(person.personName, person.matchedUserId, t, key);
          count++;
        }
      });
    });

    if (count > 0) {
      success('Importação em Lote Concluída!', `${count} tarefa(s) da reunião enviada(s) para o Kanban.`);
    } else {
      warning('Tudo já importado', 'Todas as tarefas identificadas já foram enviadas para o Kanban.');
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
              placeholder="Cole sua chave AIzaSy..."
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
          {/* ── BARRA DE CONTROLE DA REUNIÃO AO VIVO ───────────────────────── */}
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
            </div>

            {/* Indicadores & Exportação */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <label className="flex items-center gap-1.5 text-cyan-500 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="rounded border-cyan-800 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Auto-Sync IA</span>
              </label>

              {lastSyncTime && (
                <span className="text-cyan-600 hidden xl:inline">
                  Última síntese: {lastSyncTime}
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
                    <span>Copiar Ata</span>
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

          {/* ── ÁREA PRINCIPAL: FEED DE TRANSCRIÇÃO + 4 PAINÉIS HOLOGRÁFICOS ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 min-h-0 overflow-y-auto lg:overflow-hidden">
            
            {/* COLUNA ESQUERDA (3 cols): NÚCLEO NEURAL + TRANSCRIÇÃO AO VIVO */}
            <div className="lg:col-span-3 flex flex-col bg-slate-950/70 border border-cyan-900/40 rounded-2xl overflow-hidden min-h-[280px] lg:min-h-0">
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

            {/* COLUNA DIREITA (9 cols): DASHBOARD HOLOGRÁFICO DE 4 QUADRANTES OU ABA EXPANDIDA */}
            <div
              className={`lg:col-span-9 grid gap-4 min-h-0 lg:overflow-y-auto custom-scrollbar ${
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
                      intelligence.peopleActivities.map((person, pIdx) => (
                        <div
                          key={person.personName + pIdx}
                          className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-900/50 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                                {person.personName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white text-xs sm:text-sm">
                                    {person.personName}
                                  </span>
                                  {person.matchedUserId && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                                      Membro Vinculado
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
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={isCreated}
                                      onClick={() =>
                                        handleCreateSinglePersonTask(
                                          person.personName,
                                          person.matchedUserId,
                                          t,
                                          taskKey
                                        )
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all ${
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
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
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

          {/* ── BOTTOM HUD NAVIGATION TABS (ATIVAS E INTERATIVAS) ───────────── */}
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
    </div>
  );
};
