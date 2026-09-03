import React, { useState, useEffect, useRef } from 'react';
import { EvolutionApiService } from '../../services/evolutionApiService';
import { EvolutionIntegrationConfig } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Send, 
  Sparkles,
  Wifi,
  WifiOff,
  PhoneCall
} from 'lucide-react';

interface WhatsAppConnectCardProps {
  instanceName: string;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  configOverride?: EvolutionIntegrationConfig;
  defaultPhone?: string;
  onConnectedChange?: (connected: boolean, phoneNumber?: string) => void;
}

export const WhatsAppConnectCard: React.FC<WhatsAppConnectCardProps> = ({
  instanceName,
  title = 'Conexão WhatsApp',
  subtitle = 'Conecte seu WhatsApp para disparos e notificações automáticas',
  badgeLabel = 'INSTÂNCIA',
  configOverride,
  defaultPhone,
  onConnectedChange,
}) => {
  const { success, error: notifyError, info } = useNotification();

  const [state, setState] = useState<'open' | 'connecting' | 'close' | 'not_found' | 'error' | 'checking'>('checking');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | undefined>();
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [testPhone, setTestPhone] = useState(defaultPhone || '');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    setState('checking');
    const res = await EvolutionApiService.getConnectionState(instanceName, configOverride);
    setState(res.state);
    if (res.phoneNumber) setPhoneNumber(res.phoneNumber);

    const isConnected = res.state === 'open';
    if (onConnectedChange) {
      onConnectedChange(isConnected, res.phoneNumber);
    }
  };

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [instanceName]);

  // Handle QR Generation & Polling
  const handleGenerateQr = async () => {
    setIsLoadingQr(true);
    setQrBase64(null);
    setPairingCode(undefined);

    const res = await EvolutionApiService.getQrCode(instanceName, configOverride);
    setIsLoadingQr(false);

    if (!res.success) {
      notifyError('Erro ao gerar QR Code', res.error || 'Falha ao conectar com Evolution API');
      return;
    }

    if (res.base64) {
      setQrBase64(res.base64);
      setPairingCode(res.pairingCode);
      setState('connecting');
      info('QR Code gerado!', 'Aponte a câmera do seu WhatsApp para conectar.');

      // Inicia polling a cada 3.5 segundos para detectar pareamento
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const stateRes = await EvolutionApiService.getConnectionState(instanceName, configOverride);
        if (stateRes.state === 'open') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setState('open');
          setQrBase64(null);
          setPhoneNumber(stateRes.phoneNumber);
          success('WhatsApp Conectado com Sucesso!', `Instância ${instanceName} ativa.`);
          if (onConnectedChange) {
            onConnectedChange(true, stateRes.phoneNumber);
          }
        }
      }, 3500);
    } else if (res.state === 'open') {
      setState('open');
      setQrBase64(null);
      success('WhatsApp já está conectado!', `Instância ${instanceName} ativa.`);
      if (onConnectedChange) {
        onConnectedChange(true);
      }
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar esta sessão do WhatsApp?')) return;
    if (pollingRef.current) clearInterval(pollingRef.current);

    const res = await EvolutionApiService.logoutInstance(instanceName, configOverride);
    if (res.success) {
      setState('close');
      setQrBase64(null);
      setPhoneNumber(undefined);
      success('WhatsApp Desconectado com sucesso.');
      if (onConnectedChange) {
        onConnectedChange(false);
      }
    } else {
      notifyError('Erro ao desconectar', res.error || 'Tente novamente');
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      notifyError('Telefone obrigatório', 'Informe o número com DDD para o teste.');
      return;
    }

    setIsSendingTest(true);
    const text = `🚀 *Teste de Integração Kanban Oiko*\n\nSeu WhatsApp está conectado e funcionando perfeitamente via Evolution API! 🎉\n\n_Horário: ${new Date().toLocaleTimeString('pt-BR')}_`;

    const res = await EvolutionApiService.sendTextMessage({
      instanceName,
      to: testPhone.trim(),
      text,
      configOverride,
    });

    setIsSendingTest(false);
    if (res.success) {
      success('Mensagem de teste enviada!', `Enviada com sucesso para ${testPhone}.`);
    } else {
      notifyError('Falha no envio do teste', res.error || 'Verifique se o número está correto e se o WhatsApp está conectado.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Instructions Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Como conectar seu WhatsApp:</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              1
            </span>
            <span>Abra o <strong>WhatsApp</strong> no celular</span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              2
            </span>
            <span>Toque em <strong>Aparelhos Conectados</strong></span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              3
            </span>
            <span>Toque em <strong>Conectar um aparelho</strong></span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
              4
            </span>
            <span>Aponte a câmera para o <strong>QR Code</strong> abaixo</span>
          </div>
        </div>
      </div>

      {/* Instance & QR Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {badgeLabel}
              </span>
              <h3 className="text-sm font-bold text-white">{title}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Instância: <strong className="text-slate-200">{instanceName}</strong>
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {state === 'open' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-fade-in">
                <Wifi className="w-3.5 h-3.5" />
                <span>Conectado</span>
              </span>
            ) : state === 'connecting' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Aguardando QR Code</span>
              </span>
            ) : state === 'checking' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Desconectado</span>
              </span>
            )}

            <button
              onClick={checkStatus}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Atualizar Status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Connected Details or QR Code View */}
        {state === 'open' ? (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sessão Ativa & Pronta</h4>
                  <p className="text-xs text-emerald-400/90 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>{phoneNumber ? `+${phoneNumber}` : 'Disparador pronto para envio'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar WhatsApp</span>
              </button>
            </div>

            {/* Test message form */}
            <form onSubmit={handleSendTest} className="pt-3 border-t border-emerald-500/20 flex items-center gap-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Enviar teste para (Ex: 11999998888)"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSendingTest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Enviar Teste</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center p-6 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 space-y-4">
            {qrBase64 ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-2xl inline-block border-2 border-emerald-500 animate-scale-in">
                  <img
                    src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                    alt="QR Code WhatsApp"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                  />
                </div>
                {pairingCode && (
                  <p className="text-xs text-slate-300">
                    Código de pareamento alternativo: <strong className="text-emerald-400 font-mono tracking-wider">{pairingCode}</strong>
                  </p>
                )}
                <p className="text-xs text-slate-400 animate-pulse">
                  Aguardando leitura do QR Code no aplicativo...
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Nenhum WhatsApp Conectado</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Clique no botão abaixo para gerar o QR Code de autenticação e vincular seu número.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateQr}
              disabled={isLoadingQr}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all"
            >
              {isLoadingQr ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando QR Code...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>{qrBase64 ? 'Atualizar QR Code' : 'Gerar QR Code de Conexão'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
