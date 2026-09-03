import React, { useState, useRef, useEffect } from 'react';
import { 
  Filter, 
  Search, 
  X, 
  RotateCcw, 
  User as UserIcon, 
  Calendar, 
  Tag, 
  Layers, 
  Flame, 
  HelpCircle,
  Check,
  Plus,
  SlidersHorizontal
} from 'lucide-react';
import { ChurchEvent, User, DemandTypeDefinition } from '../../types';

interface KanbanFilterPopoverProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterOnlyMyTasks: boolean;
  setFilterOnlyMyTasks: (val: boolean) => void;
  filterEventId: string;
  setFilterEventId: (id: string) => void;
  filterAssigneeId: string;
  setFilterAssigneeId: (id: string) => void;
  filterPriority: string;
  setFilterPriority: (p: string) => void;
  filterDemandType: string;
  setFilterDemandType: (dt: string) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  clearFilters: () => void;
  events: ChurchEvent[];
  users: User[];
  demandTypes: DemandTypeDefinition[];
  allTags: string[];
  totalTasksCount: number;
  filteredTasksCount: number;
}

export const KanbanFilterPopover: React.FC<KanbanFilterPopoverProps> = ({
  searchQuery,
  setSearchQuery,
  filterOnlyMyTasks,
  setFilterOnlyMyTasks,
  filterEventId,
  setFilterEventId,
  filterAssigneeId,
  setFilterAssigneeId,
  filterPriority,
  setFilterPriority,
  filterDemandType,
  setFilterDemandType,
  filterTag,
  setFilterTag,
  clearFilters,
  events,
  users,
  demandTypes,
  allTags,
  totalTasksCount,
  filteredTasksCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeFiltersCount = [
    filterOnlyMyTasks,
    filterEventId,
    filterAssigneeId,
    filterPriority,
    filterDemandType,
    filterTag,
    searchQuery.trim(),
  ].filter(Boolean).length;

  const selectedEvent = events.find((e) => e.id === filterEventId);
  const selectedAssignee = users.find((u) => u.id === filterAssigneeId);
  const selectedDemandType = demandTypes.find((dt) => dt.type === filterDemandType);

  return (
    <div className="relative flex items-center gap-2" ref={popoverRef}>
      {/* Search Input Box (Pipefy style pill) */}
      <div className="relative w-48 sm:w-64 transition-all">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Procurar cards..."
          className="w-full pl-8 pr-7 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            title="Limpar busca"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter Popover Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
          activeFiltersCount > 0
            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm shadow-indigo-500/20'
            : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:border-slate-600 hover:text-white'
        }`}
        title="Filtrar cards por condições"
      >
        <Filter className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-indigo-400' : 'text-slate-400'}`} />
        <span className="hidden sm:inline">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Pipefy-Style Filter Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-slide-down space-y-4 font-sans">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Filtrar cards usando estas condições
              </h3>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showHelpTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 rounded-lg bg-slate-950 text-[11px] text-slate-300 border border-slate-800 shadow-xl z-50 pointer-events-none">
                    Selecione condições rápidas ou detalhadas para filtrar cards no quadro.
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Conditions (Chips 1-Click - Pipefy Style) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Condições Rápidas
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterOnlyMyTasks(!filterOnlyMyTasks)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  filterOnlyMyTasks
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <UserIcon className="w-3 h-3 text-indigo-400" />
                <span>Atribuído a mim</span>
                {filterOnlyMyTasks && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                onClick={() => setFilterPriority(filterPriority === 'URGENT' ? '' : 'URGENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  filterPriority === 'URGENT'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-rose-300'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Urgentes</span>
                {filterPriority === 'URGENT' && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                onClick={() => setFilterDemandType(filterDemandType === 'ARTE' ? '' : 'ARTE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  filterDemandType === 'ARTE'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-purple-300'
                }`}
              >
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Artes / Visual</span>
                {filterDemandType === 'ARTE' && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                onClick={() => setFilterDemandType(filterDemandType === 'VIDEO' ? '' : 'VIDEO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  filterDemandType === 'VIDEO'
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-cyan-300'
                }`}
              >
                <span>Vídeos / Telão</span>
                {filterDemandType === 'VIDEO' && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Detailed Condition Dropdowns */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Refinar por Campos
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Event / Project */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>Evento / Projeto</span>
                </label>
                <select
                  value={filterEventId}
                  onChange={(e) => setFilterEventId(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                    filterEventId ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 font-bold' : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <option value="">Todos os eventos</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-cyan-400" />
                  <span>Responsável</span>
                </label>
                <select
                  value={filterAssigneeId}
                  onChange={(e) => setFilterAssigneeId(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                    filterAssigneeId ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 font-bold' : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <option value="">Todos os membros</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Demand Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>Tipo de Demanda</span>
                </label>
                <select
                  value={filterDemandType}
                  onChange={(e) => setFilterDemandType(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                    filterDemandType ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 font-bold' : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <option value="">Todos os tipos</option>
                  {demandTypes.map((dt) => (
                    <option key={dt.type} value={dt.type}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Prioridade</span>
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                    filterPriority ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 font-bold' : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <option value="">Todas as prioridades</option>
                  <option value="URGENT">🔴 Urgente</option>
                  <option value="HIGH">🟠 Alta</option>
                  <option value="MEDIUM">🔵 Média</option>
                  <option value="LOW">⚪ Baixa</option>
                </select>
              </div>

              {/* Tag */}
              {allTags && allTags.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>Tag / Marcador</span>
                  </label>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs text-white focus:outline-none transition-all ${
                      filterTag ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold' : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <option value="">Todas as tags</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Popover Footer (Pipefy Style: Stats & Actions) */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400">
              Exibindo <strong className="text-white">{filteredTasksCount}</strong> de <strong className="text-white">{totalTasksCount}</strong> cards
            </span>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold transition-colors"
                >
                  Excluir tudo
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
