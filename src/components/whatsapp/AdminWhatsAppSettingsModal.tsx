import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationContext';
import { useData } from '../../context/DataContext';
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
  Sparkles,
  Sun,
  Moon,
  Clock,
  AtSign
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
  const { triggerDeadlineRemindersNow } = useData();

  const [activeTab, setActiveTab] = useState<'connect' | 'config'>('connect');

  const orgConfig = currentOrganization?.evolutionConfig || {};

  const defaultInstanceName =
    orgConfig.instanceName ||
    EvolutionApiService.buildOrgInstanceName(currentOrganization?.name, currentOrganization?.slug);

  const [instanceName, setInstanceName] = useState(defaultInstanceName);
  const [baseUrl, setBaseUrl] = useState(orgConfig.baseUrl || DEFAULT_EVOLUTION_CONFIG.baseUrl);
  const [apiKey, setApiKey] = useState(orgConfig.apiKey || DEFAULT_EVOLUTION_CONFIG.apiKey);
  const [isEnabled, setIsEnabled] = useState(orgConfig.isEnabled !== false);
  const [notifyOnTaskCreated, setNotifyOnTaskCreated] = useState(orgConfig.notifyOnTaskCreated === true);
  const [notifyOnTaskBlocked, setNotifyOnTaskBlocked] = useState(orgConfig.notifyOnTaskBlocked !== false);
  const [notifyOnTaskApproved, setNotifyOnTaskApproved] = useState(orgConfig.notifyOnTaskApproved !== false);
  const [notifyOnMention, setNotifyOnMention] = useState(orgConfig.notifyOnMention !== false);
  const [notifyOnChecklistUpdate, setNotifyOnChecklistUpdate] = useState(orgConfig.notifyOnChecklistUpdate === true);
  
  // Resumos Diários Consolidados (Manhã e Fim do Dia)
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(
    orgConfig.dailyDigestEnabled !== undefined
      ? orgConfig.dailyDigestEnabled
      : orgConfig.notifyOnDeadlineApproaching !== false
  );
  const [dailyDigestTimeMorning, setDailyDigestTimeMorning] = useState(
    orgConfig.dailyDigestTimeMorning || orgConfig.deadlineNotificationTime || '08:30'
  );
  const [enableEveningDigest, setEnableEveningDigest] = useState(orgConfig.enableEveningDigest !== false);
  const [dailyDigestTimeEvening, setDailyDigestTimeEvening] = useState(
    orgConfig.dailyDigestTimeEvening || '17:30'
  );

  const [enableWhatsAppReplies, setEnableWhatsAppReplies] = useState(orgConfig.enableWhatsAppReplies !== false);
  const [sendCommentReplyConfirmation, setSendCommentReplyConfirmation] = useState(orgConfig.sendCommentReplyConfirmation !== false);
  const [isTriggeringDeadlines, setIsTriggeringDeadlines] = useState(false);

  React.useEffect(() => {
    const config = currentOrganization?.evolutionConfig || {};
    setInstanceName(
      config.instanceName ||
      EvolutionApiService.buildOrgInstanceName(currentOrganization?.name, currentOrganization?.slug)
    );
    setBaseUrl(config.baseUrl || DEFAULT_EVOLUTION_CONFIG.baseUrl);
    setApiKey(config.apiKey || DEFAULT_EVOLUTION_CONFIG.apiKey);
    setIsEnabled(config.isEnabled !== false);
    setNotifyOnTaskCreated(config.notifyOnTaskCreated === true);
    setNotifyOnTaskBlocked(config.notifyOnTaskBlocked !== false);
    setNotifyOnTaskApproved(config.notifyOnTaskApproved !== false);
    setNotifyOnMention(config.notifyOnMention !== false);
    setNotifyOnChecklistUpdate(config.notifyOnChecklistUpdate === true);
    setDailyDigestEnabled(
      config.dailyDigestEnabled !== undefined
        ? config.dailyDigestEnabled
        : config.notifyOnDeadlineApproaching !== false
    );
    setDailyDigestTimeMorning(
      config.dailyDigestTimeMorning || config.deadlineNotificationTime || '08:30'
    );
    setEnableEveningDigest(config.enableEveningDigest !== false);
    setDailyDigestTimeEvening(config.dailyDigestTimeEvening || '17:30');
    setEnableWhatsAppReplies(config.enableWhatsAppReplies !== false);
    setSendCommentReplyConfirmation(config.sendCommentReplyConfirmation !== false);
  }, [currentOrganization]);

  if (!isOpen) return null;

  const handleTriggerDeadlinesNow = async () => {
    try {
      setIsTriggeringDeadlines(true);
      const count = await triggerDeadlineRemindersNow();
      if (count > 0) {
        success('Resumos Diários Enviados!', `Foram disparadas mensagens consolidadas para ${count} responsável(eis).`);
      } else {
        notifyError('Nenhum resumo pendente', 'Não há demandas vencendo, criadas ou alteradas nas últimas 24h para os responsáveis cadastrados.');
      }
    } catch (err: any) {
      notifyError('Erro ao disparar', err?.message || 'Falha ao processar resumo diário.');
    } finally {
      setIsTriggeringDeadlines(false);
    }
  };

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
      notifyOnChecklistUpdate,
      // Suporte e retrocompatibilidade com resumos diários
      notifyOnDeadlineApproaching: dailyDigestEnabled,
      deadlineNotificationTime: dailyDigestTimeMorning,
      dailyDigestEnabled,
      dailyDigestTimeMorning,
      enableEveningDigest,
      dailyDigestTimeEvening,
      enableWhatsAppReplies,
      sendCommentReplyConfirmation,
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
                    <span>Nome da Instância (ex: Oiko_Gestao_Nome_Da_Igreja)</span>
                  </label>
                  <input
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="Oiko_Gestao_Minha_Igreja"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nome dinâmico da instância criada para esta organização (padrão: <strong>Oiko_Gestao_Nome_Da_Igreja</strong>).
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
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-emerald-400" />
                    <span>Regras de Notificação & Disparo</span>
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Master Switch */}
                  <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/15 transition-colors">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      className="rounded text-emerald-600 bg-slate-900 border-slate-700 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-emerald-300 block text-xs">Ativar Disparador do WhatsApp</span>
                      <span className="text-[11px] text-emerald-400/80">Habilita o envio automático de mensagens para a equipe</span>
                    </div>
                  </label>

                  {/* 1. NOTIFICAÇÕES EM TEMPO REAL (IMEDIATAS) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <AtSign className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Notificações Imediatas (Na Hora)</span>
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        TEMPO REAL
                      </span>
                    </div>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={notifyOnMention}
                        onChange={(e) => setNotifyOnMention(e.target.checked)}
                        className="rounded text-indigo-600 bg-slate-900 border-slate-700 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-white block">@Menções nos Comentários</span>
                        <span className="text-[11px] text-slate-400">
                          Dispara na hora no WhatsApp quando um membro for mencionado com <strong className="text-indigo-300">@Nome</strong>
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={notifyOnTaskBlocked}
                        onChange={(e) => setNotifyOnTaskBlocked(e.target.checked)}
                        className="rounded text-amber-500 bg-slate-900 border-slate-700 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-200 block">Alerta de Demanda Bloqueada</span>
                        <span className="text-[11px] text-slate-400">Notifica líder/requisitante quando a tarefa for travada</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={notifyOnTaskApproved}
                        onChange={(e) => setNotifyOnTaskApproved(e.target.checked)}
                        className="rounded text-emerald-600 bg-slate-900 border-slate-700 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-200 block">Aprovação / Conclusão</span>
                        <span className="text-[11px] text-slate-400">Notifica quando a demanda for aprovada ou concluída</span>
                      </div>
                    </label>

                    <div className="pt-2 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/30 border border-slate-800/50 cursor-pointer hover:bg-slate-800/30">
                        <input
                          type="checkbox"
                          checked={notifyOnTaskCreated}
                          onChange={(e) => setNotifyOnTaskCreated(e.target.checked)}
                          className="rounded text-emerald-600 bg-slate-900 border-slate-700 mt-0.5"
                        />
                        <div>
                          <span className="font-medium text-slate-300 block text-[11px]">Nova Demanda Avulsa</span>
                          <span className="text-[10px] text-slate-500">Desmarcado = agrupa no resumo do dia</span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/30 border border-slate-800/50 cursor-pointer hover:bg-slate-800/30">
                        <input
                          type="checkbox"
                          checked={notifyOnChecklistUpdate}
                          onChange={(e) => setNotifyOnChecklistUpdate(e.target.checked)}
                          className="rounded text-emerald-600 bg-slate-900 border-slate-700 mt-0.5"
                        />
                        <div>
                          <span className="font-medium text-slate-300 block text-[11px]">Subtarefa Avulsa (Checklist)</span>
                          <span className="text-[10px] text-slate-500">Desmarcado = evita spam a cada clique</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 2. RESUMO DIÁRIO CONSOLIDADO (1 OU 2 MOMENTOS DO DIA) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dailyDigestEnabled}
                          onChange={(e) => setDailyDigestEnabled(e.target.checked)}
                          className="rounded text-emerald-600 bg-slate-900 border-slate-700 w-4 h-4"
                        />
                        <div>
                          <span className="font-bold text-white block">Resumo Diário Consolidado</span>
                          <span className="text-[11px] text-slate-400">
                            Envia 1 ou 2 briefings por dia com: 🚨 Vencendo, 🆕 Novas demandas e 📝 O que foi alterado
                          </span>
                        </div>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        1 A 2X AO DIA
                      </span>
                    </div>

                    {dailyDigestEnabled && (
                      <div className="pt-3 border-t border-slate-800/70 space-y-3 pl-1 sm:pl-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Momento 1: Manhã */}
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4 text-amber-400" />
                              <div>
                                <span className="font-semibold text-slate-200 block text-xs">1º Momento: Manhã</span>
                                <span className="text-[10px] text-slate-400">Briefing matinal</span>
                              </div>
                            </div>
                            <input
                              type="time"
                              value={dailyDigestTimeMorning}
                              onChange={(e) => setDailyDigestTimeMorning(e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          {/* Momento 2: Tarde */}
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={enableEveningDigest}
                                onChange={(e) => setEnableEveningDigest(e.target.checked)}
                                className="rounded text-indigo-500 bg-slate-950 border-slate-700"
                              />
                              <div className="flex items-center gap-1.5">
                                <Moon className="w-4 h-4 text-indigo-400" />
                                <div>
                                  <span className="font-semibold text-slate-200 block text-xs">2º Momento: Tarde</span>
                                  <span className="text-[10px] text-slate-400">Balanço do dia</span>
                                </div>
                              </div>
                            </label>
                            {enableEveningDigest && (
                              <input
                                type="time"
                                value={dailyDigestTimeEvening}
                                onChange={(e) => setDailyDigestTimeEvening(e.target.value)}
                                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Execução com trava distribuída (garante envio único por dia mesmo com múltiplas abas abertas)
                          </span>
                          <button
                            type="button"
                            disabled={isTriggeringDeadlines}
                            onClick={handleTriggerDeadlinesNow}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            <BellRing className={`w-3.5 h-3.5 ${isTriggeringDeadlines ? 'animate-bounce' : ''}`} />
                            <span>{isTriggeringDeadlines ? 'Disparando...' : 'Disparar Resumo Agora'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. RESPOSTAS & COMANDOS PELO WHATSAPP (BIDIRECIONAL) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableWhatsAppReplies}
                        onChange={(e) => setEnableWhatsAppReplies(e.target.checked)}
                        className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                      />
                      <div>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Respostas & Comandos pelo WhatsApp (Bidirecional)</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Permite responder no WhatsApp para comentar na tarefa (#T-código:), alterar status (1, 2, 3) ou marcar checklist
                        </span>
                      </div>
                    </label>

                    {enableWhatsAppReplies && (
                      <div className="pt-2 pl-6 border-t border-slate-800/60">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sendCommentReplyConfirmation}
                            onChange={(e) => setSendCommentReplyConfirmation(e.target.checked)}
                            className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                          />
                          <div>
                            <span className="text-xs font-medium text-slate-300 block">Enviar confirmação "💬 Comentário Registrado!"</span>
                            <span className="text-[10px] text-slate-500 block">
                              Desmarque para silenciar mensagens extras de confirmação no WhatsApp
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
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
