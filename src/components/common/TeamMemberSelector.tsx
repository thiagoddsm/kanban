import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { Search, Check, X, Users, UserCheck } from 'lucide-react';

interface TeamMemberSelectorProps {
  users: User[];
  selectedUserIds: string[];
  onChange: (selectedIds: string[]) => void;
  label?: string;
  maxHeight?: string;
}

export const TeamMemberSelector: React.FC<TeamMemberSelectorProps> = ({
  users,
  selectedUserIds,
  onChange,
  label = 'Equipe Designada',
  maxHeight = 'max-h-60',
}) => {
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUsers = useMemo(() => {
    return users.filter((u) => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  const handleToggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const handleSelectAll = () => {
    onChange(users.map((u) => u.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2.5">
      {/* Header with Title and Quick Select Actions */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {selectedUserIds.length} selecionado{selectedUserIds.length !== 1 ? 's' : ''}
          </span>
        </label>

        <div className="flex items-center gap-2 text-[11px]">
          {selectedUserIds.length < users.length && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Selecionar todos
            </button>
          )}
          {selectedUserIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-400 font-medium transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Selected Members Chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-slate-950/60 border border-slate-800">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-medium animate-fade-in"
            >
              <img
                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={u.name}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="truncate max-w-[110px]">{u.name.split(' ')[0]}</span>
              <button
                type="button"
                onClick={() => handleToggle(u.id)}
                className="hover:text-white transition-colors"
                title="Remover"
              >
                <X className="w-3 h-3 text-indigo-400 hover:text-white" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar voluntário ou líder pelo nome ou e-mail..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Scrollable Members List with Checkboxes */}
      <div className={`${maxHeight} overflow-y-auto custom-scrollbar space-y-1 rounded-2xl bg-slate-950/40 border border-slate-800 p-2`}>
        {filteredUsers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Nenhum membro encontrado para "{search}".
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelected = selectedUserIds.includes(u.id);

            return (
              <div
                key={u.id}
                onClick={() => handleToggle(u.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={u.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {u.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>

                {/* Custom Checkbox */}
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-700 bg-slate-800 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
