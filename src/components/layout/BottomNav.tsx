import React from 'react';
import { LayoutDashboard, Kanban, Plus, Calendar, User, Sparkles } from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onOpenDemandPortal: () => void;
  onOpenMyAccount: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigate,
  onOpenDemandPortal,
  onOpenMyAccount,
}) => {
  const { currentUser } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around select-none">
      {/* 1. Painel */}
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
          activeTab === 'dashboard'
            ? 'text-indigo-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200 text-xs'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Painel</span>
      </button>

      {/* 2. Kanban */}
      <button
        onClick={() => onNavigate('tasks')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
          activeTab === 'tasks'
            ? 'text-indigo-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200 text-xs'
        }`}
      >
        <Kanban className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Kanban</span>
      </button>

      {/* 3. Central Action: + Solicitar */}
      <button
        onClick={onOpenDemandPortal}
        className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
        title="Solicitar Nova Demanda"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 group-active:scale-90 group-hover:shadow-indigo-500/60 transition-all border-2 border-slate-900">
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-bold text-indigo-400 mt-0.5">Demanda</span>
      </button>

      {/* 4. Eventos */}
      <button
        onClick={() => onNavigate('events')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
          activeTab === 'events'
            ? 'text-indigo-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200 text-xs'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] tracking-tight">Eventos</span>
      </button>

      {/* 5. Minha Conta / Perfil */}
      <button
        onClick={onOpenMyAccount}
        className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all text-slate-400 hover:text-slate-200"
      >
        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-5 h-5 rounded-full object-cover border border-slate-700"
          />
        ) : (
          <User className="w-5 h-5" />
        )}
        <span className="text-[10px] tracking-tight">Conta</span>
      </button>
    </nav>
  );
};
