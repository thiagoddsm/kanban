import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { DemandType, AttachmentLink, TaskPriority } from '../../types';
import { DEMAND_TYPES } from '../../services/mockData';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  Link2, 
  Trash2,
  Send,
  Building2,
  MapPin,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';

interface DemandPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemandPortalModal: React.FC<DemandPortalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { createTask, events, demandTypes } = useData();
  const { currentUser } = useAuth();
  const { currentOrganization, campuses, currentCampus } = useTenant();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [campusId, setCampusId] = useState(currentCampus?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [needByDate, setNeedByDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Attachments
  const [attachmentLinks, setAttachmentLinks] = useState<AttachmentLink[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<AttachmentLink['type']>('drive');

  // Created Task reference
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const selectedTypeDef = demandTypes.find((d) => d.type === selectedType);

  const handleSelectCategory = (type: string) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleAddLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    setAttachmentLinks([
      ...attachmentLinks,
      {
        id: 'link_' + Date.now().toString(36),
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        type: linkType,
      },
    ]);
    setLinkTitle('');
    setLinkUrl('');
  };

  const handleRemoveLink = (id: string) => {
    setAttachmentLinks(attachmentLinks.filter((l) => l.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedType) return;

    const created = createTask({
      title: title.trim(),
      description: description.trim(),
      demandType: selectedType,
      status: 'INBOX', // Always enters INBOX
      priority,
      eventId: eventId || undefined,
      campusId: campusId || undefined,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      startDate: new Date().toISOString().split('T')[0],
      deadline: needByDate,
      attachmentLinks,
      effortEstimate: 'A definir na triagem',
    });

    setCreatedTaskId(created.id);
    setStep(3);
  };

  const handleResetAndClose = () => {
    setStep(1);
    setSelectedType(null);
    setTitle('');
    setDescription('');
    setEventId('');
    setCampusId(currentCampus?.id || '');
    setAttachmentLinks([]);
    setCreatedTaskId(null);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Organization Scope Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            {currentOrganization.name}
          </span>
          {currentCampus && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {currentCampus.name}
            </span>
          )}
        </div>

        {/* Step 1: Escolha a Categoria da Demanda */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Central de Solicitações (Pipefy Style)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                O que você precisa solicitar para o Marketing?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Escolha a categoria da sua demanda para abrirmos o formulário estruturado de briefing.
              </p>
            </div>

            {/* Dynamic Visual Demand Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {demandTypes.map((d) => (
                <div
                  key={d.type}
                  onClick={() => handleSelectCategory(d.type)}
                  className={`p-4 rounded-2xl border bg-slate-950/50 cursor-pointer transition-all duration-200 flex items-start gap-3.5 group hover:scale-[1.01] ${d.color} ${d.bgLight}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 group-hover:border-indigo-500/40">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {d.label}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Formulário Estruturado de Briefing */}
        {step === 2 && selectedTypeDef && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trocar Categoria ({selectedTypeDef.label})</span>
              </button>
              <span className="text-xs text-slate-500">Etapa 2 de 2</span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título da Solicitação *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedTypeDef.placeholderText}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Description / Briefing */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Briefing, Textos & Orientações *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva claramente: qual a mensagem principal? Qual o público-alvo? Quais informações obrigatórias (data, local, preletor, versículo)? Formato desejado..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Campus & Event Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campus / Unidade Solicitante
                </label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Geral (Todos os Campi)</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evento / Campanha Vinculada
                </label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Nenhum (Demanda Avulsa / Geral)</option>
                  {events.filter((e) => !e.isArchived).map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Para quando você precisa? (Data Limite) *
                </label>
                <input
                  type="date"
                  required
                  value={needByDate}
                  onChange={(e) => setNeedByDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nível de Urgência
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Baixa (Com antecedência)</option>
                  <option value="MEDIUM">Média (Padrão)</option>
                  <option value="HIGH">Alta (Prioritário)</option>
                  <option value="URGENT">Urgente (Imediato)</option>
                </select>
              </div>
            </div>

            {/* Links / Referências */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                Links de Referência (Google Drive, Canva, Exemplos)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nome do link"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
                <div className="flex gap-1.5">
                  <select
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value as AttachmentLink['type'])}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="drive">Drive</option>
                    <option value="canva">Canva</option>
                    <option value="figma">Figma</option>
                    <option value="other">Outro</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {attachmentLinks.length > 0 && (
                <div className="space-y-1 pt-1">
                  {attachmentLinks.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-800 text-xs"
                    >
                      <span className="text-slate-300 truncate">{l.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(l.id)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Enviar Demanda para o INBOX</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Confirmação & Protocolo */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Demanda Recebida com Sucesso! 🎉
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
                Sua solicitação foi protocolada e direcionada para a coluna <strong>INBOX</strong> de <strong>{currentOrganization.name}</strong> para triagem da coordenação.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Título:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prazo solicitado:</span>
                <span className="font-bold text-indigo-300">{new Date(needByDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solicitante:</span>
                <span className="font-medium text-slate-200">{currentUser.name}</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
