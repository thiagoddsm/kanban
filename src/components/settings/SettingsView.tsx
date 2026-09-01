import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { useNotification } from '../../context/NotificationContext';
import { 
  Settings, 
  Palette, 
  CalendarDays, 
  Layers, 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  Tag,
  Shield,
  HelpCircle,
  MapPin,
  ArrowRight,
  Edit3
} from 'lucide-react';
import { Campus, Organization, DemandTypeDefinition, EventCategoryDefinition, DepartmentDefinition } from '../../types';
import { EditCampusModal } from '../tenants/EditCampusModal';
import { EditOrganizationModal } from '../tenants/EditOrganizationModal';
import { NewCampusModal } from '../tenants/NewCampusModal';
import { OnboardingModal } from '../tenants/OnboardingModal';

const COLOR_PRESETS = [
  { label: 'Índigo', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', bgLight: 'hover:bg-indigo-950/40 hover:border-indigo-500/60' },
  { label: 'Rosa / Coral', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', bgLight: 'hover:bg-rose-950/40 hover:border-rose-500/60' },
  { label: 'Roxo / Púrpura', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', bgLight: 'hover:bg-purple-950/40 hover:border-purple-500/60' },
  { label: 'Ciano / Aqua', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', bgLight: 'hover:bg-cyan-950/40 hover:border-cyan-500/60' },
  { label: 'Âmbar / Laranja', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', bgLight: 'hover:bg-amber-950/40 hover:border-amber-500/60' },
  { label: 'Esmeralda / Verde', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', bgLight: 'hover:bg-emerald-950/40 hover:border-emerald-500/60' },
  { label: 'Azul / Real', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', bgLight: 'hover:bg-blue-950/40 hover:border-blue-500/60' },
  { label: 'Pink / Fúcsia', color: 'text-pink-400 border-pink-500/30 bg-pink-500/10', bgLight: 'hover:bg-pink-950/40 hover:border-pink-500/60' },
  { label: 'Teal / Petróleo', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10', bgLight: 'hover:bg-teal-950/40 hover:border-teal-500/60' },
  { label: 'Cinza / Neutro', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10', bgLight: 'hover:bg-slate-950/60 hover:border-slate-500/60' },
];

const EVENT_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-cyan-600 to-blue-600',
  'from-rose-600 to-red-600',
  'from-indigo-600 to-purple-600',
  'from-slate-600 to-slate-700',
];

export const SettingsView: React.FC = () => {
  const { 
    demandTypes, 
    addDemandType, 
    updateDemandType, 
    deleteDemandType, 
    resetDemandTypesToDefault,
    eventCategories,
    addEventCategory,
    updateEventCategory,
    deleteEventCategory,
    departments,
    addDepartment,
    deleteDepartment
  } = useData();

  const { 
    organizations,
    currentOrganization, 
    campuses,
    currentCampus,
    switchOrganization,
    switchCampus,
    deleteCampus,
    deleteOrganization,
    updateOrganizationBranding 
  } = useTenant();
  const { isAdmin } = useAccess();
  const { success, warning, error: notifyError } = useNotification();

  const [activeSubTab, setActiveSubTab] = useState<'campuses' | 'organizations' | 'demands' | 'events' | 'departments' | 'branding'>('campuses');

  // Sub-modal states for Tenants
  const [selectedCampusForEdit, setSelectedCampusForEdit] = useState<Campus | null>(null);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<Organization | null>(null);
  const [isNewCampusOpen, setIsNewCampusOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // --- Demand Type Modal / Form State ---
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [editingDemandType, setEditingDemandType] = useState<DemandTypeDefinition | null>(null);
  const [dtLabel, setDtLabel] = useState('');
  const [dtDescription, setDtDescription] = useState('');
  const [dtPlaceholder, setDtPlaceholder] = useState('');
  const [dtColorIndex, setDtColorIndex] = useState(0);

  // --- Event Category Form State ---
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<EventCategoryDefinition | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catGradient, setCatGradient] = useState(EVENT_GRADIENTS[0]);

  // --- Department Form State ---
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // --- Branding Form State ---
  const [orgName, setOrgName] = useState(currentOrganization.name);
  const [primaryColor, setPrimaryColor] = useState(currentOrganization.branding?.primaryColor || '#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState(currentOrganization.branding?.secondaryColor || '#818cf8');
  const [logoUrl, setLogoUrl] = useState(currentOrganization.branding?.logoUrl || '');

  // Open Demand Type Form
  const handleOpenDemandForm = (item?: DemandTypeDefinition) => {
    if (item) {
      setEditingDemandType(item);
      setDtLabel(item.label);
      setDtDescription(item.description);
      setDtPlaceholder(item.placeholderText);
      const foundIdx = COLOR_PRESETS.findIndex((c) => c.color === item.color);
      setDtColorIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setEditingDemandType(null);
      setDtLabel('');
      setDtDescription('');
      setDtPlaceholder('');
      setDtColorIndex(0);
    }
    setIsDemandModalOpen(true);
  };

  const handleSaveDemandType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtLabel.trim()) return;

    const preset = COLOR_PRESETS[dtColorIndex];
    if (editingDemandType) {
      updateDemandType({
        ...editingDemandType,
        label: dtLabel.trim(),
        description: dtDescription.trim(),
        placeholderText: dtPlaceholder.trim() || `Ex: Descreva a necessidade para ${dtLabel}...`,
        color: preset.color,
        bgLight: preset.bgLight,
      });
    } else {
      const generatedTypeKey = 'CUSTOM_' + dtLabel.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') + '_' + Date.now().toString(36);
      addDemandType({
        id: 'dt_' + Date.now().toString(36),
        type: generatedTypeKey,
        label: dtLabel.trim(),
        icon: 'Palette',
        description: dtDescription.trim() || 'Demanda personalizada configurada pela liderança da igreja.',
        placeholderText: dtPlaceholder.trim() || `Ex: Descreva detalhadamente a demanda de ${dtLabel}...`,
        color: preset.color,
        bgLight: preset.bgLight,
        isCustom: true,
      });
    }
    setIsDemandModalOpen(false);
  };

  // Open Event Category Form
  const handleOpenCatForm = (item?: EventCategoryDefinition) => {
    if (item) {
      setEditingCat(item);
      setCatName(item.name);
      setCatDesc(item.description || '');
      setCatGradient(item.color || EVENT_GRADIENTS[0]);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatDesc('');
      setCatGradient(EVENT_GRADIENTS[0]);
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      updateEventCategory({
        ...editingCat,
        name: catName.trim(),
        description: catDesc.trim(),
        color: catGradient,
      });
    } else {
      addEventCategory({
        id: 'cat_' + Date.now().toString(36),
        name: catName.trim(),
        description: catDesc.trim(),
        color: catGradient,
      });
    }
    setIsCatModalOpen(false);
  };

  // Save Department
  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    addDepartment({
      id: 'dep_' + Date.now().toString(36),
      name: deptName.trim(),
      description: deptDesc.trim(),
    });
    setDeptName('');
    setDeptDesc('');
    setIsDeptModalOpen(false);
  };

  // Save Branding
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganizationBranding({
      primaryColor,
      secondaryColor,
      logoUrl: logoUrl.trim() || undefined,
    });
    success('Identidade visual da igreja atualizada com sucesso!');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Configurações & Listas do Sistema
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personalize os Tipos de Demanda nos formulários, Categorias de Eventos, Ministérios e Identidade Visual.
          </p>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('campuses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'campuses'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Sedes & Campi ({campuses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('organizations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'organizations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Igrejas / Organizações ({organizations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('demands')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'demands'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Tipos de Demanda ({demandTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'events'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Categorias de Eventos ({eventCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ministérios & Departamentos ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'branding'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Identidade Visual da Igreja</span>
        </button>
      </div>

      {/* TAB: SEDES & CAMPI */}
      {activeSubTab === 'campuses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Sedes e Campi da Igreja ({currentOrganization.name})</h3>
              <p className="text-xs text-slate-400">
                Gerencie todas as filiais e congregações. O Kanban e os eventos podem ser filtrados por unidade.
              </p>
            </div>

            <button
              onClick={() => setIsNewCampusOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Campus / Sede</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {campuses.map((camp) => {
              const isSelected = currentCampus?.id === camp.id;
              return (
                <div
                  key={camp.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">{camp.name}</h4>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase mt-0.5 inline-block">
                            {camp.code}
                          </span>
                        </div>
                      </div>
                      {camp.isMainCampus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                          Principal (Sede)
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-slate-400 space-y-1">
                      {camp.city && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-semibold">Cidade:</span> {camp.city}
                        </p>
                      )}
                      {camp.address && (
                        <p className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-500 font-semibold">Endereço:</span> {camp.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => switchCampus(camp.id)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        isSelected
                          ? 'text-indigo-400 bg-indigo-500/10 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {isSelected ? '✓ Ativo no Filtro' : 'Filtrar por este'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCampusForEdit(camp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar Campus"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
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
                        className={`p-1.5 rounded-lg transition-colors ${
                          campuses.length <= 1
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Excluir Campus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: IGREJAS / ORGANIZAÇÕES */}
      {activeSubTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Organizações e Igrejas (Multi-tenant SaaS)</h3>
              <p className="text-xs text-slate-400">
                Cada organização possui seus próprios membros, projetos, demandas, orçamentos e permissões isoladas.
              </p>
            </div>

            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Organização (SaaS)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {organizations.map((org) => {
              const isActive = org.id === currentOrganization.id;
              return (
                <div
                  key={org.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner shrink-0"
                          style={{ backgroundColor: org.branding?.primaryColor || '#4f46e5' }}
                        >
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">{org.name}</h4>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase mt-0.5 inline-block">
                            Plano {org.subscription.plan}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                          Ativa no Momento
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-slate-400 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold">Identificador (Slug):</span> {org.slug}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold">Criado em:</span> {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    {!isActive ? (
                      <button
                        onClick={() => switchOrganization(org.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all flex items-center gap-1"
                      >
                        <span>Acessar Organização</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Sessão Atual
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedOrgForEdit(org)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar Organização"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (organizations.length <= 1) {
                            notifyError('Ação não permitida', 'Não é possível excluir a única organização cadastrada.');
                            return;
                          }
                          deleteOrganization(org.id);
                        }}
                        disabled={organizations.length <= 1}
                        className={`p-1.5 rounded-lg transition-colors ${
                          organizations.length <= 1
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Excluir Organização"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: DEMAND TYPES */}
      {activeSubTab === 'demands' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Opções do Menu "Tipo de Demanda"</h3>
              <p className="text-xs text-slate-400">
                Estas são as opções exibidas para os líderes e membros ao abrir uma nova solicitação ou criar uma tarefa no Kanban.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetDemandTypesToDefault}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                title="Restaurar padrões recomendados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>

              <button
                onClick={() => handleOpenDemandForm()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Tipo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {demandTypes.map((dt) => (
              <div
                key={dt.type}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${dt.color}`}>
                      {dt.label}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenDemandForm(dt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar Tipo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteDemandType(dt.type)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir Tipo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">
                    {dt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Chave: <code className="text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">{dt.type}</code></span>
                  {dt.isCustom && <span className="text-amber-400 text-[10px] font-bold">Personalizado</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EVENT CATEGORIES */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Categorias de Projetos & Eventos</h3>
              <p className="text-xs text-slate-400">
                Classificação de grandes encontros, conferências, séries e cultos especiais.
              </p>
            </div>

            <button
              onClick={() => handleOpenCatForm()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eventCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${cat.color}`} />
                      <h4 className="text-xs font-bold text-white">{cat.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCatForm(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEventCategory(cat.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {cat.description || 'Sem descrição cadastrada.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS / MINISTRIES */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Ministérios & Departamentos Solicitantes</h3>
              <p className="text-xs text-slate-400">
                Departamentos da igreja que solicitam demandas de comunicação.
              </p>
            </div>

            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Ministério / Departamento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group shadow-lg"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{dept.name}</h4>
                  {dept.description && (
                    <p className="text-xs text-slate-400 mt-1">{dept.description}</p>
                  )}
                </div>

                <button
                  onClick={() => deleteDepartment(dept.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BRANDING */}
      {activeSubTab === 'branding' && (
        <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Identidade da Igreja</h3>
            <p className="text-xs text-slate-400 mt-1">
              Personalize o nome da organização e o esquema de cores nos relatórios e menus.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome da Igreja / Ministério
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Nome atual do tenant (gerenciado pelo plano Enterprise/Pro).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cor Primária do Tema
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                URL do Logotipo (Opcional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </form>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT DEMAND TYPE --- */}
      {isDemandModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingDemandType ? 'Editar Tipo de Demanda' : 'Adicionar Novo Tipo de Demanda'}
              </h3>
              <button
                onClick={() => setIsDemandModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDemandType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título / Nome da Opção *
                </label>
                <input
                  type="text"
                  required
                  value={dtLabel}
                  onChange={(e) => setDtLabel(e.target.value)}
                  placeholder="Ex: Tráfego Pago / Anúncios ou Boletim Semanal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Curta (Orientação ao Solicitante)
                </label>
                <textarea
                  rows={2}
                  value={dtDescription}
                  onChange={(e) => setDtDescription(e.target.value)}
                  placeholder="Ex: Campanhas patrocinadas no Instagram e Facebook para eventos e cultos..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exemplo / Placeholder de Ajuda
                </label>
                <input
                  type="text"
                  value={dtPlaceholder}
                  onChange={(e) => setDtPlaceholder(e.target.value)}
                  placeholder="Ex: Anúncio de 5 dias para o Retiro de Jovens com público de 18-35 anos..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Cor do Badge
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setDtColorIndex(idx)}
                      className={`p-2 rounded-xl text-center text-[11px] font-bold border transition-all ${preset.color} ${
                        dtColorIndex === idx ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Prévia no Dropdown:</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${COLOR_PRESETS[dtColorIndex].color}`}>
                  {dtLabel.trim() || 'Nome do Tipo'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDemandModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  Salvar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT EVENT CATEGORY --- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingCat ? 'Editar Categoria de Evento' : 'Nova Categoria de Evento'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Escola Bíblica de Férias ou Vigília"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Ex: Eventos infantis e projetos de férias..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Gradiente do Banner
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {EVENT_GRADIENTS.map((grad) => (
                    <button
                      type="button"
                      key={grad}
                      onClick={() => setCatGradient(grad)}
                      className={`h-8 rounded-xl bg-gradient-to-r ${grad} transition-all ${
                        catGradient === grad ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE DEPARTMENT --- */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Novo Ministério / Departamento</h3>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Ministério *
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Ex: Ministério de Acolhimento e Integração"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Ex: Recepção de visitantes e acompanhamento..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  Adicionar Ministério
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modals for Campuses and Organizations */}
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
