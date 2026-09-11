import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { useData } from '../../context/DataContext';
import { EntitlementsService } from '../../services/entitlementsService';
import { TenantPlan } from '../../types';
import { 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  Building2, 
  Calendar, 
  CheckSquare, 
  MessageSquare,
  Crown,
  AlertTriangle
} from 'lucide-react';

export const BillingPlanTab: React.FC = () => {
  const { currentOrganization, isTrialExpired, trialDaysLeft, openTrialExpiredModal } = useTenant();
  const { memberships } = useAccess();
  const { tasks, events } = useData();

  const { subscription } = currentOrganization;
  const plan = subscription?.plan || 'PRO';
  const isTrial = subscription?.isTrial || subscription?.status === 'TRIALING';
  const limits = EntitlementsService.getEffectiveLimits(currentOrganization);

  // Usage metrics
  const activeMembersCount = memberships.filter((m) => m.organizationId === currentOrganization.id).length;
  const activeEventsCount = events.filter((e) => !e.isArchived).length;
  const activeTasksCount = tasks.filter((t) => !t.isArchived).length;
  const campusesCount = currentOrganization.limits?.maxCampuses 
    ? Math.min(limits.maxCampuses, 1) 
    : 1;

  // Percentage calculations
  const memberPct = Math.min(100, Math.round((activeMembersCount / limits.maxMembers) * 100));
  const eventPct = Math.min(100, Math.round((activeEventsCount / limits.maxEvents) * 100));
  const taskPct = Math.min(100, Math.round((activeTasksCount / limits.maxTasks) * 100));

  const handleContactWhatsApp = (targetPlan: string) => {
    const text = encodeURIComponent(
      `Olá! Gostaria de informações para ativar ou fazer upgrade da assinatura do Oiko Gestão para o plano ${targetPlan} na organização "${currentOrganization.name}".`
    );
    window.open(`https://wa.me/5521989001302?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Status da Assinatura Atual */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all relative overflow-hidden ${
        isTrialExpired
          ? 'bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/70 border-rose-500/40'
          : isTrial
            ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border-indigo-500/30'
            : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/70 border-emerald-500/30'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Seu Plano Atual:
              </span>
              <span className="text-lg font-black text-white px-2.5 py-0.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{plan}</span>
              </span>

              {isTrialExpired ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Modo Leitura (Trial Expirado)</span>
                </span>
              ) : isTrial ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Período de Testes ({trialDaysLeft} dias restantes)</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Assinatura Oficial Ativa</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {isTrialExpired
                ? 'Seu período de avaliação de 14 dias terminou. Seus dados estão salvos e preservados. Ative seu plano oficial para liberar a criação de novas demandas.'
                : isTrial
                  ? `Você está aproveitando os 14 dias de teste com todos os recursos liberados para a equipe da ${currentOrganization.name}.`
                  : 'Sua igreja conta com acesso oficial completo, suporte prioritário e alta disponibilidade operacional.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {isTrial || isTrialExpired ? (
              <button
                onClick={openTrialExpiredModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Ativar Assinatura Oficial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => handleContactWhatsApp(plan)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suporte Financeiro</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Métricas de Uso de Limites em Tempo Real */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Consumo de Recursos & Vagas no Plano</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Membros */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Membros da Equipe</span>
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {activeMembersCount} / {limits.maxMembers}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  memberPct > 90 ? 'bg-rose-500' : memberPct > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${memberPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {limits.maxMembers - activeMembersCount > 0 
                ? `${limits.maxMembers - activeMembersCount} vagas restantes` 
                : 'Limite máximo de membros preenchido'}
            </p>
          </div>

          {/* Eventos / Projetos */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Projetos & Campanhas</span>
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {activeEventsCount} / {limits.maxEvents}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  eventPct > 90 ? 'bg-rose-500' : eventPct > 75 ? 'bg-amber-500' : 'bg-purple-500'
                }`}
                style={{ width: `${eventPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {limits.maxEvents - activeEventsCount > 0 
                ? `${limits.maxEvents - activeEventsCount} projetos simultâneos disponíveis` 
                : 'Limite de eventos simultâneos atingido'}
            </p>
          </div>

          {/* Tarefas Ativas */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tarefas Ativas</span>
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {activeTasksCount} / {limits.maxTasks}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  taskPct > 90 ? 'bg-rose-500' : taskPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${taskPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {limits.maxTasks - activeTasksCount > 0 
                ? `${limits.maxTasks - activeTasksCount} tarefas ativas disponíveis` 
                : 'Limite de tarefas simultâneas atingido'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Comparativos de Planos para Upgrade */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Comparativo de Pacotes Oficiais
          </h3>
          <span className="text-xs text-slate-500">
            Sem fidelidade abusiva • Suporte humano especializado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Starter */}
          <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
            plan === 'STARTER'
              ? 'bg-slate-900/90 border-indigo-500/60 shadow-xl ring-1 ring-indigo-500/30'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">Starter</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Igrejas e congregações locais estruturando operações</p>
                </div>
                {plan === 'STARTER' && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Seu Plano
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 pt-1 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-400">R$</span>
                <span className="text-3xl font-black text-white">97</span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 15 voluntários e líderes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Até 2 sedes / congregações</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Kanban com checklist atômico e concorrência</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Portal público guiado de solicitações</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Suporte por e-mail e WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleContactWhatsApp('Starter (R$ 97/mês)')}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>{plan === 'STARTER' ? 'Contatar sobre Starter' : 'Migrar para Starter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card Pro Multi-Campi */}
          <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative ${
            plan === 'PRO'
              ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-2xl ring-2 ring-indigo-500/40'
              : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/40'
          }`}>
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
              Mais Popular ⭐
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>Pro Multi-Campi</span>
                  </h4>
                  <p className="text-xs text-indigo-300/80 mt-0.5">Ministérios em expansão com múltiplos campi</p>
                </div>
                {plan === 'PRO' && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Seu Plano
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 pt-1 border-t border-indigo-500/30">
                <span className="text-xs font-semibold text-slate-400">R$</span>
                <span className="text-3xl font-black text-white">197</span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-indigo-500/30">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>Até 50 voluntários e líderes</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong>Até 10 sedes / congregações</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cronograma Gantt & Linha do Tempo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automações de tarefas e regras automáticas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Disparos de notificações no WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Identidade visual e logo customizados</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleContactWhatsApp('Pro Multi-Campi (R$ 197/mês)')}
              className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{plan === 'PRO' ? 'Contatar sobre Plano Pro' : 'Ativar Plano Pro Oficial'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
