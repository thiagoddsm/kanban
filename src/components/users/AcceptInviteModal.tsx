import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { StorageService } from '../../services/storageService';
import { FirestoreRepository } from '../../services/firestoreRepository';
import { Membership } from '../../types';
import { Sparkles, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

export const AcceptInviteModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { switchOrganization } = useTenant();

  const [inviteMembership, setInviteMembership] = useState<Membership | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (inviteId) {
      const allMemberships = StorageService.getMemberships();
      const mem = allMemberships.find((m) => m.id === inviteId);
      if (mem && mem.status === 'INVITED') {
        // Validação de segurança: o convite deve ser para o usuário logado.
        // Aceita se: (a) o userId do convite já é o uid atual, ou
        //            (b) o convite ainda não tem userId vinculado (fluxo de e-mail externo).
        const isForCurrentUser =
          (currentUser?.id && mem.userId === currentUser.id) || !mem.userId;

        if (isForCurrentUser) {
          setInviteMembership(mem);
          setIsOpen(true);
        } else {
          console.warn('Convite pertence a outro usuário — acesso negado.');
        }
      }
    }
  }, [currentUser?.id]);

  if (!isOpen || !inviteMembership || !currentUser) return null;

  const org = StorageService.getOrganizations().find((o) => o.id === inviteMembership.organizationId);

  const handleAccept = () => {
    const updated: Membership = {
      ...inviteMembership,
      userId: currentUser.id,  // garante que o userId é o do usuário autenticado
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };
    StorageService.updateMembership(updated);
    FirestoreRepository.saveMembership(updated);

    if (org) {
      switchOrganization(org.id);
    }

    // Clean up query param
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());

    setIsOpen(false);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 text-white">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Convite para Equipe
          </span>
          <h2 className="text-xl font-bold text-white">
            Você foi convidado para a equipe de {org?.name || 'Igreja'}!
          </h2>
          <p className="text-xs text-slate-400">
            Papel atribuído: <strong className="text-white">{inviteMembership.role}</strong> ({inviteMembership.department || 'Comunicação'})
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Aceitar Convite & Acessar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
