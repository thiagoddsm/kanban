import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { NotificationService } from '../../services/notificationService';
import { Notification, Task } from '../../types';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Settings, 
  AlertCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApprovals?: () => void;
  onOpenTask?: (task: Task) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenApprovals,
  onOpenTask,
}) => {
  if (!isOpen) return null;

  const { currentUser } = useAuth();
  const { currentOrganization } = useTenant();
  const { tasks } = useData();

  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    NotificationService.getNotifications(currentOrganization.id, currentUser.id)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(NotificationService.getNotifications(currentOrganization.id, currentUser.id));
    };
    handleUpdate();
    window.addEventListener('marketing_notifications_updated', handleUpdate);
    return () => window.removeEventListener('marketing_notifications_updated', handleUpdate);
  }, [currentOrganization.id, currentUser.id]);

  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => NotificationService.getPreferences(currentUser.id));

  const handleMarkAsRead = (id: string) => {
    NotificationService.markAsRead(currentOrganization.id, id);
    setNotifications(NotificationService.getNotifications(currentOrganization.id, currentUser.id));
  };

  const handleMarkAllAsRead = () => {
    NotificationService.markAllAsRead(currentOrganization.id, currentUser.id);
    setNotifications(NotificationService.getNotifications(currentOrganization.id, currentUser.id));
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    NotificationService.savePreferences(currentUser.id, prefs);
    setIsPrefsOpen(false);
  };

  const handleActionClick = (notif: Notification) => {
    handleMarkAsRead(notif.id);
    onClose();

    if (notif.type === 'TASK_REVIEW' && onOpenApprovals) {
      onOpenApprovals();
    } else if (notif.entityType === 'TASK' && notif.entityId && onOpenTask) {
      const t = tasks.find((item) => item.id === notif.entityId);
      if (t) onOpenTask(t);
    }
  };

  // Group by Today, Yesterday, Older
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const filtered = filterUnreadOnly ? notifications.filter((n) => !n.readAt) : notifications;

    const groups: { label: string; items: Notification[] }[] = [
      { label: 'Hoje', items: [] },
      { label: 'Ontem', items: [] },
      { label: 'Anteriores', items: [] },
    ];

    filtered.forEach((n) => {
      const d = n.createdAt.split('T')[0];
      if (d === todayStr) {
        groups[0].items.push(n);
      } else if (d === yesterdayStr) {
        groups[1].items.push(n);
      } else {
        groups[2].items.push(n);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [notifications, filterUnreadOnly]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MENTION':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'TASK_REVIEW':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'TASK_OVERDUE':
      case 'TASK_BLOCKED':
      case 'DEPENDENCY_BLOCKED':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'TASK_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'EVENT_APPROACHING':
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {unreadCount} novas
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">{currentOrganization.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPrefsOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Configurações de Notificações"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterUnreadOnly(false)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                !filterUnreadOnly ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilterUnreadOnly(true)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterUnreadOnly ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas como lidas</span>
            </button>
          )}
        </div>

        {/* Body Notification list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {groupedNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-slate-400">Nenhuma notificação encontrada.</p>
            </div>
          ) : (
            groupedNotifications.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                  {group.label}
                </span>

                <div className="space-y-2">
                  {group.items.map((n) => {
                    const isUnread = !n.readAt;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleActionClick(n)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isUnread
                            ? 'bg-slate-900 border-indigo-500/40 shadow-md hover:border-indigo-500'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
                            <div className="min-w-0">
                              <h4 className={`text-xs font-bold leading-tight ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                                {n.title}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                          </div>

                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                          <span className="text-slate-500">
                            {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-1 font-bold text-indigo-400 hover:underline">
                            <span>
                              {n.type === 'TASK_REVIEW'
                                ? 'Revisar Entrega'
                                : n.type === 'DEPENDENCY_BLOCKED'
                                ? 'Ver Bloqueador'
                                : 'Abrir Detalhes'}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      {isPrefsOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Preferências de Notificação
              </h3>
              <button onClick={() => setIsPrefsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-3 text-xs">
              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1">Canais</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.inApp}
                    onChange={(e) => setPrefs({ ...prefs, inApp: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>No Sistema (In-App)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.email}
                    onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Por E-mail</span>
                </label>
              </div>

              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1">Tipos de Alerta</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.taskAssigned}
                    onChange={(e) => setPrefs({ ...prefs, taskAssigned: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Demandas Atribuídas a Mim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.taskOverdue}
                    onChange={(e) => setPrefs({ ...prefs, taskOverdue: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Alertas de Tarefas Atrasadas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.approvalRequested}
                    onChange={(e) => setPrefs({ ...prefs, approvalRequested: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Solicitações de Aprovação</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={prefs.dailyDigest}
                    onChange={(e) => setPrefs({ ...prefs, dailyDigest: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Resumo Diário Executivo (Digest)</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrefsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
