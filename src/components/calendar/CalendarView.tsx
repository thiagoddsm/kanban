import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { Task, ChurchEvent } from '../../types';
import { TaskModal } from '../kanban/TaskModal';
import { EventDetailsModal } from '../events/EventDetailsModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Layers,
  MapPin,
  Building2,
  Sparkles
} from 'lucide-react';
import { DemandTypeBadge, StatusBadge, PriorityBadge } from '../common/Badge';

export const CalendarView: React.FC = () => {
  const { tasks, events, users, setFilterEventId } = useData();
  const { currentOrganization, currentCampus, campuses } = useTenant();
  const { currentUser } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  // Filters State
  const [showEvents, setShowEvents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [filterQuick, setFilterQuick] = useState<'ALL' | 'MY_ITEMS' | 'OVERDUE' | 'BLOCKED' | 'DONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date normalizer (strips time component e.g. "2026-09-14T19:00:00" -> "2026-09-14")
  const normalizeDateStr = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    return dateStr.split('T')[0].split(' ')[0].trim();
  };

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Prev month days padding (start on Sunday = 0)
    const firstDayIndex = firstDay.getDay();
    for (let i = firstDayIndex; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatLocalDate(d),
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: formatLocalDate(d),
      });
    }

    // Next month days padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: formatLocalDate(d),
      });
    }

    return days;
  }, [year, month]);

  // Filtered Tasks for Calendar
  const displayTasks = useMemo(() => {
    if (!showTasks) return [];
    const myId = currentUser?.id || '';
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((t) => {
      if (t.isArchived || t.isDeleted) return false;

      // Filter by campus
      if (selectedCampusId && t.campusId !== selectedCampusId) return false;

      // Filter by event
      if (selectedEventId && t.eventId !== selectedEventId) return false;

      // Filter by assignee
      if (selectedAssigneeId) {
        const isAssigned =
          (t.assigneeIds && t.assigneeIds.includes(selectedAssigneeId)) ||
          t.assigneeId === selectedAssigneeId;
        if (!isAssigned) return false;
      }

      // Search query
      if (query) {
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchAssignee = t.assigneeName?.toLowerCase().includes(query);
        const matchTags = t.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchAssignee && !matchTags) return false;
      }

      // Quick status/type filter
      if (filterQuick === 'MY_ITEMS') {
        const isMine =
          (t.assigneeIds && t.assigneeIds.includes(myId)) ||
          t.assigneeId === myId ||
          t.requesterId === myId;
        if (!isMine) return false;
      } else if (filterQuick === 'OVERDUE') {
        const deadline = normalizeDateStr(t.deadline);
        if (t.status === 'DONE' || !deadline || deadline >= todayStr) return false;
      } else if (filterQuick === 'BLOCKED') {
        if (t.status !== 'BLOCKED') return false;
      } else if (filterQuick === 'DONE') {
        if (t.status !== 'DONE') return false;
      }

      return true;
    });
  }, [
    tasks,
    showTasks,
    filterQuick,
    searchQuery,
    selectedCampusId,
    selectedEventId,
    selectedAssigneeId,
    currentUser?.id,
    todayStr
  ]);

  // Filtered Events for Calendar
  const displayEvents = useMemo(() => {
    if (!showEvents) return [];
    // Quando o usuário filtra especificamente por problemas em tarefas (Atrasadas/Bloqueadas), ocultamos eventos para manter a visão limpa
    if (filterQuick === 'OVERDUE' || filterQuick === 'BLOCKED') return [];

    const myId = currentUser?.id || '';
    const query = searchQuery.trim().toLowerCase();

    return events.filter((e) => {
      if (e.isArchived) return false;

      // Filter by campus
      if (selectedCampusId && e.campusId && e.campusId !== selectedCampusId) return false;

      // Filter by event
      if (selectedEventId && e.id !== selectedEventId) return false;

      // Filter by assignee / leader
      if (selectedAssigneeId) {
        const isLeaderOrTeam =
          e.leaderId === selectedAssigneeId ||
          (e.teamIds && e.teamIds.includes(selectedAssigneeId));
        if (!isLeaderOrTeam) return false;
      }

      // Search query
      if (query) {
        const matchTitle = e.title.toLowerCase().includes(query);
        const matchDesc = e.description?.toLowerCase().includes(query);
        const matchLocation = e.location?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchLocation) return false;
      }

      // Quick filter
      if (filterQuick === 'MY_ITEMS') {
        const isMine =
          e.leaderId === myId ||
          (e.teamIds && e.teamIds.includes(myId));
        if (!isMine) return false;
      } else if (filterQuick === 'DONE') {
        if (e.status !== 'FINISHED') return false;
      }

      return true;
    });
  }, [
    events,
    showEvents,
    filterQuick,
    searchQuery,
    selectedCampusId,
    selectedEventId,
    selectedAssigneeId,
    currentUser?.id
  ]);

  const activeFiltersCount = [
    filterQuick !== 'ALL',
    !showEvents,
    !showTasks,
    selectedCampusId,
    selectedEventId,
    selectedAssigneeId,
    searchQuery.trim(),
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterQuick('ALL');
    setShowEvents(true);
    setShowTasks(true);
    setSelectedCampusId('');
    setSelectedEventId('');
    setSelectedAssigneeId('');
    setSearchQuery('');
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6 overflow-hidden space-y-3">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Calendário de Atividades & Cultos
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os campus'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({displayTasks.length + displayEvents.length} atividades no filtro)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visão mensal sincronizada de prazos das demandas operacionais e datas de cultos e eventos.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition-colors shadow-sm dark:shadow-none"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition-colors shadow-sm dark:shadow-none"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-white ml-2 min-w-[140px]">
            {monthNames[month]} {year}
          </span>
        </div>
      </div>

      {/* Complete Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-sm shrink-0">
        {/* Row 1: Search & Dropdown Selectors */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, responsável, tags..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Event / Project Filter */}
          <div className="w-44 sm:w-52">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors truncate"
            >
              <option value="">Todos os Projetos</option>
              {events.filter((e) => !e.isArchived).map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="w-40 sm:w-48">
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors truncate"
            >
              <option value="">Todos os Responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter (if multiple campuses exist) */}
          {campuses && campuses.length > 1 && (
            <div className="w-36 sm:w-44">
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors truncate"
              >
                <option value="">Todos os Campi</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear All Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1 shrink-0"
              title="Limpar todos os filtros"
            >
              <span>✕ Limpar Filtros ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Row 2: Filter Pills & Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {/* Quick Filter: ALL */}
          <button
            onClick={() => setFilterQuick('ALL')}
            className={`px-3 py-1 rounded-xl font-bold transition-all ${
              filterQuick === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-indigo-600 dark:text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todas
          </button>

          {/* Quick Filter: Minhas Tarefas / Demandas */}
          <button
            onClick={() => setFilterQuick(filterQuick === 'MY_ITEMS' ? 'ALL' : 'MY_ITEMS')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all ${
              filterQuick === 'MY_ITEMS'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            👤 Minhas Atividades
          </button>

          {/* Quick Filter: Atrasadas */}
          <button
            onClick={() => setFilterQuick(filterQuick === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all ${
              filterQuick === 'OVERDUE'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ⚠️ Atrasadas
          </button>

          {/* Quick Filter: Bloqueadas */}
          <button
            onClick={() => setFilterQuick(filterQuick === 'BLOCKED' ? 'ALL' : 'BLOCKED')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all ${
              filterQuick === 'BLOCKED'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🛡️ Bloqueadas
          </button>

          {/* Quick Filter: Concluídas */}
          <button
            onClick={() => setFilterQuick(filterQuick === 'DONE' ? 'ALL' : 'DONE')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all ${
              filterQuick === 'DONE'
                ? 'bg-teal-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ✅ Concluídas
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Toggle: Eventos / Cultos */}
          <button
            onClick={() => setShowEvents(!showEvents)}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              showEvents
                ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-600/30 dark:text-purple-300 dark:border-purple-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through opacity-60'
            }`}
            title={showEvents ? 'Ocultar eventos e cultos' : 'Mostrar eventos e cultos'}
          >
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Eventos & Cultos ({events.filter((e) => !e.isArchived).length})</span>
          </button>

          {/* Toggle: Tarefas */}
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              showTasks
                ? 'bg-brand-50 text-brand-700 border border-brand-200 dark:bg-indigo-600/30 dark:text-indigo-300 dark:border-indigo-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through opacity-60'
            }`}
            title={showTasks ? 'Ocultar tarefas' : 'Mostrar tarefas'}
          >
            <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Demandas & Tarefas ({tasks.filter((t) => !t.isArchived && !t.isDeleted).length})</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
          <div className="flex-1 flex flex-col min-w-[560px] sm:min-w-0">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider py-2.5">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Month Day Cells */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800/60 overflow-y-auto custom-scrollbar">
          {calendarDays.map((day, idx) => {
            const isToday = day.dateStr === todayStr;

            // Events on this day
            const dayEvents = displayEvents.filter((e) => {
              const start = normalizeDateStr(e.startDate);
              const end = normalizeDateStr(e.endDate) || start;
              return start && day.dateStr >= start && day.dateStr <= end;
            });
            // Tasks deadline on this day
            const dayTasks = displayTasks.filter((t) => {
              const deadline = normalizeDateStr(t.deadline);
              return deadline === day.dateStr;
            });

            return (
              <div
                key={idx}
                className={`p-2 flex flex-col justify-between min-h-[95px] transition-colors ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850/60'
                    : 'bg-slate-50/50 dark:bg-slate-950/40 opacity-40'
                }`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-brand-600 text-white shadow-md font-black'
                        : day.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {(dayEvents.length > 0 || dayTasks.length > 0) && (
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-1 rounded">
                      {dayEvents.length + dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Items in Cell */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-20 custom-scrollbar pr-0.5">
                  {/* Event Blocks */}
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt);
                        setIsEventDetailsOpen(true);
                      }}
                      className="px-1.5 py-0.5 rounded-lg bg-purple-50 dark:bg-gradient-to-r dark:from-purple-900/80 dark:to-indigo-900/80 border border-purple-200 dark:border-purple-500/40 text-purple-800 dark:text-purple-200 text-[10px] font-bold truncate cursor-pointer hover:brightness-95 dark:hover:brightness-125 transition-all flex items-center gap-1 shadow-sm dark:shadow-none"
                      title={evt.title}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate">{evt.title}</span>
                    </div>
                  ))}

                  {/* Task Pills */}
                  {dayTasks.map((t) => {
                    const deadlineStr = normalizeDateStr(t.deadline);
                    const isOverdue = t.status !== 'DONE' && !!deadlineStr && deadlineStr < todayStr;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium truncate cursor-pointer transition-all border flex items-center justify-between gap-1 shadow-sm dark:shadow-none ${
                          t.status === 'DONE'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-300'
                            : t.status === 'BLOCKED'
                            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-500/30 dark:text-rose-300'
                            : isOverdue
                            ? 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-500 dark:text-rose-200 animate-pulse'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-brand-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500'
                        }`}
                        title={t.title}
                      >
                        <span className="truncate">{t.title}</span>
                        {t.status === 'BLOCKED' && <ShieldAlert className="w-2.5 h-2.5 text-rose-500 dark:text-rose-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isTaskModalOpen && selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          isOpen={true}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
        />
      )}

      <EventDetailsModal
        event={selectedEvent}
        isOpen={isEventDetailsOpen}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onNavigateToKanban={(eventId) => {
          setFilterEventId(eventId);
        }}
      />
    </div>
  );
};
