import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { StorageUploadService } from '../services/storageUploadService';
import { WhatsAppNotificationService } from '../services/whatsappNotificationService';
import { Task, TaskPriority, AttachmentLink } from '../types';
import { 
  Building2, 
  Search, 
  LogIn, 
  HelpCircle, 
  FileText, 
  Clock, 
  User, 
  Mail, 
  MessageSquare, 
  MapPin, 
  Layers, 
  Palette, 
  Video, 
  Radio, 
  ClipboardList, 
  Calendar, 
  AlertCircle, 
  Upload, 
  Check, 
  X, 
  CheckCircle2, 
  Copy, 
  Printer, 
  ArrowRight, 
  ExternalLink,
  Shield,
  Sparkles
} from 'lucide-react';

interface AttachedFile {
  id: string;
  name: string;
  sizeStr: string;
  type: AttachmentLink['type'];
  url: string;
}

const DESTINATION_TEAMS = [
  {
    id: 'comunicacao',
    title: 'Comunicação',
    subtitle: 'Artes, Social e Identidade',
    icon: Palette,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    demandType: 'ARTE',
  },
  {
    id: 'audiovisual',
    title: 'Audiovisual',
    subtitle: 'Vídeos, Reels e VT',
    icon: Video,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    demandType: 'VIDEO',
  },
  {
    id: 'ti_audio',
    title: 'TI & Áudio',
    subtitle: 'Som, Transmissão e Redes',
    icon: Radio,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    demandType: 'OUTRO',
  },
  {
    id: 'operacoes',
    title: 'Operações',
    subtitle: 'Logística de Espaço',
    icon: ClipboardList,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    demandType: 'OUTRO',
  },
];

const DELIVERABLE_OPTIONS = [
  'Feed / Carrossel Instagram',
  'Slide de Telão (16:9)',
  'Story / WhatsApp Status',
  'Banner Impresso / Flyer',
  'Vídeo Teaser',
];

const DEFAULT_BRIEFING_TEMPLATE = `1. Objetivo: Divulgar as inscrições e mobilização para o evento.
2. Data do Evento: [Inserir data e horários]
3. Texto obrigatório: "[Inserir textos exatos, versículo ou chamada]"
4. Estilo visual: [Cores sugeridas, tema ou fotos de referência]`;

export const PublicDemandPortalPage: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { currentOrganization, switchOrganizationBySlug, campuses } = useTenant();
  const { createTask, departments } = useData();
  const { success, error: notifyError } = useNotification();

  // Garante sincronia da organização pelo slug da URL
  useEffect(() => {
    if (orgSlug) {
      switchOrganizationBySlug(orgSlug);
    }
  }, [orgSlug]);

  // View state: 'form' | 'success'
  const [viewState, setViewState] = useState<'form' | 'success'>('form');

  // Form Fields - Step 1: Solicitante
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Ministério de Jovens');

  // Form Fields - Step 2: Demanda
  const [title, setTitle] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('comunicacao');
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([
    'Feed / Carrossel Instagram',
    'Slide de Telão (16:9)',
  ]);
  const [briefing, setBriefing] = useState(DEFAULT_BRIEFING_TEMPLATE);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [urgency, setUrgency] = useState<TaskPriority>('MEDIUM');

  // Step 3: Anexos
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Checkboxes
  const [agreeNotifications, setAgreeNotifications] = useState(true);
  const [agreeAuthorization, setAgreeAuthorization] = useState(true);

  // Success State
  const [submittedTask, setSubmittedTask] = useState<Task | null>(null);
  const [protocolCode, setProtocolCode] = useState('');
  const [registeredDate, setRegisteredDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Deliverable
  const toggleDeliverable = (item: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  // Textarea formatting toolbar
  const applyFormat = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = briefing;
    const selectedText = currentText.substring(start, end);
    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    setBriefing(newText);
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        const uploaded = await StorageUploadService.uploadTaskAttachment(
          currentOrganization.id,
          'pipe_' + Date.now(),
          file,
          requesterName.trim() || 'Solicitante'
        );

        const newFile: AttachedFile = {
          id: uploaded.id,
          name: uploaded.title,
          sizeStr: uploaded.size ? `${(uploaded.size / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB',
          type: uploaded.type,
          url: uploaded.url,
        };

        setAttachedFiles((prev) => [...prev, newFile]);
      }
      success('Arquivo anexado com sucesso!');
    } catch (err: any) {
      notifyError('Erro no upload', err?.message || 'Falha ao processar anexo.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearForm = () => {
    if (window.confirm('Deseja limpar todos os campos preenchidos?')) {
      setTitle('');
      setBriefing(DEFAULT_BRIEFING_TEMPLATE);
      setSelectedDeliverables([]);
      setAttachedFiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      notifyError('Campo obrigatório', 'Por favor informe seu nome completo.');
      return;
    }
    if (!requesterEmail.trim()) {
      notifyError('Campo obrigatório', 'Informe um e-mail para acompanhar as etapas.');
      return;
    }
    if (!requesterPhone.trim()) {
      notifyError('Campo obrigatório', 'Informe seu WhatsApp para receber o protocolo.');
      return;
    }
    if (!title.trim()) {
      notifyError('Campo obrigatório', 'Informe um título sucinto para a demanda.');
      return;
    }
    if (!agreeAuthorization) {
      notifyError('Termo de Autorização', 'Confirme que a demanda foi autorizada pelo seu ministério.');
      return;
    }

    setIsSubmitting(true);

    const team = DESTINATION_TEAMS.find((t) => t.id === selectedTeamId);
    const demandType = team?.demandType || 'ARTE';

    // Gera número de protocolo oficial (Ex: #OIKO-2026-08492)
    const currentYear = new Date().getFullYear();
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    const generatedProtocol = `#OIKO-${currentYear}-${randomSeq}`;

    const attachmentLinks: AttachmentLink[] = attachedFiles.map((f) => ({
      id: f.id,
      title: f.name,
      url: f.url,
      type: f.type,
      size: 1024 * 1024,
      uploadedAt: new Date().toISOString(),
      uploadedBy: requesterName.trim(),
    }));

    const structuredDescription = `${briefing.trim()}\n\n---\n**Entregáveis:** ${selectedDeliverables.join(', ') || 'Geral'}\n**Equipe:** ${team?.title || 'Comunicação'}\n**Ministério:** ${selectedDepartment}\n**Contato:** ${requesterPhone.trim()} | ${requesterEmail.trim()}\n**Protocolo Oficial:** ${generatedProtocol}`;

    const campusObj = campuses.find((c) => c.id === selectedCampusId);

    const newTask = createTask({
      title: title.trim(),
      description: structuredDescription,
      demandType,
      status: 'INBOX',
      priority: urgency,
      campusId: selectedCampusId || undefined,
      campusName: campusObj ? campusObj.name : 'Sede Principal',
      requesterId: 'usr_guest_' + Date.now(),
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim(),
      requesterPhone: requesterPhone.trim(),
      department: selectedDepartment,
      targetTeam: team?.title,
      deliverables: selectedDeliverables,
      protocolId: generatedProtocol,
      startDate: new Date().toISOString().split('T')[0],
      deadline,
      tags: ['Portal Público', team?.title || 'Comunicação'],
      attachmentLinks,
      effortEstimate: 'Em triagem',
    });

    // Disparo automático via WhatsApp (Evolution API)
    if (requesterPhone.trim() && agreeNotifications) {
      WhatsAppNotificationService.notifyPublicDemandSubmitted({
        organization: currentOrganization,
        task: newTask,
        requesterPhone: requesterPhone.trim(),
        requesterName: requesterName.trim(),
        protocolCode: generatedProtocol,
      });
    }

    setSubmittedTask(newTask);
    setProtocolCode(generatedProtocol);
    const now = new Date();
    setRegisteredDate(
      `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    );
    setIsSubmitting(false);
    setViewState('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    success('Demanda enviada com sucesso!', `Protocolo: ${generatedProtocol}`);
  };

  const handleCopyProtocol = () => {
    if (!protocolCode) return;
    navigator.clipboard.writeText(protocolCode);
    success('Protocolo copiado para a área de transferência!');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* ── TOP NAV BAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/20">
            o
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">oiko</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Gestão
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px] sm:max-w-none">
                {currentOrganization.name}
              </span>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Portal Público de Demandas
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            to={`/${currentOrganization.slug || 'ib'}/protocolo`}
            className="hidden sm:flex items-center gap-1.5 font-bold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Consultar por Protocolo</span>
          </Link>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Já tem conta?</span>
            <Link
              to="/login"
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Entrar
            </Link>
          </div>
          <button
            onClick={() => window.open('https://api.whatsapp.com/send?phone=5521989001302', '_blank')}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Ajuda & Suporte"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 my-auto">
        {viewState === 'form' ? (
          /* ═══════════════════════════════════════════════════════
             STATE 1: FORMULÁRIO DE SOLICITAÇÃO (Pipe Oficial)
             ═══════════════════════════════════════════════════════ */
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Top Accent Line */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            {/* Header Hero */}
            <div className="p-6 sm:p-8 border-b border-slate-100 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Nova Solicitação de Demanda
                    </h1>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                      Pipe Oficial
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
                    Preencha o formulário para submeter requisições de artes, vídeos, materiais de culto ou suporte técnico. Sua demanda será triada e encaminhada automaticamente à equipe responsável.
                  </p>
                </div>
              </div>

              {/* Status & SLA Sub-Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Triagem média: <strong className="text-slate-700">Até 24 horas úteis</strong></span>
                  <span className="text-slate-300">•</span>
                  <span className="text-rose-600 font-medium">* Campos obrigatórios</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  ID: PIPE-{(currentOrganization.slug || 'IBM').toUpperCase()}-{new Date().getFullYear()}
                </span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              {/* ── STEP 1: IDENTIFICAÇÃO DO SOLICITANTE ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    1
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Identificação do Solicitante
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        placeholder="Ex: Pr. Thiago Moura"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      E-mail para Acompanhamento *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        placeholder="thiago@igreja.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Notificações de avanço do card serão enviadas aqui.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      WhatsApp / Celular *
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={requesterPhone}
                        onChange={(e) => setRequesterPhone(e.target.value)}
                        placeholder="(21) 98900-1302"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Para dúvidas ágeis e envio do link de protocolo.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Campus / Unidade *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedCampusId}
                        onChange={(e) => setSelectedCampusId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">Sede Principal (Geral)</option>
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ministério ou Departamento *
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                      >
                        {departments && departments.length > 0 ? (
                          departments.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Ministério de Jovens">Ministério de Jovens</option>
                            <option value="Ministério Pastoral">Ministério Pastoral</option>
                            <option value="Ministério Infantil / Kids">Ministério Infantil / Kids</option>
                            <option value="Ministério de Louvor">Ministério de Louvor</option>
                            <option value="Missões & Ação Social">Missões & Ação Social</option>
                            <option value="Administração & Finanças">Administração & Finanças</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 2: ESPECIFICAÇÕES DA DEMANDA ── */}
              <div className="space-y-5 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    2
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Especificações da Demanda
                  </h2>
                </div>

                {/* Título Sucinto */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Título Sucinto da Demanda *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Material e Telão para Conferência de Homens 2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-inner font-semibold"
                  />
                </div>

                {/* Equipe de Destino */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Equipe de Destino *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DESTINATION_TEAMS.map((team) => {
                      const isSelected = selectedTeamId === team.id;
                      const Icon = team.icon;
                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => setSelectedTeamId(team.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2.5 ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                              : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${team.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{team.title}</p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{team.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Entregáveis / Peças */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tipo de Entregável / Peças
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERABLE_OPTIONS.map((opt) => {
                      const isChecked = selectedDeliverables.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleDeliverable(opt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                            isChecked
                              ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Briefing Completo e Textos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Briefing Completo e Textos *
                    </label>
                    <span className="text-[10px] text-slate-400">Suporta formatação básica</span>
                  </div>

                  {/* Toolbar */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
                    <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-1.5 text-slate-600">
                      <button
                        type="button"
                        onClick={() => applyFormat('**', '**')}
                        className="p-1 rounded hover:bg-white hover:text-slate-900 font-black text-xs px-1.5"
                        title="Negrito"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('_', '_')}
                        className="p-1 rounded hover:bg-white hover:text-slate-900 italic text-xs px-1.5 font-serif"
                        title="Itálico"
                      >
                        I
                      </button>
                      <div className="h-3 w-px bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormat('• ')}
                        className="p-1 rounded hover:bg-white hover:text-slate-900 text-xs px-1.5"
                        title="Marcadores"
                      >
                        • Marcadores
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('1. ')}
                        className="p-1 rounded hover:bg-white hover:text-slate-900 text-xs px-1.5"
                        title="Numeração"
                      >
                        1. Numeração
                      </button>
                      <div className="h-3 w-px bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormat('[Link: ', ']')}
                        className="p-1 rounded hover:bg-white hover:text-slate-900 text-xs px-1.5"
                        title="Link"
                      >
                        🔗 Link
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      required
                      rows={5}
                      value={briefing}
                      onChange={(e) => setBriefing(e.target.value)}
                      className="w-full p-3.5 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none resize-y leading-relaxed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Quanto mais completo o briefing, mais ágil será a aprovação do card no Kanban.
                  </span>
                </div>

                {/* Prazo Desejado & Nível de Urgência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Prazo Desejado de Entrega *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 text-xs text-slate-900 outline-none transition-all shadow-inner font-semibold"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Recomendado mínimo de 3 a 5 dias úteis.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nível de Urgência
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'LOW', label: 'Baixa', dotColor: 'bg-slate-400' },
                        { id: 'MEDIUM', label: 'Média', dotColor: 'bg-amber-500' },
                        { id: 'HIGH', label: 'Alta', dotColor: 'bg-rose-500' },
                        { id: 'URGENT', label: 'Urgente', dotColor: 'bg-red-600 animate-pulse' },
                      ].map((lvl) => {
                        const isSelected = urgency === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setUrgency(lvl.id as TaskPriority)}
                            className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${lvl.dotColor}`} />
                            <span>{lvl.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Demandas urgentes requerem validação pastoral.
                    </span>
                  </div>
                </div>
              </div>

              {/* ── STEP 3: ANEXOS E ARQUIVOS DE APOIO ── */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                      3
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Anexos e Arquivos de Apoio
                    </h2>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Opcional
                  </span>
                </div>

                {/* Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-blue-50/30 group space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      <span className="text-blue-600 underline">Clique para enviar</span> ou arraste arquivos aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PNG, JPG, PDF, DOCX ou MP4 até 50MB no total
                    </p>
                  </div>
                  {isUploading && (
                    <div className="pt-2 max-w-xs mx-auto">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${uploadProgress || 50}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Processando upload seguro...</span>
                    </div>
                  )}
                </div>

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Arquivos Anexados ({attachedFiles.length})
                    </span>
                    <div className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              {file.name.split('.').pop() || 'FILE'}
                            </span>
                            <span className="font-semibold truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400">({file.sizeStr})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeNotifications}
                    onChange={(e) => setAgreeNotifications(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Receber atualizações de cada fase (Triagem, Em Andamento, Concluído) e comentários do responsável diretamente por e-mail e WhatsApp.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAuthorization}
                    onChange={(e) => setAgreeAuthorization(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Declaro que as informações e textos enviados foram previamente revisados e autorizados pela liderança do ministério solicitante.
                  </span>
                </label>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Limpar formulário
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Cadastrando Demanda...</span>
                    </>
                  ) : (
                    <>
                      <span>+ Enviar Solicitação de Demanda</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             STATE 2: TELA DE SUCESSO & PROTOCOLO (Stitch Match)
             ═══════════════════════════════════════════════════════ */
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden animate-fade-in">
            {/* Top Colored Line */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            <div className="p-6 sm:p-10 space-y-8">
              {/* Check & Success Hero */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Solicitação enviada com sucesso!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Sua demanda foi recebida pela equipe e já está na esteira de triagem inicial.
                </p>
              </div>

              {/* Protocol Highlight Box */}
              <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 text-center space-y-2.5 shadow-inner">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                  Seu Número de Protocolo
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {protocolCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyProtocol}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Registrado em: {registeredDate}</span>
                </div>
              </div>

              {/* Resumo da Solicitação Registrada */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Resumo da Solicitação Registrada
                  </h3>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Título da Demanda</span>
                    <p className="text-sm font-black text-slate-900">{title}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Solicitante</span>
                      <p className="font-bold text-slate-800">{requesterName}</p>
                      <p className="text-slate-500 text-[11px]">{requesterEmail}</p>
                      <p className="text-slate-500 text-[11px]">{requesterPhone}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Campus / Ministério</span>
                      <p className="font-bold text-slate-800">
                        {campuses.find((c) => c.id === selectedCampusId)?.name || 'Campus Sede - Asa Sul'}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {selectedDepartment}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Equipe de Destino</span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                        <span>🎨</span>
                        <span>{DESTINATION_TEAMS.find((t) => t.id === selectedTeamId)?.title || 'Comunicação'} ({DESTINATION_TEAMS.find((t) => t.id === selectedTeamId)?.subtitle})</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Prazo Desejado e Nível</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {new Date(deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Urgência {urgency === 'URGENT' ? 'Urgente' : urgency === 'HIGH' ? 'Alta' : 'Média'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedDeliverables.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Peças / Entregáveis Requisitados</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDeliverables.map((deliv) => (
                          <span
                            key={deliv}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-blue-600" />
                            <span>{deliv}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {attachedFiles.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        Anexos Vinculados ({attachedFiles.length})
                      </span>
                      <div className="space-y-1">
                        {attachedFiles.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                PDF
                              </span>
                              <span className="font-semibold">{f.name}</span>
                              <span className="text-slate-400 text-[10px]">({f.sizeStr})</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Processado
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fluxo de Atendimento & SLA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Fluxo de Atendimento & SLA
                  </h3>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">1. Recebimento do Card</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Concluído
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Demanda cadastrada na base e inserida no backlog.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-sm ring-4 ring-blue-100">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600">2. Triagem e Validação Pastoral</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Fase Atual
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        SLA estimado: até 24 horas úteis para homologação e distribuição de fila.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                      3
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700">3. Produção pela Equipe de Comunicação</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Criação das artes gráficas e formatação do slide 16:9.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                      4
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700">4. Entrega e Aprovação Final</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Envio dos links de download com homologação do solicitante.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blue Alert Box */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Enviamos uma cópia de confirmação para o seu e-mail [<strong>{requesterEmail}</strong>] e você receberá atualizações a cada mudança de fase diretamente no WhatsApp.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setBriefing(DEFAULT_BRIEFING_TEMPLATE);
                    setAttachedFiles([]);
                    setViewState('form');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm transition-all"
                >
                  + Enviar Nova Solicitação
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Comprovante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/${currentOrganization.slug || 'ib'}/protocolo/${encodeURIComponent(protocolCode.replace(/^#+/, ''))}`)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all"
                  >
                    <span>Acompanhar Demanda</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="py-6 px-4 text-center border-t border-slate-200 bg-white text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Conexão Segura SSL de 256 bits</span>
          <span>•</span>
          <span>Ambiente Oiko Gestão Enterprise</span>
        </div>
        <p className="text-[11px]">
          {currentOrganization.name} © {new Date().getFullYear()} • Departamento de Comunicação e TI. Todos os direitos reservados.
        </p>
      </footer>

      {/* Floating Support Widget */}
      <div className="fixed bottom-4 right-4 z-20">
        <button
          type="button"
          onClick={() => window.open('https://api.whatsapp.com/send?phone=5521989001302', '_blank')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-lg hover:shadow-xl transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Suporte Oiko</span>
        </button>
      </div>
    </div>
  );
};
