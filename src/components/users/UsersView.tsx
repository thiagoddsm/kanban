import React, { useState, useEffect } from 'react';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { UserRole, MembershipStatus, Membership } from '../../types';
import { StorageService } from '../../services/storageService';
import { FirestoreRepository } from '../../services/firestoreRepository';
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
  Send,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertCircle
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
  const { currentOrganization, campuses, isTrialExpired, openTrialExpiredModal } = useTenant();
  const { users } = useData();
  const { success, info } = useNotification();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEAM');
  const [newDepartment, setNewDepartment] = useState('Comunicação');
  const [newHasOrgWide, setNewHasOrgWide] = useState(true);
  const [newCampusIds, setNewCampusIds] = useState<string[]>([]);

  // Editing state
  const [editingMemId, setEditingMemId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('TEAM');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editHasOrgWide, setEditHasOrgWide] = useState(true);
  const [editCampusIds, setEditCampusIds] = useState<string[]>([]);

  const orgMemberships = React.useMemo(() => {
    const seenUsers = new Set<string>();
    const seenEmails = new Set<string>();
    const list: Membership[] = [];
    const allLocalUsers = StorageService.getUsers();

    // Ordena para que contas com UID real (não começando com usr_) tenham prioridade visual sobre convites pendentes duplicados
    const orgMems = memberships
      .filter((m) => m.organizationId === currentOrganization.id)
      .sort((a, b) => {
        const aIsTemp = a.userId.startsWith('usr_') ? 1 : 0;
        const bIsTemp = b.userId.startsWith('usr_') ? 1 : 0;
        return aIsTemp - bIsTemp;
      });
    
    for (const m of orgMems) {
      if (seenUsers.has(m.userId)) continue;
      const u = users.find((usr) => usr.id === m.userId) || allLocalUsers.find((usr) => usr.id === m.userId);
      const emailKey = (u?.email || '').trim().toLowerCase();
      if (emailKey && seenEmails.has(emailKey)) continue;

      seenUsers.add(m.userId);
      if (emailKey) seenEmails.add(emailKey);
      list.push(m);
    }

    return list;
  }, [memberships, users, currentOrganization.id]);

  // Reconciliação e unificação de membros duplicados (ex: usr_... convidado vs conta Firebase Auth real do Hugo)
  const runMembersAuditAndSync = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const remoteUsers = await FirestoreRepository.fetchUsers();
      const remoteMems = await FirestoreRepository.fetchMemberships(currentOrganization.id);
      let recovered = 0;
      let mergedCount = 0;

      // 1. Agrupa usuários por e-mail para detectar duplicatas (usr_... vs UID real do Firebase Auth)
      const byEmail = new Map<string, typeof remoteUsers>();
      for (const u of remoteUsers) {
        if (!u || !u.id) continue;
        const cleanEmail = (u.email || '').trim().toLowerCase();
        if (!cleanEmail) continue;
        const group = byEmail.get(cleanEmail) || [];
        group.push(u);
        byEmail.set(cleanEmail, group);
      }

      // Se houver um usuário com UID real e outro(s) usr_... com o mesmo e-mail, reconcilia tudo para o UID real!
      for (const [email, group] of byEmail.entries()) {
        const realUser = group.find((u) => !u.id.startsWith('usr_'));
        const tempUsers = group.filter((u) => u.id.startsWith('usr_'));
        if (realUser && tempUsers.length > 0) {
          await FirestoreRepository.reconcileUserOnLogin(
            realUser.id,
            email,
            realUser.name,
            realUser.avatar,
            currentOrganization.id
          );
          mergedCount++;
        } else if (realUser) {
          // Mesmo que o tempUser já tenha sido apagado de /users, verifica se sobrou uma membership órfã com usr_... na organização
          for (const m of remoteMems) {
            if (m.userId.startsWith('usr_')) {
              const orphanUser = StorageService.getUsers().find((lu) => lu.id === m.userId);
              if (orphanUser && (orphanUser.email || '').trim().toLowerCase() === email) {
                await FirestoreRepository.reconcileUserOnLogin(
                  realUser.id,
                  email,
                  realUser.name,
                  realUser.avatar,
                  currentOrganization.id
                );
                mergedCount++;
              }
            }
          }
        }
      }

      // Recarrega lista após possíveis reconciliações
      const updatedUsers = mergedCount > 0 ? await FirestoreRepository.fetchUsers() : remoteUsers;
      const updatedMems = mergedCount > 0 ? await FirestoreRepository.fetchMemberships(currentOrganization.id) : remoteMems;

      for (const u of updatedUsers) {
        if (!u || !u.id || !currentOrganization?.id) continue;

        // Pula ghost users (sem nome E sem email)
        const hasName = u.name && u.name.trim() !== '' && u.name !== 'Membro';
        const hasEmail = u.email && u.email.trim() !== '';
        if (!hasName && !hasEmail) continue;

        const uEmail = (u.email || '').toLowerCase();
        // Condição estrita: apenas usuários vinculados explicitamente a esta organização
        const belongs = 
          u.organizationIds?.includes(currentOrganization.id) ||
          (u.tenantId === currentOrganization.id && (!u.organizationIds || u.organizationIds.length === 0));

        if (belongs) {
          const hasMem = updatedMems.some((m) => m.userId === u.id);
          if (!hasMem) {
            // Verifica se existe alguma membership antiga pelo mesmo e-mail para herdar o role (ex: TEAM)
            const sameEmailUserIds = updatedUsers
              .filter((other) => (other.email || '').toLowerCase() === uEmail)
              .map((other) => other.id);
            const existingMemByEmail = updatedMems.find((m) => sameEmailUserIds.includes(m.userId));

            const newMem: Membership = {
              id: 'mem_' + u.id + '_' + currentOrganization.id,
              userId: u.id,
              organizationId: currentOrganization.id,
              hasOrgWideAccess: existingMemByEmail ? existingMemByEmail.hasOrgWideAccess : true,
              campusIds: existingMemByEmail ? existingMemByEmail.campusIds : [],
              role: existingMemByEmail
                ? existingMemByEmail.role
                : (uEmail && (uEmail.includes('thiagoddsm') || uEmail.includes('admin')))
                ? 'ADMIN'
                : 'TEAM',
              department: existingMemByEmail?.department || 'Comunicação',
              status: 'ACTIVE',
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await FirestoreRepository.saveMembership(newMem);
            StorageService.addMembership(newMem);
            recovered++;
          }

          if (!u.organizationIds?.includes(currentOrganization.id)) {
            const updatedUser = {
              ...u,
              organizationIds: Array.from(new Set([...(u.organizationIds || []), currentOrganization.id])),
            };
            await FirestoreRepository.syncUser(updatedUser);
          }
        }
      }

      if (!silent) {
        success(
          'Sincronização & Auditoria Concluída!',
          recovered > 0 || mergedCount > 0
            ? `${recovered + mergedCount} perfil(is) reconciliado(s) e sincronizado(s) com sucesso.`
            : `Todos os ${orgMemberships.length} membros estão sincronizados e ativos.`
        );
      }
    } catch (err) {
      console.error('Erro na sincronização:', err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Executa auditoria silenciosa automática ao abrir a tela de membros para corrigir contas divididas (ex: Hugo)
  useEffect(() => {
    if (currentOrganization?.id) {
      runMembersAuditAndSync(true);
    }
  }, [currentOrganization?.id]);

  const handleSyncMembers = () => runMembersAuditAndSync(false);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    const ok = addMemberToOrg(
      newEmail.trim(), 
      newName.trim(), 
      newRole, 
      newCampusIds, 
      newHasOrgWide, 
      newDepartment.trim(),
      newPhone.trim() || undefined
    );
    if (ok) {
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPhone('');
      setNewRole('TEAM');
      setNewHasOrgWide(true);
      setNewCampusIds([]);
    }
  };

  const handleCopyInviteLink = (memId: string, userName: string) => {
    const mem = memberships.find((m) => m.id === memId);
    const user = users.find((u) => u.id === mem?.userId) || StorageService.getUsers().find((u) => u.id === mem?.userId);
    const emailParam = user?.email ? `&email=${encodeURIComponent(user.email)}` : '';
    const inviteUrl = `${window.location.origin}/login?tab=primeiro-acesso&org=${currentOrganization.slug}${emailParam}&invite=${memId}`;
    navigator.clipboard.writeText(inviteUrl);
    success('Link de Primeiro Acesso copiado!', `Envie o link para ${userName} ativar o acesso e definir a senha.`);
  };

  const handleToggleSuspend = (memId: string, currentStatus: MembershipStatus) => {
    const newStatus: MembershipStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    updateMemberStatus(memId, newStatus);
  };

  const handleStartEdit = (memId: string, role: UserRole, campusList: string[], hasOrgWide: boolean, currentPhone?: string) => {
    setEditingMemId(memId);
    setEditRole(role);
    setEditPhone(currentPhone || '');
    setEditHasOrgWide(hasOrgWide);
    setEditCampusIds(campusList || []);
  };

  const handleSaveEdit = async (memId: string) => {
    updateMemberRole(memId, editRole, editCampusIds, editHasOrgWide);

    // Salva também o número de WhatsApp/telefone no perfil do usuário (e em eventuais contas de mesmo e-mail)
    const mem = memberships.find((m) => m.id === memId);
    if (mem) {
      const allLocal = StorageService.getUsers();
      const targetUser = users.find((u) => u.id === mem.userId) || allLocal.find((u) => u.id === mem.userId);
      if (targetUser) {
        const cleanPhone = editPhone.trim() || undefined;
        const updatedUser = {
          ...targetUser,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          notifyWhatsApp: true,
        };
        StorageService.updateUser(updatedUser);
        await FirestoreRepository.syncUser(updatedUser);

        // Se houver outra conta com o mesmo e-mail (ex: UID real do Firebase Auth), propaga o telefone para ela também
        if (targetUser.email) {
          const sameEmailUsers = await FirestoreRepository.getUsersByEmail(targetUser.email);
          for (const other of sameEmailUsers) {
            if (other.id !== targetUser.id) {
              const updatedOther = {
                ...other,
                phone: cleanPhone,
                whatsapp: cleanPhone,
                notifyWhatsApp: true,
              };
              StorageService.updateUser(updatedOther);
              await FirestoreRepository.syncUser(updatedOther);
            }
          }
        }
      }
    }

    setEditingMemId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar bg-slate-50 dark:bg-transparent">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestão de Membros & Convites
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              {currentOrganization.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle de convites, papéis (RBAC), WhatsApp para notificações e restrição por campus.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleSyncMembers}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm dark:shadow-none"
            title="Sincronizar usuários e atualizar cadastros no Firestore"
          >
            <RefreshCw className={`w-4 h-4 text-brand-600 dark:text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Membros'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                if (isTrialExpired) {
                  openTrialExpiredModal();
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 dark:bg-gradient-to-r dark:from-indigo-600 dark:via-indigo-700 dark:to-purple-600 dark:hover:from-indigo-500 dark:hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Convidar Novo Membro</span>
            </button>
          )}
        </div>
      </div>

      {/* Members Grid / Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-brand-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Membros da Organização ({orgMemberships.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Plano: <strong className="text-slate-900 dark:text-white">{currentOrganization.subscription.plan}</strong> ({orgMemberships.length}/{EntitlementsService.getEffectiveLimits(currentOrganization).maxMembers} vagas preenchidas)
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          {orgMemberships.map((mem) => {
            const allLocalUsers = StorageService.getUsers();
            const directUser = users.find((u) => u.id === mem.userId) || allLocalUsers.find((u) => u.id === mem.userId);
            const cleanEmail = (directUser?.email || '').trim().toLowerCase();
            // Busca qualquer registro com o mesmo e-mail para garantir que o WhatsApp salvo pelo usuário apareça mesmo antes da reconciliação
            const sameEmailUser = cleanEmail
              ? users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail && (u.whatsapp || u.phone)) ||
                allLocalUsers.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail && (u.whatsapp || u.phone))
              : undefined;

            const user = directUser;
            const resolvedPhone = directUser?.whatsapp || directUser?.phone || sameEmailUser?.whatsapp || sameEmailUser?.phone || '';
            const isEditing = editingMemId === mem.id;

            const campusNames = mem.hasOrgWideAccess
              ? 'Toda a Organização (Global)'
              : mem.campusIds && mem.campusIds.length > 0
                  ? mem.campusIds
                      .map((id) => campuses.find((c) => c.id === id)?.name || id)
                      .join(', ')
                  : 'Nenhum campus fixo';

            const displayName = 
              (user?.name && user.name.trim() !== '' && user.name !== 'Membro' && user.name !== 'Usuário')
                ? user.name
                : user?.email ? user.email.split('@')[0] : 'Membro';

            return (
              <div key={mem.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {displayName}
                      </h4>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
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
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {user?.email}
                      </span>
                      {resolvedPhone ? (
                        <span className="flex items-center gap-1 truncate text-emerald-600 dark:text-emerald-400 font-medium">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {resolvedPhone}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => isAdmin && handleStartEdit(mem.id, mem.role, mem.campusIds, mem.hasOrgWideAccess, '')}
                          className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                          title="Clique para cadastrar o WhatsApp deste membro"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>Sem WhatsApp (clique p/ adicionar)</span>
                        </button>
                      )}
                      <span className="flex items-center gap-1 truncate text-brand-600 dark:text-indigo-300">
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
                      <div className="relative">
                        <Phone className="w-3 h-3 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="WhatsApp (DDD + Número)"
                          className="pl-7 pr-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white shadow-sm w-44 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white shadow-sm"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="LEADER">LEADER</option>
                        <option value="TEAM">TEAM</option>
                        <option value="REQUESTER">REQUESTER</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={editHasOrgWide}
                          onChange={(e) => setEditHasOrgWide(e.target.checked)}
                          className="rounded text-brand-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
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
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                            ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                            : mem.role === 'LEADER'
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                            : mem.role === 'TEAM'
                            ? 'text-brand-700 dark:text-indigo-400 bg-brand-50 dark:bg-indigo-500/10 border-brand-200 dark:border-indigo-500/30'
                            : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {mem.role}
                      </span>

                      {/* Copy Invitation Link button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleCopyInviteLink(mem.id, displayName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Copiar Link de Convite"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Role, WhatsApp & Suspend/Reactivate */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleStartEdit(mem.id, mem.role, mem.campusIds, mem.hasOrgWideAccess, resolvedPhone)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar Papel, WhatsApp e Campi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(mem.id, mem.status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              mem.status === 'SUSPENDED'
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                            }`}
                            title={mem.status === 'SUSPENDED' ? 'Reativar Acesso' : 'Suspender Membro'}
                          >
                            {mem.status === 'SUSPENDED' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Tem certeza que deseja excluir ${displayName} da organização e do banco de dados?`)) {
                                removeMemberFromOrg(mem.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp (com DDD) — Para Notificações
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
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
