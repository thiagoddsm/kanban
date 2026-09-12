import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  HeartHandshake,
  User,
  FileText
} from 'lucide-react';
import { PastoralCareAppointment, PastoralStatus, PastoralAppointmentType } from '../../types';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';

interface PastoralCardModalProps {
  appointment: PastoralCareAppointment | null;
  isOpen: boolean;
  onClose: () => void;
}

const APPOINTMENT_TYPES: Record<PastoralAppointmentType, { label: string; icon: string }> = {
  OFFICE: { label: 'Gabinete Presencial', icon: '🏢' },
  HOME: { label: 'Visita Residencial', icon: '🏡' },
  HOSPITAL: { label: 'Visita Hospitalar', icon: '🏥' },
  ONLINE: { label: 'Atendimento Online', icon: '💻' },
  MARRIAGE: { label: 'Aconselhamento de Casal', icon: '💍' },
  OTHER: { label: 'Outro Atendimento', icon: '🕊️' },
};

export const PastoralCardModal: React.FC<PastoralCardModalProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const { updatePastoralAppointment, deletePastoralAppointment, users } = useData();
  const { isTrialExpired, openTrialExpiredModal } = useTenant();
  const { isAdmin, canManagePastoral } = useAccess();

  const [status, setStatus] = useState<PastoralStatus>(appointment?.status || 'SCHEDULED');
  const [appointmentType, setAppointmentType] = useState<PastoralAppointmentType>(appointment?.appointmentType || 'OFFICE');
  const [scheduledDate, setScheduledDate] = useState(appointment?.scheduledDate || '');
  const [scheduledTime, setScheduledTime] = useState(appointment?.scheduledTime || '');
  const [phone, setPhone] = useState(appointment?.phone || '');
  const [email, setEmail] = useState(appointment?.email || '');
  const [location, setLocation] = useState(appointment?.location || '');
  const [assignedPastorId, setAssignedPastorId] = useState(appointment?.assignedPastorId || '');
  const [reason, setReason] = useState(appointment?.reason || '');
  const [confidentialNotes, setConfidentialNotes] = useState(appointment?.confidentialNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (appointment) {
      setStatus(appointment.status);
      setAppointmentType(appointment.appointmentType);
      setScheduledDate(appointment.scheduledDate);
      setScheduledTime(appointment.scheduledTime || '');
      setPhone(appointment.phone);
      setEmail(appointment.email || '');
      setLocation(appointment.location || '');
      setAssignedPastorId(appointment.assignedPastorId || '');
      setReason(appointment.reason || '');
      setConfidentialNotes(appointment.confidentialNotes || '');
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleSave = async () => {
    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }

    setIsSaving(true);
    try {
      const pastor = users.find((u) => u.id === assignedPastorId);
      await updatePastoralAppointment({
        ...appointment,
        status,
        appointmentType,
        scheduledDate,
        scheduledTime: scheduledTime || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        assignedPastorId: assignedPastorId || undefined,
        assignedPastorName: pastor?.name || undefined,
        reason: reason.trim() || undefined,
        confidentialNotes: confidentialNotes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Excluir o agendamento de atendimento de ${appointment.personName}?`)) {
      await deletePastoralAppointment(appointment.id);
      onClose();
    }
  };

  const cleanPhone = phone.replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
        `Olá ${appointment.personName}, graça e paz! Confirmando nosso atendimento pastoral para o dia ${new Date(
          scheduledDate
        ).toLocaleDateString('pt-BR')}${scheduledTime ? ` às ${scheduledTime}` : ''}. Qualquer dúvida estamos à disposição.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{appointment.personName}</h2>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase border border-amber-500/30">
                  Sigiloso
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {APPOINTMENT_TYPES[appointmentType]?.icon} {APPOINTMENT_TYPES[appointmentType]?.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors mr-2"
                title="Confirmar via WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}

            {(isAdmin || canManagePastoral) && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                title="Excluir atendimento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Status e Tipo de Atendimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status do Atendimento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PastoralStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="TRIAGE">1. Triagem / Solicitação</option>
                <option value="SCHEDULED">2. Agendado</option>
                <option value="IN_PROGRESS">3. Em Acompanhamento</option>
                <option value="COMPLETED">4. Concluído / Realizado</option>
                <option value="CANCELLED">5. Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Atendimento
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as PastoralAppointmentType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="OFFICE">🏢 Gabinete Presencial</option>
                <option value="HOME">🏡 Visita Residencial</option>
                <option value="HOSPITAL">🏥 Visita Hospitalar</option>
                <option value="ONLINE">💻 Atendimento Online</option>
                <option value="MARRIAGE">💍 Aconselhamento de Casal</option>
                <option value="OTHER">🕊️ Outro Atendimento</option>
              </select>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data Agendada
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Horário
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Telefone e Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Local / Sala
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Gabinete 1 ou Residência"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Pastor Responsável */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Pastor / Conselheiro Designado
            </label>
            <select
              value={assignedPastorId}
              onChange={(e) => setAssignedPastorId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Nenhum pastor atribuído</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Motivo do Atendimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Motivo do Atendimento
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Anotações Confidenciais */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <label className="block text-xs font-bold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Anotações Confidenciais do Pastor (Gabinete)
            </label>
            <p className="text-[11px] text-amber-200/70">
              Registros pastorais privados protegidos por sigilo ministerial.
            </p>
            <textarea
              rows={4}
              value={confidentialNotes}
              onChange={(e) => setConfidentialNotes(e.target.value)}
              placeholder="Histórico das conversas, versículos, direcionamentos..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-end gap-3 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
