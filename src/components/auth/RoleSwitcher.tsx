import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { UserRole } from '../../types';
import { Shield, ChevronDown, Check, UserCheck, LogIn, LogOut, UserPlus } from 'lucide-react';
import { AuthModal } from './AuthModal';

const ROLES_INFO: { role: UserRole; label: string; description: string; color: string }[] = [
  {
    role: 'ADMIN',
    label: 'Administrador Geral',
    description: 'Acesso irrestrito a configurações, campi, relatórios e membros.',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  {
    role: 'LEADER',
    label: 'Líder de Comunicação',
    description: 'Triagem de demandas, criação de eventos, atribuição e aprovação.',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    role: 'TEAM',
    label: 'Membro da Equipe',
    description: 'Executa demandas, move cards, anexa links e relata bloqueios.',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    role: 'REQUESTER',
    label: 'Solicitante / Pastor',
    description: 'Abre demandas na Central de Solicitações e acompanha status.',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
];

export const RoleSwitcher: React.FC = () => {
  const { currentUser, switchUser, users, logout } = useAuth();
  const { currentRole, switchRoleInCurrentOrg } = useAccess();
  const { currentOrganization } = useTenant();

  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
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

  const activeRoleInfo = ROLES_INFO.find((r) => r.role === currentRole) || ROLES_INFO[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all text-xs"
        title="Conta & Permissões"
      >
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${activeRoleInfo.color}`}>
          {activeRoleInfo.role}
        </span>
        <span className="font-semibold text-slate-200 hidden md:inline truncate max-w-[120px]">
          {currentUser.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-slide-down space-y-3">
          {/* Section 1: User Account Actions */}
          <div className="space-y-1 pb-2 border-b border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                setAuthModalTab('login');
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Entrar / Trocar Conta Firebase</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setAuthModalTab('signup');
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-purple-400" />
              <span>Criar Nova Conta</span>
            </button>
          </div>

          {/* Section 2: Switch Role in Current Org */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">
              Simular Papel em {currentOrganization.name}
            </span>
            <div className="space-y-1">
              {ROLES_INFO.map((item) => (
                <button
                  key={item.role}
                  onClick={() => {
                    switchRoleInCurrentOrg(item.role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                    currentRole === item.role
                      ? 'bg-slate-800 font-semibold text-white'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border mr-2 ${item.color}`}>
                      {item.role}
                    </span>
                    <span className="text-xs">{item.label}</span>
                  </div>
                  {currentRole === item.role && (
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Switch User Identity */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">
              Trocar de Usuário (Identidade Demo)
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-1.5 rounded-xl text-left transition-colors text-xs ${
                    currentUser.id === u.id
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={u.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="truncate">{u.name}</span>
                  </div>
                  {currentUser.id === u.id && <Check className="w-3 h-3 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Logout */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-950/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
};
