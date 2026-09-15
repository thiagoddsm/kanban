import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { 
  Building2, 
  MapPin, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { OnboardingModal } from '../tenants/OnboardingModal';
import { EntitlementsService } from '../../services/entitlementsService';

export const MyOrganizationsView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    organizations, 
    currentOrganization, 
    switchOrganization 
  } = useTenant();
  const { accessibleOrganizations } = useAccess();
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Consider as orgs either what access returns, or fallback to local user orgs
  const visibleOrgs = accessibleOrganizations && accessibleOrganizations.length > 0 
    ? accessibleOrganizations 
    : organizations.filter(o => o.id === currentOrganization?.id);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-500" />
              Minhas Organizações
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualize e gerencie todas as igrejas e organizações que você administra ou tem acesso.
            </p>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Organização</span>
          </button>
        </div>

        {/* Grid de Orgs */}
        {visibleOrgs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Você ainda não tem organizações vinculadas</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Crie sua primeira igreja agora mesmo.</p>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Igreja
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleOrgs.map((org) => {
              const isActive = org.id === currentOrganization?.id;
              const isTrial = org.subscription?.isTrial || org.subscription?.status === 'TRIALING';
              const isExpired = EntitlementsService.isTrialExpired(org);
              const isActivePlan = org.subscription?.status === 'ACTIVE' && !isTrial;
              const daysLeft = EntitlementsService.getTrialDaysLeft(org);
              
              return (
                <div 
                  key={org.id}
                  className={`relative flex flex-col p-5 rounded-3xl border transition-all ${
                    isActive 
                      ? 'bg-white dark:bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 shadow-sm'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-3 -right-3 flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full border-4 border-slate-50 dark:border-slate-950 shadow-sm">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner shrink-0"
                      style={{ backgroundColor: org.branding?.primaryColor || '#4f46e5' }}
                    >
                      {org.branding?.logoUrl ? (
                        <img src={org.branding.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        org.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white truncate" title={org.name}>
                        {org.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {org.subscription.plan}
                        </span>
                        
                        {isActivePlan ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            Plano Ativo
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            Trial Expirado
                          </span>
                        ) : isTrial ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            Teste ({daysLeft}d)
                          </span>
                        ) : null}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1" title="Data de Criação">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{new Date(org.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1" title="ID / Slug">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[100px]">{org.slug}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                    {!isActive ? (
                      <button
                        onClick={() => {
                          switchOrganization(org.id);
                          navigate(`/${org.slug}/dashboard`);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-500/20 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors"
                      >
                        Acessar Painel
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Sessão Ativa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />
    </div>
  );
};
