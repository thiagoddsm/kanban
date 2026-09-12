import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, MapPin, Calendar, Heart, MessageSquare } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { MemberJourneyStage } from '../../types';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStage?: MemberJourneyStage;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  isOpen,
  onClose,
  defaultStage = 'VISITOR',
}) => {
  const { currentCampus, campuses } = useTenant();
  const { users, addMemberJourney } = useData();
  const { isTrialExpired, openTrialExpiredModal } = useTenant();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [firstVisitDate, setFirstVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [ageGroup, setAgeGroup] = useState<'KIDS' | 'TEEN' | 'YOUTH' | 'ADULT' | 'COUPLE' | 'SENIOR'>('ADULT');
  const [stage, setStage] = useState<MemberJourneyStage>(defaultStage);
  const [assignedLeaderId, setAssignedLeaderId] = useState('');
  const [smallGroupName, setSmallGroupName] = useState('');
  const [notes, setNotes] = useState('');
  const [campusId, setCampusId] = useState(currentCampus?.id || campuses[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedLeader = users.find((u) => u.id === assignedLeaderId);

      await addMemberJourney({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        firstVisitDate,
        ageGroup,
        stage,
        campusId: campusId || undefined,
        assignedLeaderId: assignedLeaderId || undefined,
        assignedLeaderName: assignedLeader?.name || undefined,
        smallGroupName: smallGroupName.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: [],
        contactHistory: [],
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Novo Contato / Visitante</h2>
              <p className="text-xs text-slate-400">Cadastre para iniciar o acolhimento na jornada da igreja</p>
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
          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome Completo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Roberto & Carla Albuquerque"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Telefone / WhatsApp e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp / Telefone <span className="text-rose-400">*</span>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                E-mail (opcional)
              </label>
              <input
                type="email"
                placeholder="roberto@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Data 1ª Visita & Faixa Etária */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data da 1ª Visita / Decisão
              </label>
              <input
                type="date"
                value={firstVisitDate}
                onChange={(e) => setFirstVisitDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                Perfil / Faixa Etária
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="ADULT">Adulto</option>
                <option value="COUPLE">Casal / Família</option>
                <option value="YOUTH">Jovem (18-29)</option>
                <option value="TEEN">Adolescente (12-17)</option>
                <option value="KIDS">Criança / Infantil</option>
                <option value="SENIOR">Melhor Idade (60+)</option>
              </select>
            </div>
          </div>

          {/* Bairro e Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Bairro / Região
              </label>
              <input
                type="text"
                placeholder="Ex: Jardim Paulista"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {campuses && campuses.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Campus / Sede
                </label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Líder de Acolhimento & Pequeno Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Líder de Acolhimento Designado
              </label>
              <select
                value={assignedLeaderId}
                onChange={(e) => setAssignedLeaderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Nenhum líder atribuído</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pequeno Grupo / Célula / GC
              </label>
              <input
                type="text"
                placeholder="Ex: Célula Betel ou Jovens Norte"
                value={smallGroupName}
                onChange={(e) => setSmallGroupName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Etapa Inicial */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Etapa Inicial no Funil
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as MemberJourneyStage)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="VISITOR">1. Novo Visitante / Contato</option>
              <option value="FIRST_CONTACT">2. Primeiro Contato Realizado</option>
              <option value="CONNECTED_GROUP">3. Conectado em Grupo / Célula</option>
              <option value="DISCIPLESHIP">4. Discipulado / Classe de Membresia</option>
              <option value="INTEGRATED">5. Membro Efetivo & Servindo</option>
            </select>
          </div>

          {/* Observações Iniciais */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Observações / Pedido de Oração / Como conheceu a igreja
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Veio convidado pela família Silva. Pediu oração pela saúde do filho."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
              {isSubmitting ? 'Salvando...' : 'Cadastrar na Jornada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
