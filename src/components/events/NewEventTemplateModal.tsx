import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { EVENT_TEMPLATES } from '../../services/mockData';
import { X, Sparkles, Wand2, Calendar, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';

interface NewEventTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewEventTemplateModal: React.FC<NewEventTemplateModalProps> = ({ isOpen, onClose }) => {
  const { createEventFromTemplate } = useData();
  const { currentOrganization, campuses, currentCampus } = useTenant();

  const [selectedTemplateId, setSelectedTemplateId] = useState(EVENT_TEMPLATES[0].id);
  const [eventTitle, setEventTitle] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45); // 45 days in future
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [campusId, setCampusId] = useState(currentCampus?.id || '');
  const [location, setLocation] = useState('Templo Principal');

  if (!isOpen) return null;

  const selectedTemplate = EVENT_TEMPLATES.find((t) => t.id === selectedTemplateId) || EVENT_TEMPLATES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    createEventFromTemplate(
      selectedTemplateId,
      eventTitle.trim(),
      startDate,
      endDate || startDate,
      campusId || null,
      location.trim() || undefined
    );

    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Gerador Inteligente de Projetos</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Criar Projeto a Partir de Modelo
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gera automaticamente o projeto do evento e todas as tarefas encadeadas com prazos relativos e dependências.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Choose Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Escolha o Modelo de Evento
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EVENT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white block">{tmpl.name}</span>
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                      {tmpl.defaultTasks.length} tarefas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome do Evento / Projeto *
            </label>
            <input
              type="text"
              required
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Ex: Conferência Aviva 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>

          {/* Dates & Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data do Evento (Principal) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campus / Unidade
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="">Institucional (Toda a Organização)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Localização
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Templo Principal"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Preview of auto-generated tasks */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Tarefas que serão geradas automaticamente ({selectedTemplate.defaultTasks.length}):
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
              {selectedTemplate.defaultTasks.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-850 text-xs text-slate-300"
                >
                  <span className="font-medium truncate">{t.title}</span>
                  <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20 shrink-0">
                    {t.daysBeforeEvent > 0 ? `${t.daysBeforeEvent} dias antes` : 'Dia do evento'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/25 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Gerar Projeto & Tarefas</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
