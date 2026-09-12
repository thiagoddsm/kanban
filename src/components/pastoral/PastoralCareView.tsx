import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  User, 
  MapPin, 
  ShieldCheck, 
  Lock,
  LayoutGrid,
  CalendarDays,
  FileText
} from 'lucide-react';
import { PastoralCareAppointment, PastoralStatus, PastoralAppointmentType } from '../../types';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { NewPastoralModal } from './NewPastoralModal';
import { PastoralCardModal } from './PastoralCardModal';

interface PastoralColumnDef {
  id: PastoralStatus;
  title: string;
  description: string;
  badgeBg: string;
}

const PASTORAL_COLUMNS: PastoralColumnDef[] = [
  {
    id: 'TRIAGE',
    title: '1. Triagem / Solicitações',
    description: 'Pedidos de atendimento pendentes de horário',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    id: 'SCHEDULED',
    title: '2. Agendados',
    description: 'Data e horário confirmados na agenda',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'IN_PROGRESS',
    title: '3. Em Acompanhamento',
    description: 'Sessões contínuas de aconselhamento ou visitas',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    id: 'COMPLETED',
    title: '4. Concluídos / Realizados',
    description: 'Atendimentos finalizados com sucesso',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
];

const APPOINTMENT_TYPE_BADGES: Record<PastoralAppointmentType, { label: string; icon: string; color: string }> = {
  OFFICE: { label: 'Gabinete', icon: '🏢', color: 'bg-blue-500/20 text-blue-300' },
  HOME: { label: 'Visita Residencial', icon: '🏡', color: 'bg-emerald-500/20 text-emerald-300' },
  HOSPITAL: { label: 'Hospital / Enfermos', icon: '🏥', color: 'bg-rose-500/20 text-rose-300' },
  ONLINE: { label: 'Online / Vídeo', icon: '💻', color: 'bg-purple-500/20 text-purple-300' },
  MARRIAGE: { label: 'Casais / Noivos', icon: '💍', color: 'bg-pink-500/20 text-pink-300' },
  OTHER: { label: 'Outro', icon: '🕊️', color: 'bg-slate-500/20 text-slate-300' },
};

export const PastoralCareView: React.FC = () => {
  const { pastoralAppointments, updatePastoralAppointment } = useData();
  const { isTrialExpired, openTrialExpiredModal } = useTenant();
  const { canViewPastoral, isAdmin, users } = useAccess() as any;

  const [activeViewMode, setActiveViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPastorId, setFilterPastorId] = useState<string>('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalDefaultStatus, setNewModalDefaultStatus] = useState<PastoralStatus>('SCHEDULED');
  const [selectedAppointment, setSelectedAppointment] = useState<PastoralCareAppointment | null>(null);

  const [dragOverColumn, setDragOverColumn] = useState<PastoralStatus | null>(null);

  // Se o usuário não tiver permissão para ver atendimentos pastorais (Sigilo Ministerial)
  if (!canViewPastoral && !isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Área Restrita ao Corpo Pastoral</h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          Os atendimentos, visitas a enfermos e anotações de gabinete possuem sigilo ministerial estrito.
          Solicite ao pastor sênior ou administrador da igreja caso necessite de acesso pastoral.
        </p>
      </div>
    );
  }

  // Filtragem de atendimentos
  const filteredAppointments = useMemo(() => {
    return pastoralAppointments.filter((a) => {
      if (filterType && a.appointmentType !== filterType) return false;
      if (filterPastorId && a.assignedPastorId !== filterPastorId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = a.personName.toLowerCase().includes(query);
        const matchPhone = a.phone.includes(query);
        const matchReason = (a.reason || '').toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchReason) return false;
      }
      return true;
    });
  }, [pastoralAppointments, filterType, filterPastorId, searchQuery]);

  // Estatísticas
  const totalCount = pastoralAppointments.length;
  const triageCount = pastoralAppointments.filter((a) => a.status === 'TRIAGE').length;
  const scheduledCount = pastoralAppointments.filter((a) => a.status === 'SCHEDULED').length;
  const inProgressCount = pastoralAppointments.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = pastoralAppointments.filter((a) => a.status === 'COMPLETED').length;

  const handleOpenNew = (defaultStatus: PastoralStatus = 'SCHEDULED') => {
    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }
    setNewModalDefaultStatus(defaultStatus);
    setIsNewModalOpen(true);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: PastoralStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: PastoralStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    const item = pastoralAppointments.find((a) => a.id === id);
    if (item && item.status !== targetStatus) {
      await updatePastoralAppointment({
        ...item,
        status: targetStatus,
      });
    }
  };

  // Agrupamento para a visão de Agenda por Data
  const sortedByDate = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime || '00:00'}`).getTime();
      const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime || '00:00'}`).getTime();
      return dateA - dateB;
    });
  }, [filteredAppointments]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Header & Metrics */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-900/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/20 font-bold">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-white tracking-tight">
                    Cuidado & Agenda Pastoral
                  </h1>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase border border-amber-500/30">
                    Sigilo Pastoral
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Gabinete, aconselhamentos e visitas a enfermos com discrição e privacidade ministerial
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Alternador de Modo (Kanban / Agenda) */}
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveViewMode('kanban')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeViewMode === 'kanban'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setActiveViewMode('calendar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeViewMode === 'calendar'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Agenda
              </button>
            </div>

            <button
              onClick={() => handleOpenNew('SCHEDULED')}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 group"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
              Novo Atendimento
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
              {triageCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Em Triagem</p>
              <p className="text-xs font-semibold text-slate-200">Aguardando agendamento</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm">
              {scheduledCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Agendados</p>
              <p className="text-xs font-semibold text-slate-200">Confirmados na agenda</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
              {inProgressCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Acompanhamento</p>
              <p className="text-xs font-semibold text-slate-200">Processo contínuo</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
              {completedCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Realizados</p>
              <p className="text-xs font-semibold text-slate-200">Concluídos com oração</p>
            </div>
          </div>
        </div>

        {/* Toolbar de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos os Tipos</option>
            <option value="OFFICE">🏢 Gabinete</option>
            <option value="HOME">🏡 Visita Residencial</option>
            <option value="HOSPITAL">🏥 Visita Hospitalar</option>
            <option value="ONLINE">💻 Online / Vídeo</option>
            <option value="MARRIAGE">💍 Casais / Noivos</option>
            <option value="OTHER">🕊️ Outro</option>
          </select>

          {users && users.length > 0 && (
            <select
              value={filterPastorId}
              onChange={(e) => setFilterPastorId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos os Pastores</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content: Alterna entre Kanban e Agenda */}
      {activeViewMode === 'kanban' ? (
        /* MODO KANBAN */
        <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
          <div className="flex gap-4 items-start min-w-max h-full pb-4">
            {PASTORAL_COLUMNS.map((col) => {
              const colItems = filteredAppointments.filter((a) => a.status === col.id);
              const isOver = dragOverColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`w-72 shrink-0 bg-slate-900/60 rounded-3xl border flex flex-col max-h-full transition-all duration-200 ${
                    isOver 
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10' 
                      : 'border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tracking-tight ${col.badgeBg} px-2 py-0.5 rounded-full border`}>
                          {col.title}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {colItems.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{col.description}</p>
                    </div>

                    <button
                      onClick={() => handleOpenNew(col.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors ml-1 shrink-0"
                      title={`Adicionar novo em ${col.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Card List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-[140px]">
                    {colItems.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center text-center p-3 rounded-2xl border border-dashed border-slate-800/60 text-slate-500">
                        <p className="text-[11px] font-semibold">Nenhum atendimento nesta etapa</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">Arraste cards ou clique no + para agendar</p>
                      </div>
                    ) : (
                      colItems.map((item) => {
                        const typeInfo = APPOINTMENT_TYPE_BADGES[item.appointmentType] || APPOINTMENT_TYPE_BADGES.OTHER;
                        const cleanPhone = item.phone.replace(/\D/g, '');
                        const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onClick={() => setSelectedAppointment(item)}
                            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-indigo-500/60 hover:bg-slate-850 cursor-pointer shadow-sm transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                {item.personName}
                              </h3>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${typeInfo.color} shrink-0`}>
                                {typeInfo.icon} {typeInfo.label}
                              </span>
                            </div>

                            {item.reason && (
                              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                {item.reason}
                              </p>
                            )}

                            {/* Data & Horário */}
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-400" />
                                {new Date(item.scheduledDate).toLocaleDateString('pt-BR')}
                                {item.scheduledTime && (
                                  <span className="text-slate-500 font-semibold ml-1">
                                    às {item.scheduledTime}
                                  </span>
                                )}
                              </span>

                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                                  title="Enviar mensagem no WhatsApp"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {/* Pastor Atribuído & Local */}
                            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                              <span className="truncate">
                                {item.assignedPastorName ? `Pastor: ${item.assignedPastorName}` : 'Sem pastor definido'}
                              </span>
                              {item.location && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <MapPin className="w-2.5 h-2.5 text-rose-400" />
                                  <span className="truncate max-w-[100px]">{item.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MODO AGENDA CRONOLÓGICA */
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                Linha do Tempo da Agenda Pastoral ({sortedByDate.length} registros)
              </h2>
            </div>

            {sortedByDate.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30">
                <HeartHandshake className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Nenhum atendimento agendado</p>
                <button
                  onClick={() => handleOpenNew('SCHEDULED')}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"
                >
                  Agendar Primeiro Atendimento
                </button>
              </div>
            ) : (
              sortedByDate.map((item) => {
                const typeInfo = APPOINTMENT_TYPE_BADGES[item.appointmentType] || APPOINTMENT_TYPE_BADGES.OTHER;
                const isPast = new Date(`${item.scheduledDate}T${item.scheduledTime || '23:59'}`) < new Date();

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAppointment(item)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {new Date(item.scheduledDate).toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-base font-black text-white leading-none">
                          {new Date(item.scheduledDate).getDate()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {item.personName}
                          </h3>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </div>

                        {item.reason && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {item.reason}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          {item.scheduledTime && (
                            <span className="flex items-center gap-1 font-semibold text-slate-300">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              {item.scheduledTime} ({item.durationMinutes || 60}m)
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </span>
                          {item.assignedPastorName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {item.assignedPastorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'IN_PROGRESS'
                          ? 'bg-purple-500/20 text-purple-300'
                          : item.status === 'SCHEDULED'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Novo Atendimento */}
      <NewPastoralModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultStatus={newModalDefaultStatus}
      />

      {/* Modal de Detalhes do Atendimento */}
      <PastoralCardModal
        appointment={selectedAppointment}
        isOpen={selectedAppointment !== null}
        onClose={() => setSelectedAppointment(null)}
      />
    </div>
  );
};
