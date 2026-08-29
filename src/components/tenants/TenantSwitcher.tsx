import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { 
  Building2, 
  ChevronDown, 
  MapPin, 
  Plus, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Layers,
  Crown
} from 'lucide-react';
import { OnboardingModal } from './OnboardingModal';
import { NewCampusModal } from './NewCampusModal';

export const TenantSwitcher: React.FC<{ variant?: 'sidebar' | 'header' }> = ({ variant = 'sidebar' }) => {
  const { 
    organizations, 
    currentOrganization, 
    campuses, 
    currentCampus, 
    switchOrganization, 
    switchCampus 
  } = useTenant();
  const { accessibleOrganizations, currentRole, canManageCampuses } = useAccess();

  const [isOpen, setIsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isNewCampusOpen, setIsNewCampusOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border transition-all duration-200 text-left group ${
          variant === 'sidebar'
            ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 shadow-md'
            : 'bg-slate-800/90 border-slate-700 hover:border-indigo-500/50 text-xs px-3 py-1.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0 overflow-hidden flex items-center justify-center text-white shadow-inner font-black text-xs">
            {currentOrganization.branding?.logoUrl ? (
              <img
                src={currentOrganization.branding.logoUrl}
                alt={currentOrganization.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white truncate">
                {currentOrganization.name}
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                {currentOrganization.subscription.plan}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">
                {currentCampus ? currentCampus.name : 'Todos os Campi'}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:text-white'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 p-3 space-y-3 animate-slide-down backdrop-blur-xl">
          {/* Section 1: Campuses of Current Org */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Unidade / Campus Ativo
              </span>
              {canManageCampuses && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsNewCampusOpen(true);
                  }}
                  className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Campus</span>
                </button>
              )}
            </div>

            <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {/* Option: Todos os Campi */}
              <button
                onClick={() => {
                  switchCampus(null);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  !currentCampus
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Todos os Campi (Visão Geral)</span>
                </div>
                {!currentCampus && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              {/* Specific Campuses */}
              {campuses.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => {
                    switchCampus(camp.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    currentCampus?.id === camp.id
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{camp.name}</span>
                  </div>
                  {currentCampus?.id === camp.id && (
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Switch Organization */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Minhas Igrejas / Organizações
              </span>
            </div>

            <div className="space-y-1">
              {organizations.map((org) => {
                const isActive = org.id === currentOrganization.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white font-bold border border-slate-700'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-300 shrink-0">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs truncate">{org.name}</p>
                        <span className="text-[9px] text-slate-400 uppercase">
                          Plano {org.subscription.plan}
                        </span>
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Add New Organization Action */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsOnboardingOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Igreja / Organização (SaaS)</span>
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* New Campus Modal */}
      <NewCampusModal
        isOpen={isNewCampusOpen}
        onClose={() => setIsNewCampusOpen(false)}
      />
    </div>
  );
};
