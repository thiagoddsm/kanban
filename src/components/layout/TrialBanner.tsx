import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Sparkles, Clock, ArrowRight, X, ShieldCheck } from 'lucide-react';

export const TrialBanner: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!currentOrganization?.subscription) return null;
  if (isDismissed) return null;

  const { subscription } = currentOrganization;
  const isTrial = subscription.isTrial || subscription.status === 'TRIALING';
  const trialEndsAt = subscription.trialEndsAt || subscription.currentPeriodEnd;

  if (!isTrial || !trialEndsAt) return null;

  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const handleActivateClick = () => {
    const text = encodeURIComponent(
      `Olá! Estou testando o Oiko Gestão na organização "${currentOrganization.name}" e gostaria de ativar a assinatura no plano ${subscription.plan}.`
    );
    window.open(`https://wa.me/5521989001302?text=${text}`, '_blank');
  };

  return (
    <aside aria-label="Aviso de Período de Testes" className="bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-slate-900 border-b border-indigo-500/30 px-3 sm:px-4 py-2 text-white shadow-md relative z-40 transition-all animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap truncate">
            <span className="font-black text-indigo-300 uppercase tracking-wider text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
              Período de Testes
            </span>
            <span className="text-slate-200">
              Você tem{' '}
              <strong className="text-emerald-400 font-bold">
                {daysLeft === 0 ? 'menos de 24 horas' : `${daysLeft} dia${daysLeft > 1 ? 's' : ''}`}
              </strong>{' '}
              restantes no plano <span className="font-bold text-white">{subscription.plan}</span>.
            </span>
            <span className="hidden md:inline text-slate-400">Todos os recursos liberados.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleActivateClick}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[11px] shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <span>Ativar Assinatura</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/60 transition-colors"
            title="Ocultar aviso nesta sessão"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
