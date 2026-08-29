import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { AutomationEngine } from '../../services/automationEngine';
import { AutomationRule } from '../../types';
import { 
  X, 
  Wand2, 
  Zap, 
  Check, 
  Bell, 
  Calendar, 
  ShieldAlert, 
  Sparkles, 
  UserCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface AutomationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const { currentOrganization } = useTenant();
  const { isLeader } = useAccess();

  const [rules, setRules] = useState<AutomationRule[]>(() =>
    AutomationEngine.getRules(currentOrganization.id)
  );

  const handleToggle = (ruleId: string, currentActive: boolean) => {
    if (!isLeader) return;
    const updated = AutomationEngine.toggleRule(currentOrganization.id, ruleId, !currentActive);
    setRules(updated);
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'TASK_ASSIGNED':
        return <UserCheck className="w-4 h-4 text-indigo-400" />;
      case 'TASK_BLOCKED':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'TASK_REVIEW':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'EVENT_APPROACHING':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 p-6 sm:p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Motor de Automação & Notificações</span>
          </div>
          <h2 className="text-xl font-bold text-white">Regras Operacionais Automáticas</h2>
          <p className="text-xs text-slate-400 mt-1">
            Garante que prazos, aprovações e bloqueios nunca dependam de lembrança manual.
          </p>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                rule.active
                  ? 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/40'
                  : 'bg-slate-950/20 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-850 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  {getTriggerIcon(rule.trigger)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white leading-snug">{rule.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gatilho: <strong className="text-cyan-300 font-mono">{rule.trigger}</strong>
                  </p>
                  {rule.actions.map((act, idx) => (
                    <p key={idx} className="text-[10px] text-slate-500 mt-0.5 italic">
                      &rarr; Ação: {act.templateMessage}
                    </p>
                  ))}
                </div>
              </div>

              {/* Toggle switch */}
              {isLeader && (
                <button
                  type="button"
                  onClick={() => handleToggle(rule.id, rule.active)}
                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                  title={rule.active ? 'Desativar Automação' : 'Ativar Automação'}
                >
                  {rule.active ? (
                    <ToggleRight className="w-8 h-8 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
