import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { Campus } from '../../types';
import { 
  Building2, 
  MapPin, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Building
} from 'lucide-react';

interface EditCampusModalProps {
  campus: Campus | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditCampusModal: React.FC<EditCampusModalProps> = ({ campus, isOpen, onClose }) => {
  const { updateCampus, deleteCampus, campuses } = useTenant();
  const { error: notifyError } = useNotification();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isMainCampus, setIsMainCampus] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);

  useEffect(() => {
    if (campus) {
      setName(campus.name || '');
      setCode(campus.code || '');
      setCity(campus.city || '');
      setAddress(campus.address || '');
      setIsMainCampus(!!campus.isMainCampus);
      setIsConfirmDelete(false);
    }
  }, [campus, isOpen]);

  if (!isOpen || !campus) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      notifyError('Campos obrigatórios', 'Por favor preencha o nome e a sigla do campus.');
      return;
    }

    updateCampus(campus.id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      address: address.trim(),
      isMainCampus,
    });
    onClose();
  };

  const handleDelete = () => {
    if (campuses.length <= 1) {
      notifyError('Ação não permitida', 'Você não pode excluir o único campus da organização.');
      return;
    }

    const ok = deleteCampus(campus.id);
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Editar Campus / Unidade
              </h2>
              <p className="text-xs text-slate-400">
                Altere informações ou exclua esta unidade.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {isConfirmDelete ? (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Excluir Campus "{campus.name}"?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Esta ação removerá este campus permanentemente. As tarefas vinculadas a ele ficarão como institucionais.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                Sim, Excluir Campus
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome do Campus / Sede *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sede Principal, Unidade Zona Sul..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sigla / Código *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: SEDE, ZS, NORTE"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Niterói, São Paulo..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Endereço Completo
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Principal, 100 - Bairro"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isMainCampus"
                checked={isMainCampus}
                onChange={(e) => setIsMainCampus(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isMainCampus" className="text-xs text-slate-300 cursor-pointer select-none">
                Definir como Campus Principal (Sede)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmDelete(true)}
                disabled={campuses.length <= 1}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  campuses.length <= 1
                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`}
                title={campuses.length <= 1 ? 'Não é possível excluir o único campus' : 'Excluir campus'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
