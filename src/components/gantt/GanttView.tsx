import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { Task, ChurchEvent } from '../../types';
import { TaskModal } from '../kanban/TaskModal';
import { EventDetailsModal } from '../events/EventDetailsModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  ZoomIn, 
  ZoomOut,
  MapPin,
  Building2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PriorityBadge, DemandTypeBadge, StatusBadge } from '../common/Badge';

type ZoomLevel = 'DAY' | 'WEEK' | 'MONTH';

export const GanttView: React.FC = () => {
  const { tasks, events, updateTask, setFilterEventId } = useData();
  const { currentOrganization, currentCampus } = useTenant();

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('DAY');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  // Reference window: calculate min and max dates across all tasks and events
  const { startDate, endDate, totalDays, datesList } = useMemo(() => {
    let minTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let maxTime = Date.now() + 45 * 24 * 60 * 60 * 1000;

    tasks.forEach((t) => {
      if (t.startDate) {
        const start = new Date(t.startDate + 'T00:00:00').getTime();
        if (!isNaN(start) && start < minTime) minTime = start;
      }
      if (t.deadline) {
        const dead = new Date(t.deadline + 'T00:00:00').getTime();
        if (!isNaN(dead) && dead > maxTime) maxTime = dead;
      }
    });

    events.forEach((e) => {
      if (e.startDate) {
        const start = new Date(e.startDate + 'T00:00:00').getTime();
        if (!isNaN(start) && start < minTime) minTime = start;
      }
      if (e.endDate) {
        const end = new Date(e.endDate + 'T00:00:00').getTime();
        if (!isNaN(end) && end > maxTime) maxTime = end;
      }
    });

    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);
    const end = new Date(maxTime);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dates: Date[] = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: diffDays,
      datesList: dates,
    };
  }, [tasks, events]);

  const cellWidth = zoomLevel === 'DAY' ? 44 : zoomLevel === 'WEEK' ? 22 : 12;
  const todayStr = new Date().toISOString().split('T')[0];

  // Group tasks by event
  const groupedProjects = useMemo(() => {
    const activeEvents = events.filter((e) => !e.isArchived);
    const groups: { event: ChurchEvent | null; projectTasks: Task[] }[] = [];

    activeEvents.forEach((evt) => {
      const evtTasks = tasks.filter((t) => t.eventId === evt.id && !t.isArchived);
      groups.push({
        event: evt,
        projectTasks: evtTasks,
      });
    });

    // Unassigned / Institutional tasks without event
    const noEventTasks = tasks.filter((t) => !t.eventId && !t.isArchived);
    if (noEventTasks.length > 0) {
      groups.push({
        event: null,
        projectTasks: noEventTasks,
      });
    }

    return groups;
  }, [events, tasks]);

  // Position calculation helpers
  const getPositionOffset = (dateStr: string): number => {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff * cellWidth);
  };

  const getBarWidth = (startStr: string, endStr: string): number => {
    const s = new Date(startStr + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    const diff = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return diff * cellWidth;
  };

  const todayOffset = getPositionOffset(todayStr);

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'from-emerald-600 to-emerald-700 border-emerald-500/50 text-white';
      case 'IN_PROGRESS':
        return 'from-amber-600 to-amber-700 border-amber-500/50 text-white';
      case 'BLOCKED':
        return 'from-rose-600 to-rose-700 border-rose-500/50 text-white';
      case 'REVIEW':
        return 'from-purple-600 to-purple-700 border-purple-500/50 text-white';
      default:
        return 'from-blue-600 to-blue-700 border-blue-500/50 text-white';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 p-4 sm:p-6 overflow-hidden space-y-4">
      {/* Top Header & Zoom Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cronograma Visual (Gantt)
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name} {currentCampus ? `• ${currentCampus.name}` : '• Todos os Campi'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Visão temporal hierárquica por projeto e dependências com sincronização em tempo real.
          </p>
        </div>

        {/* Zoom Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setZoomLevel('DAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              zoomLevel === 'DAY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setZoomLevel('WEEK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              zoomLevel === 'WEEK' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setZoomLevel('MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              zoomLevel === 'MONTH' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Gantt Interactive Container */}
      <div className="flex-1 overflow-hidden bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col">
        {/* Horizontal Scroll Area */}
        <div className="flex-1 overflow-auto custom-scrollbar relative flex">
          {/* Left Column: Fixed Project/Task Labels */}
          <div className="w-72 sm:w-80 shrink-0 bg-slate-950/80 border-r border-slate-800 sticky left-0 z-30 flex flex-col">
            {/* Header */}
            <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950">
              <span>Projetos & Demandas</span>
              <span>Status</span>
            </div>

            {/* Rows Labels */}
            <div className="flex-1 divide-y divide-slate-800/60">
              {groupedProjects.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-0">
                  {/* Event Group Header */}
                  <div
                    onClick={() => {
                      if (grp.event) {
                        setSelectedEvent(grp.event);
                        setIsEventDetailsOpen(true);
                      }
                    }}
                    className={`h-11 px-4 flex items-center justify-between gap-2 text-xs font-bold ${
                      grp.event
                        ? 'bg-purple-950/40 hover:bg-purple-950/60 text-purple-300 cursor-pointer'
                        : 'bg-slate-900/80 text-slate-400'
                    } border-b border-slate-800/80`}
                  >
                    <span className="truncate">{grp.event ? grp.event.title : 'Demandas sem Projeto'}</span>
                    {grp.event && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        {grp.projectTasks.length} tarefas
                      </span>
                    )}
                  </div>

                  {/* Tasks in this group */}
                  {grp.projectTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      className="h-11 px-4 pl-7 flex items-center justify-between gap-2 hover:bg-slate-850/60 cursor-pointer text-xs border-b border-slate-850"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DemandTypeBadge type={t.demandType} size="sm" />
                        <span className="text-white font-medium truncate">{t.title}</span>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Right Timeline Grid */}
          <div className="flex-1 flex flex-col relative" style={{ width: `${totalDays * cellWidth}px` }}>
            {/* Timeline Header (Days / Dates) */}
            <div className="h-12 border-b border-slate-800 flex sticky top-0 z-20 bg-slate-950">
              {datesList.map((date, idx) => {
                const dateStr = date.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={idx}
                    className={`shrink-0 flex flex-col items-center justify-center text-[10px] border-r border-slate-800/80 ${
                      isToday
                        ? 'bg-indigo-600/20 text-indigo-300 font-black'
                        : isWeekend
                        ? 'bg-slate-900/40 text-slate-500'
                        : 'text-slate-400'
                    }`}
                    style={{ width: `${cellWidth}px` }}
                  >
                    <span className="font-semibold">{date.toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span>
                    <span className="font-bold">{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Vertical Marker for TODAY */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(99,102,241,0.8)]"
              style={{ left: `${todayOffset + cellWidth / 2}px` }}
            >
              <div className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full absolute -top-1 -left-4 shadow">
                Hoje
              </div>
            </div>

            {/* Gantt Timeline Bars */}
            <div className="flex-1 divide-y divide-slate-800/60">
              {groupedProjects.map((grp, gIdx) => (
                <div key={gIdx}>
                  {/* Event Project Bar */}
                  <div className="h-11 relative flex items-center border-b border-slate-800/80 bg-purple-950/20">
                    {grp.event && (
                      <div
                        onClick={() => {
                          setSelectedEvent(grp.event);
                          setIsEventDetailsOpen(true);
                        }}
                        className="absolute h-7 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400/40 text-white text-xs font-bold flex items-center px-3 shadow-md cursor-pointer truncate hover:brightness-110 transition-all"
                        style={{
                          left: `${getPositionOffset(grp.event.startDate)}px`,
                          width: `${Math.max(cellWidth * 2, getBarWidth(grp.event.startDate, grp.event.endDate))}px`,
                        }}
                      >
                        <span className="truncate">{grp.event.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Bars */}
                  {grp.projectTasks.map((t) => {
                    const barLeft = getPositionOffset(t.startDate);
                    const barWidth = Math.max(cellWidth, getBarWidth(t.startDate, t.deadline));
                    const isOverdue = t.status !== 'DONE' && t.deadline < todayStr;

                    return (
                      <div key={t.id} className="h-11 relative flex items-center border-b border-slate-850">
                        <div
                          onClick={() => {
                            setSelectedTask(t);
                            setIsTaskModalOpen(true);
                          }}
                          className={`absolute h-7 rounded-xl bg-gradient-to-r ${getTaskStatusColor(
                            t.status
                          )} border text-xs font-semibold flex items-center justify-between px-2.5 shadow-md cursor-pointer hover:scale-[1.01] transition-transform ${
                            isOverdue ? 'ring-2 ring-rose-500 animate-pulse' : ''
                          }`}
                          style={{
                            left: `${barLeft}px`,
                            width: `${barWidth}px`,
                          }}
                        >
                          <span className="truncate text-[11px]">{t.title}</span>
                          {t.assigneeName && (
                            <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded shrink-0 ml-1">
                              {t.assigneeName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
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
