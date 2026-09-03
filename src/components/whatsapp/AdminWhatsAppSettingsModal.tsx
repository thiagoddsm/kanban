import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { EvolutionApiService, DEFAULT_EVOLUTION_CONFIG } from '../../services/evolutionApiService';
import { WhatsAppConnectCard } from './WhatsAppConnectCard';
import { EvolutionIntegrationConfig } from '../../types';
import { 
  X, 
  Settings2, 
  Smartphone, 
  Globe, 
  Key, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  BellRing,
  Sparkles
} from 'lucide-react';

interface AdminWhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminWhatsAppSettingsModal: React.FC<AdminWhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentOrganization, updateOrganization } = useTenant();
  const { success, error: notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState<'connect' | 'config'>('connect');

  const orgConfig = currentOrganization?.evolutionConfig || {};

  const [instanceName, setInstanceName] = useState(
    orgConfig.instanceName || DEFAULT_EVOLUTION_CONFIG.instanceName || 'IBM'
  );
  const [baseUrl, setBaseUrl] = useState(orgConfig.baseUrl || DEFAULT_EVOLUTION_CONFIG.baseUrl);
  const [apiKey, setApiKey] = useState(orgConfig.apiKey || DEFAULT_EVOLUTION_CONFIG.apiKey);
  const [isEnabled, setIsEnabled] = useState(orgConfig.isEnabled !== false);
  const [notifyOnTaskCreated, setNotifyOnTaskCreated] = useState(orgConfig.notifyOnTaskCreated !== false);
  const [notifyOnTaskBlocked, setNotifyOnTaskBlocked] = useState(orgConfig.notifyOnTaskBlocked !== false);
  const [notifyOnTaskApproved, setNotifyOnTaskApproved] = useState(orgConfig.notifyOnTaskApproved !== false);
  const [notifyOnMention, setNotifyOnMention] = useState(orgConfig.notifyOnMention !== false);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
      notifyError('Campos obrigatórios', 'Preencha a URL, a Chave de API e o Nome da Instância da Evolution.');
      return;
    }

    const updatedConfig: EvolutionIntegrationConfig = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      instanceName: instanceName.trim(),
      isEnabled,
      notifyOnTaskCreated,
      notifyOnTaskBlocked,
      notifyOnTaskApproved,
      notifyOnMention,
      updatedAt: new Date().toISOString(),
    };

    updateOrganization(currentOrganization.id, {
      evolutionConfig: updatedConfig,
    });

    success('Configurações salvas!', 'Integração Evolution API atualizada com sucesso.');
  };


  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  WhatsApp Geral da Organização
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  DISPARADOR OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Linha oficial de notificações da igreja / ministério via Evolution API
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'connect'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Conectar WhatsApp da Igreja</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Servidor & Regras de Disparo</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'connect' ? (
            <WhatsAppConnectCard
              instanceName={instanceName}
              title="Instância Oficial da Organização"
              subtitle="Conecte o número do WhatsApp da igreja/marketing para notificações gerais"
              badgeLabel="ORGANIZAÇÃO"
              configOverride={{
                baseUrl,
                apiKey,
                instanceName,
              }}
            />
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Configurações do Servidor Evolution API
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nome da Instância (ex: IBM)</span>
                  </label>
                  <input
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="IBM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nome da instância criada na sua Evolution API (padrão: <strong>IBM</strong>).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>URL Base da Evolution API</span>
                  </label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.ibmanha.com.br"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Token / Chave de API da Instância</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="554C767EA3D2-..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>


              {/* Automation Toggles */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-emerald-400" />
                  <span>Gatilhos de Notificação Automática</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-bold text-white block">Ativar Disparador do WhatsApp</span>
                      <span className="text-[11px] text-slate-400">Habilita o envio de mensagens pelo sistema</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={notifyOnTaskCreated}
                      onChange={(e) => setNotifyOnTaskCreated(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Nova Demanda Atribuída</span>
                      <span className="text-[11px] text-slate-400">Notifica o responsável quando uma demanda for criada para ele</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={notifyOnTaskBlocked}
                      onChange={(e) => setNotifyOnTaskBlocked(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Alerta de Demanda Bloqueada</span>
                      <span className="text-[11px] text-slate-400">Notifica o líder/requisitante quando a tarefa for travada por motivo externo</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={notifyOnTaskApproved}
                      onChange={(e) => setNotifyOnTaskApproved(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Aprovação / Conclusão</span>
                      <span className="text-[11px] text-slate-400">Notifica os envolvidos quando a demanda for aprovada/entregue</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={notifyOnMention}
                      onChange={(e) => setNotifyOnMention(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Notificação de @Menções (Fallback)</span>
                      <span className="text-[11px] text-slate-400">Dispara via WhatsApp da igreja caso o membro autor do comentário ainda não tenha pareado seu próprio WhatsApp</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
