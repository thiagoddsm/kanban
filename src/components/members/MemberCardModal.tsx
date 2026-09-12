import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  MessageSquare, 
  Send,
  Plus,
  Clock,
  UserCheck
} from 'lucide-react';
import { MemberJourneyCard, MemberJourneyStage, MemberContactLog } from '../../types';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';

interface MemberCardModalProps {
  member: MemberJourneyCard | null;
  isOpen: boolean;
  onClose: () => void;
}

const STAGE_LABELS: Record<MemberJourneyStage, string> = {
  VISITOR: '1. Novo Visitante / Contato',
  FIRST_CONTACT: '2. Primeiro Contato Realizado',
  CONNECTED_GROUP: '3. Conectado em Grupo / Célula',
  DISCIPLESHIP: '4. Discipulado / Membresia',
  INTEGRATED: '5. Membro Efetivo & Servindo',
};

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { updateMemberJourney, deleteMemberJourney, users } = useData();
  const { isTrialExpired, openTrialExpiredModal, currentCampus, campuses } = useTenant();
  const { currentUser } = useAuth();
  const { isAdmin, isLeader } = useAccess();

  const [stage, setStage] = useState<MemberJourneyStage>(member?.stage || 'VISITOR');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [neighborhood, setNeighborhood] = useState(member?.neighborhood || '');
  const [assignedLeaderId, setAssignedLeaderId] = useState(member?.assignedLeaderId || '');
  const [smallGroupName, setSmallGroupName] = useState(member?.smallGroupName || '');
  const [notes, setNotes] = useState(member?.notes || '');
  const [campusId, setCampusId] = useState(member?.campusId || '');

  // Log de contato
  const [newLogChannel, setNewLogChannel] = useState<'WHATSAPP' | 'CALL' | 'IN_PERSON' | 'EMAIL'>('WHATSAPP');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (member) {
      setStage(member.stage);
      setPhone(member.phone);
      setEmail(member.email || '');
      setNeighborhood(member.neighborhood || '');
      setAssignedLeaderId(member.assignedLeaderId || '');
      setSmallGroupName(member.smallGroupName || '');
      setNotes(member.notes || '');
      setCampusId(member.campusId || '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSave = async () => {
    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }

    setIsSaving(true);
    try {
      const assignedLeader = users.find((u) => u.id === assignedLeaderId);
      await updateMemberJourney({
        ...member,
        stage,
        phone: phone.trim(),
        email: email.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        assignedLeaderId: assignedLeaderId || undefined,
        assignedLeaderName: assignedLeader?.name || undefined,
        smallGroupName: smallGroupName.trim() || undefined,
        campusId: campusId || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNotes.trim()) return;

    const newLog: MemberContactLog = {
      id: 'log_' + Date.now().toString(36),
      authorId: currentUser?.id || 'sys',
      authorName: currentUser?.name || 'Líder de Acolhimento',
      channel: newLogChannel,
      notes: newLogNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [newLog, ...(member.contactHistory || [])];
    await updateMemberJourney({
      ...member,
      contactHistory: updatedHistory,
    });
    setNewLogNotes('');
  };

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja remover ${member.fullName} da jornada?`)) {
      await deleteMemberJourney(member.id);
      onClose();
    }
  };

  // WhatsApp link formatado
  const cleanPhone = phone.replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
        `Olá ${member.fullName}, graça e paz! Passando para agradecer sua presença conosco na igreja. Como podemos orar por você essa semana?`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{member.fullName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-slate-400">
                  1ª Visita: {new Date(member.firstVisitDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors mr-2"
                title="Abrir conversa no WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}

            {(isAdmin || isLeader) && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                title="Remover da jornada"
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Mudar Estágio do Funil */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Etapa Atual da Jornada
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as MemberJourneyStage)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="VISITOR">1. Novo Visitante / Contato</option>
              <option value="FIRST_CONTACT">2. Primeiro Contato Realizado</option>
              <option value="CONNECTED_GROUP">3. Conectado em Grupo / Célula</option>
              <option value="DISCIPLESHIP">4. Discipulado / Classe de Membresia</option>
              <option value="INTEGRATED">5. Membro Efetivo & Servindo</option>
            </select>
          </div>

          {/* Dados de Contato e Localização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Não informado"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Bairro / Cidade
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Não informado"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pequeno Grupo / Célula
              </label>
              <input
                type="text"
                value={smallGroupName}
                onChange={(e) => setSmallGroupName(e.target.value)}
                placeholder="Ex: Célula Esperança"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Líder de Acolhimento
              </label>
              <select
                value={assignedLeaderId}
                onChange={(e) => setAssignedLeaderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Nenhum líder atribuído</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {campuses && campuses.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campus / Sede
                </label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Observações & Histórico Geral
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações gerais..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Linha do Tempo de Contatos e Ligações */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Histórico de Contatos & Acompanhamentos
            </h3>

            {/* Registrar novo contato */}
            <form onSubmit={handleAddContactLog} className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={newLogChannel}
                  onChange={(e) => setNewLogChannel(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="CALL">Ligação</option>
                  <option value="IN_PERSON">Visita / Presencial</option>
                  <option value="EMAIL">E-mail</option>
                </select>

                <input
                  type="text"
                  placeholder="Descreva o contato (ex: Ligamos para dar as boas-vindas e oramos juntos)..."
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar
                </button>
              </div>
            </form>

            {/* Lista de Registros */}
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {(!member.contactHistory || member.contactHistory.length === 0) ? (
                <p className="text-xs text-slate-500 italic py-2">Nenhum registro de contato adicionado ainda.</p>
              ) : (
                member.contactHistory.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs flex items-start gap-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-800 text-indigo-300 shrink-0">
                      {log.channel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-200 text-xs">{log.notes}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Por {log.authorName} em {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
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
