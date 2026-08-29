import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { TenantPlan } from '../../types';
import { X, Building2, MapPin, Sparkles, CheckCircle2, ShieldCheck, Crown } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { createOrganization } = useTenant();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [mainCampusName, setMainCampusName] = useState('Sede');
  const [city, setCity] = useState('São Paulo - SP');
  const [plan, setPlan] = useState<TenantPlan>('PRO');

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    createOrganization(name.trim(), slug.trim(), mainCampusName.trim(), city.trim(), plan);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Crown className="w-3.5 h-3.5" />
            <span>SaaS Multi-Tenant Onboarding</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Criar Nova Igreja / Organização
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre uma nova congregação com estrutura isolada de múltiplos campi, tarefas, eventos e equipe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Church / Org Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome da Igreja ou Ministério *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Igreja Batista da Aliança"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>

          {/* Slug / Subdomain */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Identificador / Slug URL *
            </label>
            <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 overflow-hidden px-3.5 py-2 focus-within:border-indigo-500">
              <span className="text-xs text-slate-500 mr-1 select-none">marketing.app/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="alianca"
                className="w-full bg-transparent text-xs text-indigo-300 font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* First Campus & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome do Campus Principal *
              </label>
              <input
                type="text"
                required
                value={mainCampusName}
                onChange={(e) => setMainCampusName(e.target.value)}
                placeholder="Ex: Sede ou Campus Central"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cidade / Estado *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Curitiba - PR"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Plano de Assinatura
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { plan: 'STARTER' as const, label: 'Starter', desc: 'Até 2 campi, 15 membros' },
                { plan: 'PRO' as const, label: 'Pro (Recomendado)', desc: 'Até 10 campi, 50 membros' },
                { plan: 'ENTERPRISE' as const, label: 'Enterprise', desc: 'Campi e membros ilimitados' },
              ].map((p) => (
                <div
                  key={p.plan}
                  onClick={() => setPlan(p.plan)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-left ${
                    plan === p.plan
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold block text-white">{p.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-snug">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Criar Organização</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
