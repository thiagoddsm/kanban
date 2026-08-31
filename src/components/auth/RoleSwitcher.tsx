import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { useTenant } from '../../context/TenantContext';
import { Shield, ChevronDown, Check, LogIn, LogOut, UserPlus, UserCheck } from 'lucide-react';
import { AuthModal } from './AuthModal';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { currentRole } = useAccess();
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all text-xs"
        title="Minha Conta & Permissões"
      >
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border text-rose-400 bg-rose-500/10 border-rose-500/30">
          {currentRole}
        </span>
        <span className="font-semibold text-slate-200 hidden md:inline truncate max-w-[140px]">
          {currentUser.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-slide-down space-y-3">
          {/* User Profile Card */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                {currentOrganization.name}
              </span>
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

          {/* Logout */}
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
