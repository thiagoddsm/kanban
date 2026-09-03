import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { StorageUploadService } from '../../services/storageUploadService';
import { TaskPriority, TaskStatus, AttachmentLink } from '../../types';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Trash2, 
  Send, 
  Building2, 
  Clock, 
  HelpCircle, 
  Check, 
  ExternalLink,
  Smartphone,
  Mail,
  User,
  Layers,
  Palette,
  Video,
  Radio,
  ClipboardList,
  Copy,
  Share2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface DemandPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AttachedFile {
  id: string;
  name: string;
  sizeStr: string;
  type: AttachmentLink['type'];
  url: string;
}

const DEFAULT_BRIEFING_TEMPLATE = `1. Objetivo: Divulgar as inscrições e mobilização para o projeto/evento.
2. Data do Evento / Utilização: [Inserir data e horários]
3. Texto Obrigatório / Título: "[Inserir textos exatos e versículo se houver]"
4. Estilo Visual / Referências: [Cores sugeridas, tema, fotos de referência]`;

const DESTINATION_TEAMS = [
  {
    id: 'comunicacao',
    title: 'Comunicação',
    subtitle: 'Artes, Social e Identidade',
    icon: Palette,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    demandType: 'ARTE',
  },
  {
    id: 'audiovisual',
    title: 'Audiovisual',
    subtitle: 'Vídeos, Reels e VT',
    icon: Video,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    demandType: 'VIDEO',
  },
  {
    id: 'ti_audio',
    title: 'TI & Áudio',
    subtitle: 'Som, Transmissão e Redes',
    icon: Radio,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    demandType: 'OUTRO',
  },
  {
    id: 'operacoes',
    title: 'Operações',
    subtitle: 'Logística de Espaço',
    icon: ClipboardList,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    demandType: 'LOGISTICA',
  },
];

const DELIVERABLE_OPTIONS = [
  'Feed / Carrossel Instagram',
  'Slide de Telão (16:9)',
  'Story / WhatsApp Status',
  'Banner Impresso / Flyer',
  'Vídeo Teaser / Reels',
  'Crachá / Credencial',
  'Apresentação de Slides',
  'Suporte Técnico / Estrutura',
];

const MINISTRIES_DEPARTMENTS = [
  'Ministério de Jovens',
  'Ministério Infantil (Kids)',
  'Louvor & Adoração',
  'Família & Casais',
  'Homens',
  'Mulheres',
  'Comunicação & Mídia',
  'Ação Social & Missões',
  'Administração & Secretaria',
  'Ensino & Escola Bíblica',
  'Conselho Pastoral',
  'Outro',
];

export const DemandPortalModal: React.FC<DemandPortalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { createTask, events } = useData();
  const { currentUser } = useAuth();
  const { currentOrganization, campuses, currentCampus } = useTenant();
  const { success, error: notifyError } = useNotification();

  // Step 1: Requester identification
  const [requesterName, setRequesterName] = useState(() => currentUser?.name || '');
  const [requesterEmail, setRequesterEmail] = useState(() => currentUser?.email || '');
  const [requesterPhone, setRequesterPhone] = useState(() => currentUser?.whatsapp || currentUser?.phone || '');
  const [selectedCampusId, setSelectedCampusId] = useState(currentCampus?.id || campuses[0]?.id || '');
  const [department, setDepartment] = useState('Ministério de Jovens');

  // Step 2: Demand Specifications
  const [title, setTitle] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('comunicacao');
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([
    'Feed / Carrossel Instagram',
    'Slide de Telão (16:9)',
  ]);
  const [briefing, setBriefing] = useState(DEFAULT_BRIEFING_TEMPLATE);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [urgency, setUrgency] = useState<TaskPriority>('MEDIUM');
  const [linkedEventId, setLinkedEventId] = useState('');

  // Step 3: Attachments & Agreements
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [agreeNotifications, setAgreeNotifications] = useState(true);
  const [agreeAuthorization, setAgreeAuthorization] = useState(true);

  // Success State
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate dynamic protocol preview
  const protocolCode = useRef(
    `PIPE-${(currentOrganization.slug || 'OIKO').toUpperCase().slice(0, 4)}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  ).current;

  // Toggle Deliverables
  const toggleDeliverable = (item: string) => {
    setSelectedDeliverables((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  // Textarea toolbar formatting helpers
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
          'pipe_temp_' + Date.now(),
          file,
          currentUser?.name || requesterName || 'Solicitante'
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
      success('Arquivo(s) anexado(s) com sucesso!');
    } catch (err: any) {
      notifyError('Erro no upload', err?.message || 'Falha ao processar arquivo.');
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
      setLinkedEventId('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      notifyError('Nome obrigatório', 'Por favor, informe seu nome completo.');
      return;
    }
    if (!requesterEmail.trim()) {
      notifyError('E-mail obrigatório', 'Informe um e-mail válido para acompanhamento.');
      return;
    }
    if (!title.trim()) {
      notifyError('Título obrigatório', 'Informe um título sucinto para a demanda.');
      return;
    }
    if (!agreeAuthorization) {
      notifyError('Termo de autorização', 'Confirme que a demanda foi autorizada pela liderança.');
      return;
    }

    setIsSubmitting(true);

    const team = DESTINATION_TEAMS.find((t) => t.id === selectedTeamId);
    const demandType = team?.demandType || 'ARTE';

    const attachmentLinks: AttachmentLink[] = attachedFiles.map((f) => ({
      id: f.id,
      title: f.name,
      url: f.url,
      type: f.type,
      size: 1024 * 1024,
      uploadedAt: new Date().toISOString(),
      uploadedBy: requesterName,
    }));

    // Formata descrição com entregáveis e dados estruturados
    const structuredDescription = `${briefing.trim()}\n\n---\n**Entregáveis Solicitados:** ${selectedDeliverables.join(', ') || 'Geral'}\n**Equipe Destino:** ${team?.title || 'Comunicação'}\n**Ministério:** ${department}\n**Contato Solicitante:** ${requesterPhone || 'Não informado'} | ${requesterEmail}`;

    const created = createTask({
      title: title.trim(),
      description: structuredDescription,
      demandType,
      status: 'INBOX',
      priority: urgency,
      campusId: selectedCampusId || undefined,
      eventId: linkedEventId || undefined,
      requesterId: currentUser?.id || 'usr_guest_' + Date.now(),
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim(),
      requesterPhone: requesterPhone.trim(),
      department,
      targetTeam: team?.title,
      deliverables: selectedDeliverables,
      protocolId: protocolCode,
      startDate: new Date().toISOString().split('T')[0],
      deadline,
      attachmentLinks,
      effortEstimate: 'Em triagem',
    });

    setIsSubmitting(false);
    setCreatedTaskId(created.id);
    setSubmittedProtocol(protocolCode);
    success('Solicitação enviada com sucesso!', `Protocolo: ${protocolCode}`);
  };

  const handleCopyProtocol = () => {
    if (!submittedProtocol) return;
    navigator.clipboard.writeText(submittedProtocol);
    success('Protocolo copiado para a área de transferência!');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/20">
              o
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">oiko</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Gestão
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px] sm:max-w-none">
                  {currentOrganization.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Portal Oficial de Demandas
            </span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          {submittedProtocol ? (
            /* Success / Protocol Screen */
            <div className="text-center py-8 space-y-6 animate-scale-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
                  Demanda Protocolada com Sucesso
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Sua solicitação está na fila de triagem!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  A equipe responsável foi notificada e dará início à triagem em até <strong>24 horas úteis</strong>.
                </p>
              </div>

              {/* Protocol Card */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-md mx-auto space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Código do Protocolo
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 tracking-wider">
                    {submittedProtocol}
                  </span>
                  <button
                    onClick={handleCopyProtocol}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Copiar Protocolo"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Guarde este número para consultar o andamento a qualquer momento.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <button
                  onClick={() => {
                    setSubmittedProtocol(null);
                    setTitle('');
                    setAttachedFiles([]);
                    setBriefing(DEFAULT_BRIEFING_TEMPLATE);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
                >
                  Nova Solicitação
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
                >
                  Ver no Quadro Kanban
                </button>
              </div>
            </div>
          ) : (
            /* Main Form Matching Reference */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hero Presentation Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Nova Solicitação de Demanda
                      </h2>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        Pipe Oficial
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                      Preencha o formulário para submeter requisições de artes, vídeos, materiais de culto ou suporte técnico. Sua demanda será triada e encaminhada automaticamente à equipe responsável.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Triagem média: <strong>Até 24 horas úteis</strong></span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                    <span>* Campos obrigatórios</span>
                    <span>•</span>
                    <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      ID: {protocolCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 1: Identificação do Solicitante */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Identificação do Solicitante
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      NOME COMPLETO *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        placeholder="Ex: Thiago Moura"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                        required
                      />
                    </div>
                  </div>

                  {/* E-mail + WhatsApp Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        E-MAIL PARA ACOMPANHAMENTO *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          placeholder="thiago.moura@igrejabatista.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Notificações de avanço do card serão enviadas aqui.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        WHATSAPP / CELULAR *
                      </label>
                      <div className="relative">
                        <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={requesterPhone}
                          onChange={(e) => setRequesterPhone(e.target.value)}
                          placeholder="(61) 98124-8831"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Para dúvidas ágeis e alinhamento de briefing.
                      </span>
                    </div>
                  </div>

                  {/* Campus + Ministério Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        CAMPUS / UNIDADE *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={selectedCampusId}
                          onChange={(e) => setSelectedCampusId(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                        >
                          <option value="">Toda a Organização (Global)</option>
                          {campuses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.isMainCampus ? '(Sede)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        MINISTÉRIO OU DEPARTAMENTO *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                        >
                          {MINISTRIES_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Especificações da Demanda */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-lg">
                <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Especificações da Demanda
                  </h3>
                </div>

                {/* Título Sucinto */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    TÍTULO SUCINTO DA DEMANDA *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Material e Telão para Conferência de Homens 2025"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-750 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                    required
                  />
                </div>

                {/* Equipe de Destino (Cards) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    EQUIPE DE DESTINO *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {DESTINATION_TEAMS.map((team) => {
                      const Icon = team.icon;
                      const isSelected = selectedTeamId === team.id;
                      return (
                        <div
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-xl border ${team.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <input
                              type="radio"
                              name="destinationTeam"
                              checked={isSelected}
                              onChange={() => setSelectedTeamId(team.id)}
                              className="text-indigo-600 bg-slate-900 border-slate-700"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{team.title}</h4>
                            <p className="text-[10.5px] text-slate-400 mt-0.5 leading-tight">
                              {team.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tipo de Entregável / Peças (Chips) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    TIPO DE ENTREGÁVEL / PEÇAS
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERABLE_OPTIONS.map((item) => {
                      const isChecked = selectedDeliverables.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleDeliverable(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/20'
                              : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[9px] ${
                            isChecked ? 'bg-white text-indigo-600 border-white' : 'border-slate-600'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Briefing Completo e Textos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-bold text-slate-300">
                      BRIEFING COMPLETO E TEXTOS *
                    </label>
                    <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => applyFormat('**', '**')}
                        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white font-bold"
                        title="Negrito"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('*', '*')}
                        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white italic"
                        title="Itálico"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('• ')}
                        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white text-[11px]"
                        title="Marcadores"
                      >
                        • Marcadores
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('1. ')}
                        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white text-[11px]"
                        title="Numeração"
                      >
                        1. Numeração
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('[Link](', ')')}
                        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white text-[11px]"
                        title="Inserir Link"
                      >
                        🔗 Link
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={6}
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    placeholder="Descreva detalhadamente o objetivo, dados e textos da demanda..."
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed shadow-inner"
                    required
                  />
                  <span className="text-[10.5px] text-slate-500 block mt-1">
                    Quanto mais completo o briefing, mais ágil será a aprovação do card no Kanban.
                  </span>
                </div>

                {/* Prazo + Urgência Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      PRAZO DESEJADO DE ENTREGA *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Recomendado mínimo de 3 a 5 dias úteis.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      NÍVEL DE URGÊNCIA *
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((level) => {
                        const isSel = urgency === level;
                        const label = level === 'LOW' ? 'Baixa' : level === 'MEDIUM' ? 'Média' : level === 'HIGH' ? 'Alta' : 'Urgente';
                        const dotColor = level === 'LOW' ? 'bg-slate-400' : level === 'MEDIUM' ? 'bg-amber-400' : level === 'HIGH' ? 'bg-orange-500' : 'bg-rose-500 animate-ping';
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setUrgency(level)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                              isSel
                                ? level === 'URGENT'
                                  ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                                  : 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                            <span className="text-[11px]">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Demandas urgentes requerem validação pastoral.
                    </span>
                  </div>
                </div>

                {/* Evento Vinculado Opcional */}
                {events.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      PROJETO OU EVENTO DO CALENDÁRIO (OPCIONAL)
                    </label>
                    <select
                      value={linkedEventId}
                      onChange={(e) => setLinkedEventId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Nenhum evento vinculado (Demanda Avulsa)</option>
                      {events.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title} ({new Date(evt.startDate).toLocaleDateString('pt-BR')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SEÇÃO 3: Anexos e Arquivos de Apoio */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Anexos e Arquivos de Apoio
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    Opcional
                  </span>
                </div>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-750 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-300">
                    <strong className="text-indigo-400">Clique para enviar</strong> ou arraste arquivos aqui
                  </p>
                  <p className="text-[10px] text-slate-500">
                    PNG, JPG, PDF, DOCX ou MP4 até 50MB no total
                  </p>
                </div>

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 animate-pulse">
                    <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                      <span>Enviando arquivos para o Storage seguro...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${uploadProgress || 50}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Arquivos Anexados ({attachedFiles.length})
                    </p>
                    <div className="space-y-1.5">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                              {file.type === 'image' ? 'IMG' : file.type === 'video' ? 'MP4' : 'PDF'}
                            </span>
                            <span className="font-semibold truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {file.sizeStr} • Carregado
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consent Checkboxes */}
                <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeNotifications}
                      onChange={(e) => setAgreeNotifications(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Receber atualizações de cada fase (Triagem, Em Andamento, Concluído) e comentários do responsável diretamente por e-mail e WhatsApp.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeAuthorization}
                      onChange={(e) => setAgreeAuthorization(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                      required
                    />
                    <span className="text-[11px] leading-relaxed">
                      Declaro que as informações e textos enviados foram previamente revisados e autorizados pela liderança do ministério solicitante.
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                >
                  Limpar formulário
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Enviando Solicitação...' : 'Enviar Solicitação de Demanda'}</span>
                  </button>
                </div>
              </div>

              {/* Enterprise Trust Footer */}
              <div className="text-center pt-4 border-t border-slate-800/60 text-[10.5px] text-slate-500 space-y-1">
                <p className="flex items-center justify-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conexão Segura SSL de 256 bits • Ambiente Oiko Gestão Enterprise</span>
                </p>
                <p>
                  {currentOrganization.name} © {new Date().getFullYear()} • Departamento de Comunicação e TI. Todos os direitos reservados.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
