import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { ChurchEvent, EventCategory, EventStatus } from '../../types';
import { TeamMemberSelector } from '../common/TeamMemberSelector';
import { X, Calendar, MapPin, Users, Trash2, Sparkles, Building2 } from 'lucide-react';

interface EventModalProps {
  event: ChurchEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, isOpen, onClose }) => {
  const { users, createEvent, updateEvent, archiveEvent } = useData();
  const { currentUser } = useAuth();
  const { campuses, currentCampus } = useTenant();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('CULTO');
  const [status, setStatus] = useState<EventStatus>('PLANNING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [campusId, setCampusId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [bannerColor, setBannerColor] = useState('from-indigo-600 to-purple-600');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setCategory(event.category);
      setStatus(event.status);
      setStartDate(event.startDate);
      setEndDate(event.endDate);
      setLocation(event.location || '');
      setCampusId(event.campusId || '');
      setLeaderId(event.leaderId);
      setTeamIds(event.teamIds || []);
      setBannerColor(event.bannerColor || 'from-indigo-600 to-purple-600');
    } else {
      setTitle('');
      setDescription('');
      setCategory('CULTO');
      setStatus('PLANNING');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setLocation('');
      setCampusId(currentCampus?.id || '');
      setLeaderId(currentUser.id);
      setTeamIds([]);
      setBannerColor('from-indigo-600 to-purple-600');
    }
  }, [event, isOpen, currentUser.id, currentCampus?.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (event) {
      updateEvent({
        ...event,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        startDate,
        endDate,
        location: location.trim() || undefined,
        campusId: campusId || undefined,
        leaderId: leaderId || currentUser.id,
        teamIds,
        bannerColor,
      });
    } else {
      createEvent({
        organizationId: '',
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        startDate,
        endDate,
        location: location.trim() || undefined,
        campusId: campusId || undefined,
        leaderId: leaderId || currentUser.id,
        leaderName: '',
        teamIds,
        bannerColor,
      });
    }

    onClose();
  };

  const handleToggleTeamMember = (userId: string) => {
    if (teamIds.includes(userId)) {
      setTeamIds(teamIds.filter((id) => id !== userId));
    } else {
      setTeamIds([...teamIds, userId]);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Projeto de Evento</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            {event ? 'Editar Projeto de Evento' : 'Novo Projeto de Evento'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre um culto especial, conferência, série ou campanha integrada.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome do Evento / Campanha *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conferência Aviva 2026"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descrição & Objetivo Geral
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito da campanha e orientações..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category, Status & Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="CULTO">Culto Especial</option>
                <option value="CONFERENCIA">Conferência</option>
                <option value="CAMPANHA">Campanha</option>
                <option value="SERIE">Série de Mensagens</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="PLANNING">Planejamento</option>
                <option value="IN_PROGRESS">Em Execução</option>
                <option value="FINISHED">Finalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Campus
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="">Geral (Todos)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data de Início
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data de Término
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Localização
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Templo Principal..."
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          {/* Leader */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Líder Responsável pelo Evento
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Team Members Selector */}
          <TeamMemberSelector
            users={users}
            selectedUserIds={teamIds}
            onChange={setTeamIds}
            label="Equipe Designada para o Evento"
            maxHeight="max-h-48"
          />

          {/* Submit and Archive Actions */}
          <div className="pt-3 flex items-center justify-between">
            {event && (
              <button
                type="button"
                onClick={() => {
                  archiveEvent(event.id, true);
                  onClose();
                }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Arquivar Projeto
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
              >
                {event ? 'Salvar Projeto' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
