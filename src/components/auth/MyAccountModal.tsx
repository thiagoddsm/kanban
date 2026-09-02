import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useAccess } from '../../context/AccessContext';
import { useNotification } from '../../context/NotificationContext';
import { 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  Shield, 
  Key, 
  Camera, 
  X, 
  Check, 
  Sparkles, 
  Building2, 
  Bell, 
  Send,
  ExternalLink,
  Smartphone
} from 'lucide-react';

interface MyAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
];

export const MyAccountModal: React.FC<MyAccountModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile, resetPassword } = useAuth();
  const { currentOrganization } = useTenant();
  const { currentRole } = useAccess();
  const { success, error: notifyError, info } = useNotification();

  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'security'>('profile');

  // Form states
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || '');
      setPhone(currentUser.phone || '');
      setWhatsapp(currentUser.whatsapp || currentUser.phone || '');
      setNotifyWhatsApp(currentUser.notifyWhatsApp ?? true);
      setNotifyEmail(currentUser.notifyEmail ?? true);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notifyError('Campo obrigatório', 'O nome não pode ficar em branco.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        avatar: avatar.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        notifyWhatsApp,
        notifyEmail,
      });
      success('Perfil atualizado com sucesso!', 'Suas alterações foram salvas na nuvem.');
      onClose();
    } catch (err: any) {
      notifyError('Erro ao salvar perfil', err?.message || 'Tente novamente em instantes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!currentUser.email) return;
    setIsSendingReset(true);
    try {
      await resetPassword(currentUser.email);
      info('Link Enviado!', `Enviamos as instruções de redefinição para ${currentUser.email}.`);
    } catch (err: any) {
      notifyError('Erro ao enviar e-mail', err?.message || 'Verifique seu e-mail e tente novamente.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Minha Conta & Perfil
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie seus dados pessoais, foto, WhatsApp e segurança.
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil & Dados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp & Alertas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-500/30">
              Em Breve
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Segurança</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-1">
          {/* TAB 1: Profile & Personal Info */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Foto de Perfil / Avatar
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/50 shadow-md shrink-0"
                  />
                  <div className="space-y-2 flex-1 min-w-0">
                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="URL da imagem (https://...)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {/* Preset Avatars */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-500">Escolha rápida:</span>
                      <div className="flex items-center gap-1.5">
                        {PRESET_AVATARS.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(url)}
                            className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-all"
                          >
                            <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Email (Read-only for security) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  E-mail da Conta
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/30 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  O e-mail é o identificador único de acesso autenticado.
                </span>
              </div>

              {/* Organization & Role Badge */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-white">{currentOrganization.name}</p>
                    <span className="text-[10px] text-slate-400">Organização Ativa</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {currentRole}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: WhatsApp & Notifications */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-fade-in">
              {/* WhatsApp Feature Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Conexão Direta via WhatsApp (Em Breve)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Receba avisos instantâneos quando uma demanda for atribuída a você, quando um pastor aprovar sua entrega ou quando um prazo estiver próximo.
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Cadastre seu número abaixo para liberação antecipada
                  </span>
                </div>
              </div>

              {/* WhatsApp Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Número do WhatsApp (com DDD)
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Seus dados são protegidos e usados apenas para notificações operacionais da sua igreja.
                </span>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Preferências de Notificação
                </h5>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">Alertas de Tarefas no WhatsApp</p>
                    <p className="text-[10px] text-slate-400">Avisos de novas demandas atribuídas e aprovações</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyWhatsApp}
                    onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">Notificações por E-mail</p>
                    <p className="text-[10px] text-slate-400">Receber resumo semanal e convites de projetos</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Key className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Alteração de Senha
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para sua segurança, enviamos um link criptografado e seguro para o seu e-mail cadastrado ({currentUser.email}) para redefinir sua senha de acesso.
                </p>
                <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={handleSendPasswordReset}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReset ? 'Enviando...' : 'Enviar E-mail de Redefinição de Senha'}</span>
                </button>
              </div>

              {/* Account Metadata */}
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Detalhes Técnicos da Conta
                </h5>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ID do Usuário (UID):</span>
                    <code className="text-slate-300 text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {currentUser.id}
                    </code>
                  </div>
                  {currentUser.createdAt && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Membro desde:</span>
                      <span className="text-slate-300 font-medium">
                        {new Date(currentUser.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
