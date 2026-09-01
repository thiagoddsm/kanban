import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { UserRole } from '../../types';
import { Shield, ChevronDown, Check, LogIn, LogOut, UserPlus, UserCheck, Sparkles } from 'lucide-react';
import { AuthModal } from './AuthModal';

const ROLES: { role: UserRole; label: string; desc: string; color: string }[] = [
  { role: 'ADMIN', label: 'Administrador', desc: 'Acesso irrestrito a configurações e membros', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { role: 'LEADER', label: 'Líder de Ministério', desc: 'Cria projetos, aprova demandas e coordena', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { role: 'TEAM', label: 'Equipe / Voluntário', desc: 'Produz peças, move tarefas no Kanban', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  { role: 'REQUESTER', label: 'Solicitante', desc: 'Abre demandas e acompanha suas entregas', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
];

export const RoleSwitcher: React.FC = () => {
  const { currentUser, users, switchUser, logout } = useAuth();
  const { currentRole, switchRoleInCurrentOrg } = useAccess();
  const { currentOrganization } = useTenant();
  const { success } = useNotification();

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

  const handleRoleSelect = (role: UserRole) => {
    switchRoleInCurrentOrg(role);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    success('Sessão encerrada com sucesso!');
  };

  const currentRoleConfig = ROLES.find((r) => r.role === currentRole) || ROLES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all text-xs"
        title="Minha Conta & Permissões"
      >
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${currentRoleConfig.color}`}>
          {currentRole}
        </span>
        <span className="font-semibold text-slate-200 hidden md:inline truncate max-w-[140px]">
          {currentUser.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-slide-down space-y-3">
          {/* User Profile Card */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                {currentOrganization.name}
              </span>
            </div>
          </div>

          {/* Role / Function Switcher (Simulação RBAC) */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Função / Papel Ativo
              </span>
              <span className="text-[9px] text-indigo-400">Simulação RBAC</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {ROLES.map(({ role, label, color }) => {
                const isActive = currentRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                      isActive
                        ? `${color} ring-1 ring-white/20 font-bold`
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{role}</span>
                    {isActive && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Actions */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                setAuthModalTab('login');
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Entrar / Trocar Conta</span>
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

          {/* Logout / Encerrar Sessão */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-950/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors border border-transparent hover:border-rose-500/20"
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
