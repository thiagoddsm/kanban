import React, { useState } from 'react';
import { 
  X, 
  HeartHandshake, 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  MapPin, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { PastoralAppointmentType, PastoralStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';

interface NewPastoralModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: PastoralStatus;
}

export const NewPastoralModal: React.FC<NewPastoralModalProps> = ({
  isOpen,
  onClose,
  defaultStatus = 'SCHEDULED',
}) => {
  const { currentCampus, campuses, isTrialExpired, openTrialExpiredModal } = useTenant();
  const { users, addPastoralAppointment } = useData();

  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [appointmentType, setAppointmentType] = useState<PastoralAppointmentType>('OFFICE');
  const [status, setStatus] = useState<PastoralStatus>(defaultStatus);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [assignedPastorId, setAssignedPastorId] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;

    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedPastor = users.find((u) => u.id === assignedPastorId);

      await addPastoralAppointment({
        personName: personName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        appointmentType,
        status,
        scheduledDate,
        scheduledTime: scheduledTime || undefined,
        durationMinutes,
        assignedPastorId: assignedPastorId || undefined,
        assignedPastorName: assignedPastor?.name || undefined,
        campusId: currentCampus?.id || undefined,
        location: location.trim() || undefined,
        reason: reason.trim() || undefined,
        confidentialNotes: confidentialNotes.trim() || undefined,
        isConfidential: true,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Novo Atendimento / Agenda Pastoral</h2>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase border border-amber-500/30">
                  Sigiloso
                </span>
              </div>
              <p className="text-xs text-slate-400">Gabinete, visita hospitalar, residencial ou aconselhamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Nome da Pessoa ou Casal */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome do Membro / Família / Solicitante <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos & Mariana Oliveira"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Telefone & Tipo de Atendimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Telefone / WhatsApp <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Atendimento
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as PastoralAppointmentType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="OFFICE">🏢 Gabinete Presencial na Igreja</option>
                <option value="HOME">🏡 Visita Residencial / Familiar</option>
                <option value="HOSPITAL">🏥 Visita Hospitalar / Enfermos</option>
                <option value="ONLINE">💻 Atendimento Online / Vídeo</option>
                <option value="MARRIAGE">💍 Aconselhamento de Casais / Noivos</option>
                <option value="OTHER">🕊️ Outro Atendimento Pastoral</option>
              </select>
            </div>
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Horário
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duração (min)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos (1h)</option>
                <option value={90}>90 minutos (1h30)</option>
                <option value={120}>120 minutos (2h)</option>
              </select>
            </div>
          </div>

          {/* Pastor / Conselheiro & Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Pastor / Conselheiro Designado
              </label>
              <select
                value={assignedPastorId}
                onChange={(e) => setAssignedPastorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Nenhum pastor atribuído</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Local / Sala / Endereço
              </label>
              <input
                type="text"
                placeholder="Ex: Gabinete Pastoral 1 ou Endereço do Membro"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Inicial */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Status do Atendimento
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PastoralStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="TRIAGE">1. Triagem / Solicitação Pendente</option>
              <option value="SCHEDULED">2. Agendado na Agenda</option>
              <option value="IN_PROGRESS">3. Em Acompanhamento</option>
              <option value="COMPLETED">4. Concluído / Realizado</option>
            </select>
          </div>

          {/* Motivo do Atendimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Motivo / Assunto Geral
            </label>
            <input
              type="text"
              placeholder="Ex: Orientação familiar, oração de enfermos, casamento..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Anotações Confidenciais do Pastor */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <label className="block text-xs font-bold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Anotações Confidenciais do Pastor (Gabinete)
            </label>
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              Estas anotações são restritas ao corpo pastoral e protegidas por sigilo ministerial.
            </p>
            <textarea
              rows={3}
              placeholder="Pontos abordados, versículos compartilhados, direcionamentos espirituais..."
              value={confidentialNotes}
              onChange={(e) => setConfidentialNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Atendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
