import React from 'react';
import { TaskPriority, TaskStatus, EventStatus, EventCategory, DemandType } from '../../types';
import { 
  Palette, 
  Video, 
  Share2, 
  Camera, 
  Printer, 
  FileText, 
  Tv, 
  Globe, 
  Megaphone, 
  Calendar,
  Package,
  Sparkles
} from 'lucide-react';

export const PriorityBadge: React.FC<{ priority: TaskPriority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Urgente
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Alta
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Média
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-500/20 text-slate-400 border border-slate-500/30 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Baixa
        </span>
      );
  }
};

export const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  switch (status) {
    case 'INBOX':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700">
          Inbox
        </span>
      );
    case 'PLANNING':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/60">
          Planejamento
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60">
          Em Andamento
        </span>
      );
    case 'BLOCKED':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-rose-950/60 text-rose-300 border border-rose-800/60">
          Bloqueado
        </span>
      );
    case 'REVIEW':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/60">
          Revisão
        </span>
      );
    case 'DONE':
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
          Concluído
        </span>
      );
  }
};

export const DemandTypeBadge: React.FC<{ type: string; label?: string; size?: 'sm' | 'md' }> = ({
  type,
  label,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  const map: Record<string, { label: string; icon: any; color: string }> = {
    ARTE: { label: 'Arte', icon: Palette, color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30' },
    VIDEO: { label: 'Vídeo', icon: Video, color: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
    SOCIAL_MEDIA: { label: 'Social Media', icon: Share2, color: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
    FOTOGRAFIA: { label: 'Foto', icon: Camera, color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
    IMPRESSAO: { label: 'Impressão', icon: Printer, color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    TEXTO: { label: 'Texto', icon: FileText, color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    APRESENTACAO: { label: 'Telão/LED', icon: Tv, color: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
    SITE: { label: 'Site', icon: Globe, color: 'text-teal-300 bg-teal-500/10 border-teal-500/30' },
    COMUNICACAO_INTERNA: { label: 'Com. Interna', icon: Megaphone, color: 'text-orange-300 bg-orange-500/10 border-orange-500/30' },
    EVENTO: { label: 'Evento', icon: Calendar, color: 'text-pink-300 bg-pink-500/10 border-pink-500/30' },
    OUTRO: { label: 'Outro', icon: Package, color: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
  };

  const item = map[type] || {
    label: label || type.replace(/^CUSTOM_/, '').replace(/_/g, ' '),
    icon: Sparkles,
    color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
  };
  const IconComponent = item.icon;

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-md border ${item.color} ${sizeClasses}`}>
      <IconComponent className="w-3 h-3" />
      <span>{label || item.label}</span>
    </span>
  );
};

export const EventStatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  switch (status) {
    case 'PLANNING':
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Planejamento
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Em Execução
        </span>
      );
    case 'FINISHED':
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Finalizado
        </span>
      );
  }
};

export const EventCategoryBadge: React.FC<{ category: EventCategory }> = ({ category }) => {
  const map: Record<EventCategory, { label: string; color: string }> = {
    CULTO: { label: 'Culto', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    CONFERENCIA: { label: 'Conferência', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    CAMPANHA: { label: 'Campanha', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    SERIE: { label: 'Série', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    WORKSHOP: {
      label: 'Workshop',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    RETIRO: {
      label: 'Retiro / Acampamento',
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
    OUTRO: {
      label: 'Outro',
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    },
  };

  const item = map[category] || map.OUTRO;

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${item.color}`}>
      {item.label}
    </span>
  );
};
