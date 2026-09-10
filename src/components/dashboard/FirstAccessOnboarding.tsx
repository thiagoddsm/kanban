import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { useAccess } from '../../context/AccessContext';
import { useNotification } from '../../context/NotificationContext';
import { 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Kanban, 
  Share2, 
  UserPlus, 
  ArrowRight, 
  X,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export const FirstAccessOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const { tasks } = useData();
  const { memberships } = useAccess();
  const { success } = useNotification();

  const storageKey = `oiko_onboarding_dismissed_${currentOrganization?.id}`;
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setIsDismissed(localStorage.getItem(storageKey) === 'true');
  }, [currentOrganization?.id]);

  if (!currentOrganization || isDismissed) return null;

  // Critérios automáticos de conclusão
  const hasMovedOrCreatedTasks = tasks.length > 3 || tasks.some((t) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW');
  const hasInvitedMembers = memberships.filter((m) => m.organizationId === currentOrganization.id).length > 1;

  const [portalCopied, setPortalCopied] = useState(false);

  const steps = [
    {
      id: 'kanban',
      title: 'Explorar o Quadro Kanban',
      desc: 'Arraste um card entre as colunas ou crie uma nova demanda da igreja.',
      completed: hasMovedOrCreatedTasks,
      actionLabel: 'Ver Quadro',
      icon: Kanban,
      action: () => navigate(`/${currentOrganization.slug}/tasks`),
    },
    {
      id: 'portal',
      title: 'Copiar Link do Portal de Demandas',
      desc: 'Compartilhe este link com líderes e pastores para receberem solicitações guiadas.',
      completed: portalCopied,
      actionLabel: portalCopied ? 'Link Copiado!' : 'Copiar Link do Portal',
      icon: Share2,
      action: () => {
        const url = `${window.location.origin}/${currentOrganization.slug}/solicitar`;
        navigator.clipboard.writeText(url);
        setPortalCopied(true);
        setCopiedLink(true);
        success('Link copiado!', 'Envie no WhatsApp dos líderes para eles solicitarem demandas.');
        setTimeout(() => setCopiedLink(false), 3000);
      },
    },
    {
      id: 'team',
      title: 'Convidar sua Equipe e Voluntários',
      desc: 'Adicione coordenadores, designers e operadores com papéis e permissões seguros.',
      completed: hasInvitedMembers,
      actionLabel: 'Convidar Membros',
      icon: UserPlus,
      action: () => navigate(`/${currentOrganization.slug}/users`),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Se todos os passos forem concluídos, pode ocultar automaticamente ou deixar uma mensagem de parabéns
  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="mb-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/25 p-5 sm:p-6 shadow-xl relative overflow-hidden animate-fade-in">
      {/* Background Subtle Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Primeiro Acesso • Guia de Ativação</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Boas-vindas ao Oiko Gestão, {currentOrganization.name}!
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Siga os 3 passos práticos abaixo para colocar a comunicação e as operações da sua igreja em produção.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-300">{completedCount} de {steps.length} concluídos</span>
            <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden mt-1 border border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dispensar este guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid de Passos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                step.completed
                  ? 'bg-slate-900/90 border-emerald-500/30 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    step.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {step.completed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Concluído</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">Passo {idx + 1}</span>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <button
                onClick={step.action}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  step.completed
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                }`}
              >
                <span>{step.actionLabel}</span>
                {copiedLink && step.id === 'portal' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
