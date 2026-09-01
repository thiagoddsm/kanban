import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { useNotification } from '../../context/NotificationContext';
import { Campus, Organization } from '../../types';
import { 
  Building2, 
  MapPin, 
  Trash2, 
  Edit3, 
  Plus, 
  X, 
  Layers, 
  Check, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { EditCampusModal } from './EditCampusModal';
import { EditOrganizationModal } from './EditOrganizationModal';
import { NewCampusModal } from './NewCampusModal';
import { OnboardingModal } from './OnboardingModal';

interface OrganizationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationManagerModal: React.FC<OrganizationManagerModalProps> = ({ isOpen, onClose }) => {
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
  const { isAdmin } = useAccess();
  const { success, error: notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState<'campuses' | 'organizations'>('campuses');

  // Sub-modal states
  const [selectedCampusForEdit, setSelectedCampusForEdit] = useState<Campus | null>(null);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<Organization | null>(null);
  const [isNewCampusOpen, setIsNewCampusOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Gerenciar Organizações & Sedes
              </h2>
              <p className="text-xs text-slate-400">
                Edite, exclua ou adicione novas igrejas, sedes e filiais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('campuses')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'campuses'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Sedes & Campi ({campuses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'organizations'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Igrejas / Organizações ({organizations.length})</span>
          </button>
        </div>

        {/* Tab 1: Campuses */}
        {activeTab === 'campuses' && (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Campi vinculados à organização: <strong className="text-white">{currentOrganization.name}</strong>
              </span>
              <button
                onClick={() => setIsNewCampusOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Campus</span>
              </button>
            </div>

            <div className="space-y-2">
              {campuses.map((camp) => {
                const isActive = currentCampus?.id === camp.id;
                return (
                  <div
                    key={camp.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{camp.name}</h4>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 uppercase">
                            {camp.code}
                          </span>
                          {camp.isMainCampus && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Sede Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {camp.city ? `${camp.city} • ` : ''}{camp.address || 'Sem endereço cadastrado'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedCampusForEdit(camp)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Editar Campus"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (campuses.length <= 1) {
                            notifyError('Ação não permitida', 'Não é possível excluir o único campus cadastrado.');
                            return;
                          }
                          deleteCampus(camp.id);
                        }}
                        disabled={campuses.length <= 1}
                        className={`p-2 rounded-xl transition-colors ${
                          campuses.length <= 1
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Excluir Campus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Organizations */}
        {activeTab === 'organizations' && (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Igrejas e organizações cadastradas na sua conta:
              </span>
              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Organização</span>
              </button>
            </div>

            <div className="space-y-2">
              {organizations.map((org) => {
                const isActive = org.id === currentOrganization.id;
                return (
                  <div
                    key={org.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner shrink-0"
                        style={{ backgroundColor: org.branding?.primaryColor || '#4f46e5' }}
                      >
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{org.name}</h4>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                            {org.subscription.plan}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              Ativa Agora
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          ID: {org.slug} • Criada em {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => switchOrganization(org.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <span>Acessar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrgForEdit(org)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Editar Organização"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (organizations.length <= 1) {
                            notifyError('Ação não permitida', 'Não é possível excluir a única organização.');
                            return;
                          }
                          deleteOrganization(org.id);
                        }}
                        disabled={organizations.length <= 1}
                        className={`p-2 rounded-xl transition-colors ${
                          organizations.length <= 1
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Excluir Organização"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <EditCampusModal
        campus={selectedCampusForEdit}
        isOpen={!!selectedCampusForEdit}
        onClose={() => setSelectedCampusForEdit(null)}
      />

      <EditOrganizationModal
        organization={selectedOrgForEdit}
        isOpen={!!selectedOrgForEdit}
        onClose={() => setSelectedOrgForEdit(null)}
      />

      <NewCampusModal
        isOpen={isNewCampusOpen}
        onClose={() => setIsNewCampusOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};
