import React from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  MessageSquare,
  Eye
} from 'lucide-react';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ isOpen, onClose }) => {
  const { currentOrganization } = useTenant();

  if (!isOpen) return null;

  const currentPlan = currentOrganization?.subscription?.plan || 'PRO';

  const handleActivatePlan = (planName: string) => {
    const text = encodeURIComponent(
      `Olá! Meu período de teste de 14 dias do Oiko Gestão terminou na organização "${currentOrganization.name}". Gostaria de ativar a assinatura oficial no plano ${planName}.`
    );
    window.open(`https://wa.me/5521989001302?text=${text}`, '_blank');
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (Read-only mode continue) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Continuar em modo leitura"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-inner">
            <Lock className="w-3.5 h-3.5" />
            <span>Período de Testes de 14 Dias Concluído</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ative seu plano e continue organizando sua igreja
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Esperamos que esses 14 dias tenham transformado a comunicação e organização do seu ministério!
          </p>
        </div>

        {/* Reassurance Banner (Safety Guarantee) */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm space-y-0.5">
            <p className="font-bold text-emerald-300">
              Seus dados continuam 100% salvos e preservados
            </p>
            <p className="text-slate-300 text-xs leading-relaxed">
              Todas as tarefas, eventos, histórico e voluntários cadastrados continuam seguros. Você pode continuar visualizando tudo em <strong>Modo Leitura</strong>.
            </p>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card Starter */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            currentPlan === 'STARTER'
              ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/40'
              : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Plano Starter</span>
                <span className="text-xs text-slate-400">Congregações locais</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-400">R$</span>
                <span className="text-3xl font-black text-white">97</span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 15 voluntários e líderes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 2 sedes / campi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Kanban, Portal e Eventos</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleActivatePlan('Starter (R$ 97/mês)')}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>Escolher Starter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card Pro Multi-Campi */}
          <div className="p-5 rounded-2xl border bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl flex flex-col justify-between relative ring-2 ring-indigo-500/50">
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
              Recomendado ⭐
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-300">Pro Multi-Campi</span>
                <span className="text-xs text-indigo-300/80">Ministérios em expansão</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-slate-400">R$</span>
                <span className="text-3xl font-black text-white">197</span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-indigo-500/30">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 50 voluntários e líderes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 10 sedes / campi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Gantt, Automações e WhatsApp</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleActivatePlan('Pro Multi-Campi (R$ 197/mês)')}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ativar Plano Pro Oficial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/50"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>Continuar navegando em Modo Leitura</span>
          </button>

          <button
            onClick={() => handleActivatePlan(currentPlan)}
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Falar com especialista no WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
