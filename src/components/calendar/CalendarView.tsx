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
  const { tasks, events, setFilterEventId } = useData();
  const { currentOrganization, currentCampus } = useTenant();
  const { currentUser } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  // Filters
  const [showEvents, setShowEvents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

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
        dateStr: d.toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: d.toISOString().split('T')[0],
      });
    }

    // Next month days padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: d.toISOString().split('T')[0],
      });
    }

    return days;
  }, [year, month]);

  // Filtered Tasks for Calendar
  const displayTasks = useMemo(() => {
    if (!showTasks) return [];
    return tasks.filter((t) => {
      if (t.isArchived) return false;
      if (filterMyTasks && t.assigneeId !== currentUser?.id && t.requesterId !== currentUser?.id) return false;
      if (filterOverdueOnly && (t.status === 'DONE' || t.deadline >= todayStr)) return false;
      if (filterBlockedOnly && t.status !== 'BLOCKED') return false;
      return true;
    });
  }, [tasks, showTasks, filterMyTasks, filterOverdueOnly, filterBlockedOnly, currentUser?.id, todayStr]);

  const displayEvents = useMemo(() => {
    if (!showEvents) return [];
    return events.filter((e) => !e.isArchived);
  }, [events, showEvents]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-4 sm:p-6 overflow-hidden space-y-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Calendário de Entregas & Cultos
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os Campi'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Visão mensal sincronizada de prazos das demandas e datas dos eventos da igreja.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-white ml-2 min-w-[140px]">
            {monthNames[month]} {year}
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            showEvents ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Projetos / Eventos ({displayEvents.length})
        </button>
        <button
          onClick={() => setShowTasks(!showTasks)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            showTasks ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Tarefas ({displayTasks.length})
        </button>
        <button
          onClick={() => setFilterMyTasks(!filterMyTasks)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterMyTasks ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Minhas Tarefas
        </button>
        <button
          onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterOverdueOnly ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Atrasadas
        </button>
        <button
          onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filterBlockedOnly ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Bloqueadas
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2.5">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Month Day Cells */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 overflow-y-auto custom-scrollbar">
          {calendarDays.map((day, idx) => {
            const isToday = day.dateStr === todayStr;

            // Events on this day
            const dayEvents = displayEvents.filter((e) => day.dateStr >= e.startDate && day.dateStr <= e.endDate);
            // Tasks deadline on this day
            const dayTasks = displayTasks.filter((t) => t.deadline === day.dateStr);

            return (
              <div
                key={idx}
                className={`p-2 flex flex-col justify-between min-h-[95px] transition-colors ${
                  day.isCurrentMonth ? 'bg-slate-900/40 hover:bg-slate-850/60' : 'bg-slate-950/40 opacity-40'
                }`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-md font-black'
                        : day.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-600'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>

                  {(dayEvents.length > 0 || dayTasks.length > 0) && (
                    <span className="text-[9px] font-semibold text-slate-400 bg-slate-850 px-1 rounded">
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
                      className="px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-500/40 text-purple-200 text-[10px] font-bold truncate cursor-pointer hover:brightness-125 transition-all flex items-center gap-1"
                      title={evt.title}
                    >
                      <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      <span className="truncate">{evt.title}</span>
                    </div>
                  ))}

                  {/* Task Pills */}
                  {dayTasks.map((t) => {
                    const isOverdue = t.status !== 'DONE' && t.deadline < todayStr;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-medium truncate cursor-pointer transition-all border flex items-center justify-between gap-1 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                            : t.status === 'BLOCKED'
                            ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                            : isOverdue
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500'
                        }`}
                        title={t.title}
                      >
                        <span className="truncate">{t.title}</span>
                        {t.status === 'BLOCKED' && <ShieldAlert className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />

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
