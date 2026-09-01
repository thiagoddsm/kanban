import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { useNotification } from '../../context/NotificationContext';
import { Campus, Organization } from '../../types';
import { 
  Building2, 
  ChevronDown, 
  MapPin, 
  Plus, 
  Check, 
  Layers,
  Edit3,
  Trash2,
  Sliders,
  Settings
} from 'lucide-react';
import { OnboardingModal } from './OnboardingModal';
import { NewCampusModal } from './NewCampusModal';
import { EditCampusModal } from './EditCampusModal';
import { EditOrganizationModal } from './EditOrganizationModal';
import { OrganizationManagerModal } from './OrganizationManagerModal';

export const TenantSwitcher: React.FC<{ variant?: 'sidebar' | 'header' }> = ({ variant = 'sidebar' }) => {
  const navigate = useNavigate();
  const { 
    organizations, 
    currentOrganization, 
    campuses, 
    currentCampus, 
    switchOrganization, 
    switchCampus,
    deleteCampus,
    deleteOrganization 
  } = useTenant();
  const { isAdmin, canManageCampuses } = useAccess();
  const { error: notifyError } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isNewCampusOpen, setIsNewCampusOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

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
              {campuses.map((camp) => {
                const isSelected = currentCampus?.id === camp.id;
                return (
                  <div
                    key={camp.id}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors group/item ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => {
                        switchCampus(camp.id);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{camp.name}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mr-1" />}
                      {canManageCampuses && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              setEditingCampus(camp);
                            }}
                            className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700 transition-colors"
                            title="Editar Campus"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (campuses.length <= 1) {
                                notifyError('Ação não permitida', 'Não é possível excluir o único campus cadastrado.');
                                return;
                              }
                              deleteCampus(camp.id);
                            }}
                            disabled={campuses.length <= 1}
                            className={`p-1 rounded transition-colors ${
                              campuses.length <= 1
                                ? 'opacity-30 cursor-not-allowed text-slate-600'
                                : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title="Excluir Campus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Switch Organization */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Minhas Igrejas / Organizações
              </span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {organizations.map((org) => {
                const isActive = org.id === currentOrganization.id;
                return (
                  <div
                    key={org.id}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white font-bold border border-slate-700'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      onClick={() => {
                        switchOrganization(org.id);
                        navigate(`/${org.slug}/dashboard`);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-300 shrink-0">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs truncate">{org.name}</p>
                        <span className="text-[9px] text-slate-400 uppercase font-normal">
                          Plano {org.subscription.plan}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 mr-1" />}
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              setEditingOrg(org);
                            }}
                            className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700 transition-colors"
                            title="Editar Organização"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (organizations.length <= 1) {
                                notifyError('Ação não permitida', 'Não é possível excluir a única organização.');
                                return;
                              }
                              deleteOrganization(org.id);
                            }}
                            disabled={organizations.length <= 1}
                            className={`p-1 rounded transition-colors ${
                              organizations.length <= 1
                                ? 'opacity-30 cursor-not-allowed text-slate-600'
                                : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title="Excluir Organização"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Actions & Manager */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsManagerOpen(true);
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/80 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gerenciar Organizações & Sedes</span>
            </button>

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

      {/* Edit Campus Modal */}
      <EditCampusModal
        campus={editingCampus}
        isOpen={!!editingCampus}
        onClose={() => setEditingCampus(null)}
      />

      {/* Edit Organization Modal */}
      <EditOrganizationModal
        organization={editingOrg}
        isOpen={!!editingOrg}
        onClose={() => setEditingOrg(null)}
      />

      {/* Comprehensive Manager Modal */}
      <OrganizationManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
      />

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
