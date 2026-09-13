import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Sparkles,
  Heart,
  ChevronRight,
  Plus
} from 'lucide-react';
import { MemberJourneyCard, MemberJourneyStage } from '../../types';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { NewMemberModal } from './NewMemberModal';
import { MemberCardModal } from './MemberCardModal';

interface ColumnDef {
  id: MemberJourneyStage;
  title: string;
  description: string;
  badgeBg: string;
  borderHover: string;
}

const JOURNEY_COLUMNS: ColumnDef[] = [
  {
    id: 'VISITOR',
    title: '1. Novos Visitantes',
    description: 'Preencheram ficha ou participaram do culto',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    borderHover: 'hover:border-blue-500/50',
  },
  {
    id: 'FIRST_CONTACT',
    title: '2. Primeiro Contato',
    description: 'WhatsApp ou ligação pastoral de boas-vindas',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    id: 'CONNECTED_GROUP',
    title: '3. Em Grupo / Célula',
    description: 'Encaminhado para um pequeno grupo ou rede',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    borderHover: 'hover:border-purple-500/50',
  },
  {
    id: 'DISCIPLESHIP',
    title: '4. Discipulado & Batismo',
    description: 'Em preparação para o batismo ou classe de membros',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    id: 'INTEGRATED',
    title: '5. Membro Integrado',
    description: 'Batizado, membro oficial ou servindo em ministério',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    borderHover: 'hover:border-emerald-500/50',
  },
];

export const MemberJourneyBoard: React.FC = () => {
  const { memberJourneys, updateMemberJourney } = useData();
  const { currentCampus, campuses, isTrialExpired, openTrialExpiredModal } = useTenant();
  const { canManageMembers, isTeam } = useAccess();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampusId, setFilterCampusId] = useState(currentCampus?.id || '');
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>('');
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalDefaultStage, setNewModalDefaultStage] = useState<MemberJourneyStage>('VISITOR');
  const [selectedMember, setSelectedMember] = useState<MemberJourneyCard | null>(null);

  // Drag and drop state
  const [dragOverColumn, setDragOverColumn] = useState<MemberJourneyStage | null>(null);

  // Filter members
  const filteredMembers = useMemo(() => {
    return memberJourneys.filter((m) => {
      // Campus filter
      if (filterCampusId && m.campusId && m.campusId !== filterCampusId) {
        return false;
      }
      // Age group filter
      if (filterAgeGroup && m.ageGroup !== filterAgeGroup) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = m.fullName.toLowerCase().includes(query);
        const matchPhone = m.phone.includes(query);
        const matchNeigh = (m.neighborhood || '').toLowerCase().includes(query);
        const matchGroup = (m.smallGroupName || '').toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchNeigh && !matchGroup) return false;
      }
      return true;
    });
  }, [memberJourneys, filterCampusId, filterAgeGroup, searchQuery]);

  // Metric summaries
  const totalCount = memberJourneys.length;
  const visitorsCount = memberJourneys.filter((m) => m.stage === 'VISITOR').length;
  const connectedCount = memberJourneys.filter((m) => m.stage === 'CONNECTED_GROUP').length;
  const integratedCount = memberJourneys.filter((m) => m.stage === 'INTEGRATED').length;

  const handleOpenNew = (stage: MemberJourneyStage = 'VISITOR') => {
    if (isTrialExpired) {
      openTrialExpiredModal();
      return;
    }
    setNewModalDefaultStage(stage);
    setIsNewModalOpen(true);
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('text/plain', memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: MemberJourneyStage) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: MemberJourneyStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    const memberId = e.dataTransfer.getData('text/plain');
    if (!memberId) return;

    const target = memberJourneys.find((m) => m.id === memberId);
    if (target && target.stage !== targetStage) {
      await updateMemberJourney({
        ...target,
        stage: targetStage,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Header & Metrics Banner */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Jornada & Integração de Membros
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Feche a &quot;porta dos fundos&quot; da igreja: acompanhe cada visitante até se tornar membro ativo
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleOpenNew('VISITOR')}
            className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2 shrink-0 group self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
            Novo Visitante / Contato
          </button>
        </div>

        {/* 4 Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-brand-600 dark:text-blue-400 font-black text-sm">
              {totalCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total na Jornada</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Pessoas em acompanhamento</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 font-black text-sm">
              {visitorsCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Novos Visitantes</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Aguardando 1º contato</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
              {connectedCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Em Pequenos Grupos</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Conectados em comunhão</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
              {integratedCount}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Membros Ativos</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Batizados e servindo</p>
            </div>
          </div>
        </div>

        {/* Toolbar de Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, bairro ou grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
            />
          </div>

          {campuses && campuses.length > 1 && (
            <select
              value={filterCampusId}
              onChange={(e) => setFilterCampusId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 shadow-sm"
            >
              <option value="">Todos os Campi</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterAgeGroup}
            onChange={(e) => setFilterAgeGroup(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 shadow-sm"
          >
            <option value="">Todos os Perfis</option>
            <option value="ADULT">Adultos</option>
            <option value="COUPLE">Casais</option>
            <option value="YOUTH">Jovens</option>
            <option value="TEEN">Adolescentes</option>
            <option value="KIDS">Infantil</option>
            <option value="SENIOR">Melhor Idade</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
        <div className="flex gap-4 items-start min-w-max h-full pb-4">
          {JOURNEY_COLUMNS.map((col) => {
            const colMembers = filteredMembers.filter((m) => m.stage === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-72 shrink-0 bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl border flex flex-col max-h-full transition-all duration-200 ${
                  isOver 
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-indigo-950/20 shadow-lg shadow-brand-500/10' 
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black tracking-tight ${col.badgeBg} px-2 py-0.5 rounded-full border`}>
                        {col.title}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {colMembers.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">{col.description}</p>
                  </div>

                  <button
                    onClick={() => handleOpenNew(col.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ml-1 shrink-0"
                    title={`Adicionar novo em ${col.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Card List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-[140px]">
                  {colMembers.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-center p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800/60 text-slate-400 dark:text-slate-500">
                      <p className="text-[11px] font-semibold">Nenhuma pessoa nesta etapa</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-600 mt-0.5">Arraste cards ou clique no + para adicionar</p>
                    </div>
                  ) : (
                    colMembers.map((member) => {
                      const cleanPhone = member.phone.replace(/\D/g, '');
                      const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

                      return (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, member.id)}
                          onClick={() => setSelectedMember(member)}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 hover:border-brand-500/60 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer shadow-sm transition-all group"
                        >
                          {/* Nome e Badge de Faixa Etária */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-indigo-300 transition-colors">
                              {member.fullName}
                            </h3>
                            {member.ageGroup && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase shrink-0 border border-slate-200 dark:border-transparent">
                                {member.ageGroup}
                              </span>
                            )}
                          </div>

                          {/* Telefone & WhatsApp */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              {member.phone}
                            </span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors"
                                title="Chamar no WhatsApp"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Bairro ou Célula */}
                          {(member.neighborhood || member.smallGroupName) && (
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                              {member.neighborhood && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                  <span className="truncate">{member.neighborhood}</span>
                                </span>
                              )}
                              {member.smallGroupName && (
                                <span className="flex items-center gap-1 truncate">
                                  <Users className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                                  <span className="truncate">{member.smallGroupName}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Líder Designado ou 1ª Visita */}
                          <div className="flex items-center justify-between mt-2 text-[9px] text-slate-400 dark:text-slate-500">
                            <span>
                              {member.assignedLeaderName ? `Líder: ${member.assignedLeaderName}` : 'Sem líder atribuído'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(member.firstVisitDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
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

      {/* Modal de Novo Visitante */}
      <NewMemberModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultStage={newModalDefaultStage}
      />

      {/* Modal de Detalhes do Membro */}
      <MemberCardModal
        member={selectedMember}
        isOpen={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
};
