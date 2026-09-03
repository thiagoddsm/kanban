import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { UserRole } from '../../types';
import { ChevronDown, LogIn, LogOut, UserCog, Building2 } from 'lucide-react';
import { MyAccountModal } from './MyAccountModal';

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  LEADER: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  TEAM: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  REQUESTER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

export const RoleSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { currentRole } = useAccess();
  const { currentOrganization } = useTenant();
  const { success } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [isMyAccountOpen, setIsMyAccountOpen] = useState(false);
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

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    success('Sessão encerrada com sucesso!');
    navigate('/login');
  };

  if (!currentUser) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Fazer Login</span>
      </button>
    );
  }

  const roleBadgeColor = ROLE_COLORS[currentRole] || ROLE_COLORS.REQUESTER;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all text-xs"
        title="Minha Conta"
      >
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadgeColor}`}>
          {currentRole}
        </span>
        <span className="font-semibold text-slate-200 hidden md:inline truncate max-w-[140px]">
          {currentUser?.name || 'Usuário'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-slide-down space-y-3">
          {/* User Profile Card */}
          <div 
            onClick={() => {
              setIsOpen(false);
              setIsMyAccountOpen(true);
            }}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 flex items-center gap-3 cursor-pointer transition-colors group"
            title="Clique para gerenciar sua conta"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser?.name || 'Membro'}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-400 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                  {currentUser?.name || 'Usuário'}
                </h4>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${roleBadgeColor}`}>
                  {currentRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || ''}</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-400 font-medium truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentOrganization?.name || 'Organização'}</span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsMyAccountOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-white bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 transition-all shadow-sm"
            >
              <UserCog className="w-4 h-4 text-indigo-400" />
              <span>Minha Conta</span>
            </button>
          </div>

          {/* Logout / Encerrar Sessão */}
          <div className="pt-1 border-t border-slate-800">
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

      {/* Modal Minha Conta & Perfil */}
      <MyAccountModal
        isOpen={isMyAccountOpen}
        onClose={() => setIsMyAccountOpen(false)}
      />
    </div>
  );
};
