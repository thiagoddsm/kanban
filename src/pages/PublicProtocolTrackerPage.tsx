import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { StorageService } from '../services/storageService';
import { FirestoreRepository } from '../services/firestoreRepository';
import { Task, TaskStatus } from '../types';
import {
  Building2,
  Search,
  LogIn,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Printer,
  Share2,
  ExternalLink,
  Download,
  FileText,
  Calendar,
  Layers,
  MapPin,
  User,
  Shield,
  MessageSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Tag,
  Check
} from 'lucide-react';

export const PublicProtocolTrackerPage: React.FC = () => {
  const { orgSlug, protocolId: routeProtocolId } = useParams<{ orgSlug: string; protocolId?: string }>();
  const navigate = useNavigate();
  const { currentOrganization, switchOrganizationBySlug } = useTenant();
  const { tasks: contextTasks } = useData();
  const { success, error: notifyError } = useNotification();

  const [searchQuery, setSearchQuery] = useState(routeProtocolId || '');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(routeProtocolId));
  const [copied, setCopied] = useState(false);

  // Garante que o Tenant correto seja carregado a partir do orgSlug na URL
  useEffect(() => {
    if (orgSlug && currentOrganization?.slug !== orgSlug) {
      switchOrganizationBySlug(orgSlug);
    }
  }, [orgSlug, currentOrganization?.slug, switchOrganizationBySlug]);

  // Função de busca da tarefa por protocolo ou ID
  const lookupProtocol = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      // 1. Tenta buscar nas tasks do contexto
      let found = contextTasks.find(
        (t) =>
          (t.protocolId && t.protocolId.toUpperCase() === code) ||
          t.id.toUpperCase() === code ||
          t.id.toUpperCase().includes(code.replace('#', ''))
      );

      // 2. Se não encontrou no contexto em memória, busca no Storage Local
      if (!found && currentOrganization?.id) {
        const localTasks = StorageService.getTasks(currentOrganization.id);
        found = localTasks.find(
          (t) =>
            (t.protocolId && t.protocolId.toUpperCase() === code) ||
            t.id.toUpperCase() === code ||
            t.id.toUpperCase().includes(code.replace('#', ''))
        );
      }

      // 3. Se ainda não encontrou e estiver online, busca no Firestore
      if (!found && currentOrganization?.id) {
        try {
          const remoteTasks = await FirestoreRepository.fetchTasks(currentOrganization.id);
          found = remoteTasks.find(
            (t) =>
              (t.protocolId && t.protocolId.toUpperCase() === code) ||
              t.id.toUpperCase() === code ||
              t.id.toUpperCase().includes(code.replace('#', ''))
          );
        } catch {
          // Fallback silencioso se Firestore não estiver configurado
        }
      }

      setActiveTask(found || null);

      if (found) {
        // Atualiza URL sem recarregar a página
        if (orgSlug && (!routeProtocolId || routeProtocolId.toUpperCase() !== code)) {
          navigate(`/${orgSlug}/protocolo/${encodeURIComponent(found.protocolId || code)}`, { replace: true });
        }
      }
    } catch (err: any) {
      notifyError('Erro na busca', 'Não foi possível consultar o protocolo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito ao carregar rota com protocolId
  useEffect(() => {
    if (routeProtocolId) {
      setSearchQuery(routeProtocolId);
      lookupProtocol(routeProtocolId);
    }
  }, [routeProtocolId, currentOrganization?.id, contextTasks.length]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      notifyError('Digite o protocolo', 'Informe o código no formato #OIKO-2026-XXXXX');
      return;
    }
    lookupProtocol(searchQuery);
  };

  const handleCopyLink = () => {
    if (!activeTask) return;
    const protocolCode = activeTask.protocolId || activeTask.id;
    const url = `${window.location.origin}/${orgSlug || 'oiko'}/protocolo/${encodeURIComponent(protocolCode)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    success('Link de acompanhamento copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyProtocol = () => {
    if (!activeTask) return;
    const code = activeTask.protocolId || activeTask.id;
    navigator.clipboard.writeText(code);
    success('Protocolo copiado para a área de transferência!');
  };

  // Mapeamento de Status do Kanban para as 4 Fases de SLA
  const stagesProgress = useMemo(() => {
    if (!activeTask) return [];

    const status = activeTask.status;

    let stage1Status: 'done' | 'active' | 'pending' = 'done';
    let stage2Status: 'done' | 'active' | 'pending' = 'pending';
    let stage3Status: 'done' | 'active' | 'pending' = 'pending';
    let stage4Status: 'done' | 'active' | 'pending' = 'pending';

    let stage1Date = activeTask.startDate || activeTask.createdAt || 'Registrado';
    let stage2Date = 'Em análise';
    let stage3Date = 'Aguardando triagem';
    let stage4Date = activeTask.deadline ? `Prazo: ${new Date(activeTask.deadline).toLocaleDateString('pt-BR')}` : 'Aguardando';

    if (status === 'INBOX') {
      stage2Status = 'active';
      stage2Date = 'Em andamento';
    } else if (status === 'PLANNING') {
      stage2Status = 'active';
      stage2Date = 'Planejamento e alocação';
    } else if (status === 'IN_PROGRESS') {
      stage2Status = 'done';
      stage2Date = 'Aprovado na triagem';
      stage3Status = 'active';
      stage3Date = 'Equipe em produção ativa';
    } else if (status === 'BLOCKED') {
      stage2Status = 'done';
      stage3Status = 'active';
      stage3Date = 'Aguardando retorno/ajustes';
    } else if (status === 'REVIEW') {
      stage2Status = 'done';
      stage3Status = 'done';
      stage3Date = 'Produção finalizada';
      stage4Status = 'active';
      stage4Date = 'Validação pastoral em andamento';
    } else if (status === 'DONE') {
      stage2Status = 'done';
      stage3Status = 'done';
      stage4Status = 'done';
      stage4Date = 'Concluído e liberado';
    }

    return [
      {
        number: '1',
        title: 'Solicitação Recebida',
        desc: 'Demanda registrada com sucesso no sistema e protocolo oficial gerado.',
        date: stage1Date,
        state: stage1Status,
      },
      {
        number: '2',
        title: 'Triagem e Viabilidade',
        desc: 'Avaliação técnica, checagem de prazos da equipe e conformidade pastoral.',
        date: stage2Date,
        state: stage2Status,
      },
      {
        number: '3',
        title: 'Produção Criativa',
        desc: 'Criação de artes, diagramação, edição de vídeos ou configurações solicitadas.',
        date: stage3Date,
        state: stage3Status,
      },
      {
        number: '4',
        title: 'Revisão e Entrega',
        desc: 'Controle de qualidade e liberação dos arquivos para uso e publicação.',
        date: stage4Date,
        state: stage4Status,
      },
    ];
  }, [activeTask]);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'INBOX':
        return {
          label: 'Em Triagem Inicial',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'PLANNING':
        return {
          label: 'Em Planejamento',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
        };
      case 'IN_PROGRESS':
        return {
          label: 'Em Produção Criativa',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500 animate-pulse',
        };
      case 'BLOCKED':
        return {
          label: 'Aguardando Informações',
          color: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'REVIEW':
        return {
          label: 'Em Revisão Final',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500 animate-pulse',
        };
      case 'DONE':
        return {
          label: 'Concluído e Disponível',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          label: 'Em Andamento',
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  };

  const currentOrgTitle = currentOrganization?.name || 'Comunicação & Mídia';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Barra de Topo Co-Branded */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
                oiko
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Gestão
              </span>
            </Link>

            <span className="text-slate-300 text-lg font-light">/</span>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {currentOrgTitle.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-semibold text-sm text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                {currentOrgTitle}
              </span>
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Consulta de Protocolo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/${orgSlug || 'oiko'}/solicitar`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Solicitação</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Acesso da Equipe</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Banner de Busca de Protocolo */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-8 print:hidden">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-4 ring-8 ring-emerald-50/50">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Acompanhamento de Solicitação
            </h1>
            <p className="text-sm text-slate-500 mt-2 mb-6">
              Consulte as etapas de produção, prazos e entregáveis da sua demanda em tempo real informando o número do protocolo.
            </p>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: #OIKO-2026-08492"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Consultar
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Estado: Buscando ou Não Encontrado */}
        {hasSearched && !isLoading && !activeTask && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Protocolo não localizado</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Nenhuma solicitação encontrada com o código{' '}
              <strong className="font-mono text-slate-700">{searchQuery}</strong> na organização{' '}
              <strong>{currentOrgTitle}</strong>.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-left text-slate-600 mb-6 space-y-1.5 border border-slate-100">
              <p className="font-medium text-slate-800">Dicas para localizar sua demanda:</p>
              <p>• Verifique a mensagem de confirmação recebida no seu WhatsApp.</p>
              <p>• Confirme se o código inclui os dígitos do ano (Ex: #OIKO-2026-XXXXX).</p>
              <p>• Caso tenha feito a solicitação em outra filial ou campus, entre em contato com a equipe.</p>
            </div>
            <Link
              to={`/${orgSlug || 'oiko'}/solicitar`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Criar Nova Solicitação
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Estado: Protocolo Encontrado (Renderização do Card e SLA Tracker) */}
        {activeTask && (
          <div className="space-y-6">
            {/* Header do Card de Demanda */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm shadow-sm">
                    <span>{activeTask.protocolId || activeTask.id}</span>
                    <button
                      onClick={handleCopyProtocol}
                      title="Copiar Protocolo"
                      className="p-1 hover:text-emerald-400 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(() => {
                    const badge = getStatusBadge(activeTask.status);
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Título da Demanda e Metadados */}
              <div className="pt-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {activeTask.title}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      Solicitante
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate block">
                      {activeTask.requesterName || 'Não informado'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      Ministério
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate block">
                      {activeTask.department || 'Geral'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Campus
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate block">
                      {activeTask.campusName || 'Sede Principal'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Prazo Estimado
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate block">
                      {activeTask.deadline
                        ? new Date(activeTask.deadline).toLocaleDateString('pt-BR')
                        : 'Definindo na triagem'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha do Tempo e SLA Visual (4 Etapas - Stitch Design) */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Etapas do Atendimento (SLA)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Acompanhe o fluxo oficial de produção e validação da equipe criativa.
                  </p>
                </div>
                {activeTask.status === 'DONE' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Concluído com Sucesso
                  </span>
                )}
              </div>

              <div className="relative border-l-2 border-slate-200 ml-4 pl-6 sm:pl-8 space-y-8">
                {stagesProgress.map((stage) => {
                  const isDone = stage.state === 'done';
                  const isActive = stage.state === 'active';

                  return (
                    <div key={stage.number} className="relative group">
                      {/* Indicador no eixo vertical */}
                      <div
                        className={`absolute -left-[35px] sm:-left-[43px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-50'
                            : isActive
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.number}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-semibold text-sm sm:text-base ${
                              isDone
                                ? 'text-slate-900'
                                : isActive
                                ? 'text-blue-600 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {stage.title}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              Em Andamento
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Concluído
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-400">{stage.date}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">{stage.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid Inferior: Entregáveis & Arquivos Prontos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entregáveis Solicitados */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Formatos Solicitados
                </h4>

                {activeTask.deliverables && activeTask.deliverables.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeTask.deliverables.map((deliv, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {deliv}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic mb-4">
                    Peças gerais definidas no briefing descritivo.
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1 font-semibold uppercase">
                    Equipe Responsável
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {activeTask.targetTeam || 'Comunicação & Mídia'}
                  </span>
                </div>
              </div>

              {/* Arquivos Prontos / Anexos para Download */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  Arquivos e Entregáveis
                </h4>

                {activeTask.attachmentLinks && activeTask.attachmentLinks.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {activeTask.attachmentLinks.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-medium text-slate-800 group-hover:text-emerald-900 truncate block">
                              {file.title || 'Arquivo Anexo'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              {file.type || 'DOCUMENT'}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhum arquivo final disponibilizado ainda.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Assim que a equipe aprovar as peças, os links de download aparecerão aqui.
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Notificação ativa:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    WhatsApp informado
                  </span>
                </div>
              </div>
            </div>

            {/* Briefing Original Registrado */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Briefing e Detalhes da Solicitação
              </h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                {activeTask.description || 'Sem descrição adicional fornecida.'}
              </div>
            </div>

            {/* Rodapé de Ações de Suporte */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Dúvidas sobre o andamento?</h4>
                  <p className="text-xs text-slate-400">
                    Fale diretamente com a coordenação de comunicação e mídia da sua igreja.
                  </p>
                </div>
              </div>

              <Link
                to={`/${orgSlug || 'oiko'}/solicitar`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-colors shrink-0"
              >
                Abrir Outra Demanda
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Oficial */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">oiko Gestão</span>
            <span>—</span>
            <span>Sistema Integrado de Demandas e Fluxo Criativo</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-500">
              <Shield className="w-3 h-3 text-emerald-500" />
              Conexão Segura
            </span>
            <Link to="/login" className="hover:text-slate-600 transition-colors">
              Acesso Administrativo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default PublicProtocolTrackerPage;
