import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { FirestoreRepository } from '../../services/firestoreRepository';
import { MasterOrganizationInfo, MasterUserInfo, TenantPlan, SubscriptionStatus } from '../../types';
import { EntitlementsService } from '../../services/entitlementsService';
import { 
  ShieldAlert, 
  Building2, 
  Users2, 
  Search,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  Ban,
  Check,
  CreditCard
} from 'lucide-react';

export const SaasMasterView: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { switchOrganization } = useTenant();
  const { success, error: notifyError } = useNotification();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');
  
  const [masterOrgs, setMasterOrgs] = useState<MasterOrganizationInfo[]>([]);
  const [masterUsers, setMasterUsers] = useState<MasterUserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchOrg, setSearchOrg] = useState('');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [isSuperAdmin, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orgs, users] = await Promise.all([
        FirestoreRepository.fetchMasterOrganizationsWithAdmins(),
        FirestoreRepository.fetchMasterUsersWithAccess()
      ]);
      setMasterOrgs(orgs);
      setMasterUsers(users);
    } catch (e) {
      notifyError('Erro', 'Não foi possível carregar os dados master.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubscription = async (orgId: string, plan: TenantPlan, status: SubscriptionStatus, isTrial: boolean, addDays: number = 0) => {
    const orgInfo = masterOrgs.find(o => o.organization.id === orgId);
    if (!orgInfo) return;
    
    const currentEnd = new Date(orgInfo.organization.subscription.currentPeriodEnd || Date.now());
    if (addDays > 0) {
      currentEnd.setDate(currentEnd.getDate() + addDays);
    }

    await FirestoreRepository.masterUpdateOrgSubscription(orgId, {
      plan,
      status,
      isTrial,
      currentPeriodEnd: currentEnd.toISOString(),
      ...(isTrial ? { trialEndsAt: currentEnd.toISOString() } : {})
    });
    
    success('Assinatura Atualizada', 'As novas configurações foram salvas com sucesso.');
    loadData(); // recarrega para mostrar mudanças
  };

  const handleImpersonate = (orgId: string, slug: string) => {
    switchOrganization(orgId);
    navigate(`/${slug}/dashboard`);
    success('Sessão Trocada', `Você acessou o painel da organização como Gestor.`);
  };

  // KPIs
  const totalOrgs = masterOrgs.length;
  const activeTrials = masterOrgs.filter(o => o.organization.subscription?.isTrial && !EntitlementsService.isTrialExpired(o.organization)).length;
  const expiredTrials = masterOrgs.filter(o => o.organization.subscription?.isTrial && EntitlementsService.isTrialExpired(o.organization)).length;
  const activeSubs = masterOrgs.filter(o => o.organization.subscription?.status === 'ACTIVE' && !o.organization.subscription.isTrial).length;

  const filteredOrgs = masterOrgs.filter(o => o.organization.name.toLowerCase().includes(searchOrg.toLowerCase()) || o.organization.slug.toLowerCase().includes(searchOrg.toLowerCase()));
  const filteredUsers = masterUsers.filter(u => u.user.name?.toLowerCase().includes(searchUser.toLowerCase()) || u.user.email?.toLowerCase().includes(searchUser.toLowerCase()));

  if (!isSuperAdmin) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
              Gestão SaaS (SuperAdmin)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visão global de todas as organizações, assinaturas e usuários cadastrados na plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors">
              Atualizar Dados
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Igrejas</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalOrgs}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Check className="w-10 h-10 text-emerald-500" /></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Assinantes Ativos</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeSubs}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-10 h-10 text-amber-500" /></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Em Trial Ativo</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{activeTrials}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Ban className="w-10 h-10 text-rose-500" /></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Trial Expirado</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{expiredTrials}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab('orgs')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'orgs' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Organizações & Pagamentos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'users' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Users2 className="w-4 h-4" />
            Matriz de Usuários
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {activeTab === 'orgs' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar igreja por nome ou slug..."
                    value={searchOrg}
                    onChange={(e) => setSearchOrg(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Igreja / Organização</th>
                          <th className="px-4 py-3">Admin Responsável</th>
                          <th className="px-4 py-3">Estágio & Pagamento</th>
                          <th className="px-4 py-3">Membros/Sedes</th>
                          <th className="px-4 py-3 text-right">Ações Gestor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredOrgs.map((info) => {
                          const org = info.organization;
                          const isTrial = org.subscription?.isTrial;
                          const isExpired = EntitlementsService.isTrialExpired(org);
                          const isActivePlan = org.subscription?.status === 'ACTIVE' && !isTrial;
                          const daysLeft = EntitlementsService.getTrialDaysLeft(org);

                          return (
                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner shrink-0" style={{ backgroundColor: org.branding?.primaryColor || '#4f46e5' }}>
                                    {org.branding?.logoUrl ? <img src={org.branding.logoUrl} className="w-full h-full object-cover rounded-xl" /> : org.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]" title={org.name}>{org.name}</div>
                                    <div className="text-[10px] text-slate-400">{org.slug}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {info.adminUser ? (
                                  <div>
                                    <div className="font-bold text-slate-700 dark:text-slate-300">{info.adminUser.name}</div>
                                    <div className="text-[10px] text-slate-500">{info.adminUser.email}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Sem admin</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                                    {org.subscription.plan}
                                  </span>
                                  {isActivePlan ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Ativo</span>
                                  ) : isExpired ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">Trial Expirado</span>
                                  ) : isTrial ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">Teste ({daysLeft}d)</span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{org.subscription.status}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <div><span className="font-bold">{info.membersCount}</span> Membros</div>
                                <div><span className="font-bold">{info.campusesCount}</span> Sedes</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isTrial && (
                                    <button 
                                      onClick={() => handleUpdateSubscription(org.id, org.subscription.plan, 'TRIALING', true, 14)}
                                      className="p-1.5 text-slate-400 hover:text-amber-500 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-500/10 rounded-lg transition-colors" title="Estender Trial +14 dias"
                                    >
                                      <Clock className="w-4 h-4" />
                                    </button>
                                  )}
                                  {!isActivePlan && (
                                    <button 
                                      onClick={() => handleUpdateSubscription(org.id, 'PRO', 'ACTIVE', false)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Ativar Plano Oficial"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleImpersonate(org.id, org.slug)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors"
                                  >
                                    Acessar
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuário por nome ou e-mail..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Usuário</th>
                          <th className="px-4 py-3">Acessos & Igrejas Permitidas</th>
                          <th className="px-4 py-3 text-right">Cadastrado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((u) => (
                          <tr key={u.user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {u.user.avatar ? (
                                  <img src={u.user.avatar} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                                    {u.user.name?.substring(0,2).toUpperCase() || 'US'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-white">{u.user.name}</div>
                                  <div className="text-[10px] text-slate-500">{u.user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {u.memberships.length === 0 && <span className="text-xs text-slate-400 italic">Sem acessos</span>}
                                {u.memberships.map(m => (
                                  <div key={m.organizationId} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title={`Papel: ${m.role}`}>
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{m.organizationName}</span>
                                    <span className="text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase">{m.role}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-500">
                              {u.user.createdAt ? new Date(u.user.createdAt).toLocaleDateString('pt-BR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
