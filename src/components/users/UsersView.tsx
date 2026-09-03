import React, { useState } from 'react';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { UserRole, MembershipStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { EntitlementsService } from '../../services/entitlementsService';
import { 
  Users as UsersIcon, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Mail, 
  Building2, 
  MapPin, 
  Edit3, 
  Check, 
  X,
  Sparkles,
  Lock,
  Globe,
  Layers,
  Copy,
  UserX,
  UserCheck,
  Send
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { 
    memberships, 
    addMemberToOrg, 
    updateMemberRole, 
    updateMemberStatus,
    removeMemberFromOrg, 
    isAdmin 
  } = useAccess();
  const { currentOrganization, campuses } = useTenant();
  const { users } = useData();
  const { success, info } = useNotification();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEAM');
  const [newDepartment, setNewDepartment] = useState('Comunicação');
  const [newHasOrgWide, setNewHasOrgWide] = useState(true);
  const [newCampusIds, setNewCampusIds] = useState<string[]>([]);

  // Editing state
  const [editingMemId, setEditingMemId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('TEAM');
  const [editHasOrgWide, setEditHasOrgWide] = useState(true);
  const [editCampusIds, setEditCampusIds] = useState<string[]>([]);

  const orgMemberships = React.useMemo(() => {
    const seen = new Set<string>();
    const list: typeof memberships = [];
    for (const m of memberships) {
      if (m.organizationId === currentOrganization.id && !seen.has(m.userId)) {
        seen.add(m.userId);
        list.push(m);
      }
    }
    return list;
  }, [memberships, currentOrganization.id]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    const ok = addMemberToOrg(
      newEmail.trim(), 
      newName.trim(), 
      newRole, 
      newCampusIds, 
      newHasOrgWide, 
      newDepartment.trim()
    );
    if (ok) {
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewRole('TEAM');
      setNewHasOrgWide(true);
      setNewCampusIds([]);
    }
  };

  const handleCopyInviteLink = (memId: string, userName: string) => {
    const inviteUrl = `${window.location.origin}/?invite=${memId}&org=${currentOrganization.slug}`;
    navigator.clipboard.writeText(inviteUrl);
    success('Link de convite copiado!', `Envie o link para ${userName} aceitar o acesso.`);
  };

  const handleToggleSuspend = (memId: string, currentStatus: MembershipStatus) => {
    const newStatus: MembershipStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    updateMemberStatus(memId, newStatus);
  };


  const handleStartEdit = (memId: string, role: UserRole, campusList: string[], hasOrgWide: boolean) => {
    setEditingMemId(memId);
    setEditRole(role);
    setEditHasOrgWide(hasOrgWide);
    setEditCampusIds(campusList || []);
  };

  const handleSaveEdit = (memId: string) => {
    updateMemberRole(memId, editRole, editCampusIds, editHasOrgWide);
    setEditingMemId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestão de Membros & Convites
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {currentOrganization.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de convites, papéis (RBAC), restrição por campus e suspensão de acessos.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Convidar Novo Membro</span>
          </button>
        )}
      </div>

      {/* Members Grid / Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Membros da Organização ({orgMemberships.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Plano: <strong className="text-white">{currentOrganization.subscription.plan}</strong> ({orgMemberships.length}/{EntitlementsService.getEffectiveLimits(currentOrganization).maxMembers} vagas preenchidas)
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {orgMemberships.map((mem) => {
            const user = users.find((u) => u.id === mem.userId);
            const isEditing = editingMemId === mem.id;

            const campusNames = mem.hasOrgWideAccess
              ? 'Toda a Organização (Global)'
              : mem.campusIds && mem.campusIds.length > 0
                  ? mem.campusIds
                      .map((id) => campuses.find((c) => c.id === id)?.name || id)
                      .join(', ')
                  : 'Nenhum campus fixo';

            return (
              <div key={mem.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/40 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={user?.name || 'Membro'}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {user?.name || 'Usuário'}
                      </h4>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        {mem.department || 'Geral'}
                      </span>
                      {mem.status === 'SUSPENDED' && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          SUSPENSO
                        </span>
                      )}
                      {mem.status === 'INVITED' && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          CONVITE PENDENTE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {user?.email}
                      </span>
                      <span className="flex items-center gap-1 truncate text-indigo-300">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {campusNames}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role and Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="LEADER">LEADER</option>
                        <option value="TEAM">TEAM</option>
                        <option value="REQUESTER">REQUESTER</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={editHasOrgWide}
                          onChange={(e) => setEditHasOrgWide(e.target.checked)}
                          className="rounded text-indigo-600 bg-slate-800 border-slate-700"
                        />
                        <span>Global</span>
                      </label>
                      <button
                        onClick={() => handleSaveEdit(mem.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                        title="Salvar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingMemId(null)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          mem.role === 'ADMIN'
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                            : mem.role === 'LEADER'
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                            : mem.role === 'TEAM'
                            ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        }`}
                      >
                        {mem.role}
                      </span>

                      {/* Copy Invitation Link button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleCopyInviteLink(mem.id, user?.name || 'Membro')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                          title="Copiar Link de Convite"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Role & Suspend/Reactivate */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleStartEdit(mem.id, mem.role, mem.campusIds, mem.hasOrgWideAccess)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar Papel e Campi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(mem.id, mem.status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              mem.status === 'SUSPENDED'
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title={mem.status === 'SUSPENDED' ? 'Reativar Acesso' : 'Suspender Membro'}
                          >
                            {mem.status === 'SUSPENDED' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Tem certeza que deseja excluir ${user?.name || 'este membro'} da organização e do banco de dados?`)) {
                                removeMemberFromOrg(mem.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Excluir Vínculo e Usuário Definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Convidar Membro</span>
              </div>
              <h2 className="text-xl font-bold text-white">Convidar Voluntário/Líder</h2>
              <p className="text-xs text-slate-400 mt-1">
                Gere um convite de acesso para a organização <strong>{currentOrganization.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Pr. Daniel Oliveira"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail do Convidado *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="daniel@marketingibm.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Papel RBAC
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="LEADER">LEADER</option>
                    <option value="TEAM">TEAM</option>
                    <option value="REQUESTER">REQUESTER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Mídias, Jovens..."
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHasOrgWide}
                    onChange={(e) => setNewHasOrgWide(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                  <span>Acesso Global a Toda a Organização</span>
                </label>

                {!newHasOrgWide && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Campi Específicos Autorizados
                    </label>
                    <select
                      multiple
                      value={newCampusIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setNewCampusIds(selected);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 h-24"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Gerar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
