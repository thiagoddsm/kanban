import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  User,
  ArrowRight, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  UserCheck,
  LogIn
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    signUpWithEmail,
    resetPassword, 
    isLoadingAuth, 
    authError, 
    setAuthError 
  } = useAuth();
  const { currentOrganization, findAndSwitchUserOrg } = useTenant();
  const { success } = useNotification();

  // Tab State: 'login' | 'first-access'
  const initialTab = searchParams.get('tab') === 'primeiro-acesso' || searchParams.get('tab') === 'first-access' || searchParams.get('invite')
    ? 'first-access'
    : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'first-access'>(initialTab);

  // Common & Login Fields
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First Access Specific Fields
  const [firstAccessName, setFirstAccessName] = useState('');
  const [firstAccessEmail, setFirstAccessEmail] = useState(() => searchParams.get('email') || '');
  const [firstAccessPassword, setFirstAccessPassword] = useState('');
  const [firstAccessConfirmPassword, setFirstAccessConfirmPassword] = useState('');
  const [showFirstAccessPassword, setShowFirstAccessPassword] = useState(false);

  // Forgot Password State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Update fields if search params change
  useEffect(() => {
    const qTab = searchParams.get('tab');
    const qEmail = searchParams.get('email');
    if (qTab === 'primeiro-acesso' || qTab === 'first-access' || searchParams.get('invite')) {
      setActiveTab('first-access');
    }
    if (qEmail) {
      setEmail(qEmail);
      setFirstAccessEmail(qEmail);
    }
  }, [searchParams]);

  const handleTabSwitch = (newTab: 'login' | 'first-access') => {
    setActiveTab(newTab);
    if (authError) setAuthError(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      const loggedUser = await loginWithEmail(email.trim(), password);
      success('Login realizado com sucesso!');
      const targetOrg = loggedUser ? await findAndSwitchUserOrg(loggedUser.id) : currentOrganization;
      navigate(`/${targetOrg?.slug || currentOrganization.slug || 'minha-igreja'}/dashboard`);
    } catch {
      // Error message is set in AuthContext
    }
  };

  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstAccessEmail.trim() || !firstAccessPassword) return;

    if (firstAccessPassword !== firstAccessConfirmPassword) {
      setAuthError('As senhas digitadas não coincidem.');
      return;
    }

    if (firstAccessPassword.length < 6) {
      setAuthError('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    try {
      const finalName = firstAccessName.trim() || firstAccessEmail.trim().split('@')[0];
      const newUser = await signUpWithEmail(finalName, firstAccessEmail.trim(), firstAccessPassword);
      success('Primeiro acesso concluído!', 'Sua conta foi ativada e vinculada à sua equipe.');
      const targetOrg = newUser ? await findAndSwitchUserOrg(newUser.id) : currentOrganization;
      navigate(`/${targetOrg?.slug || currentOrganization.slug || 'minha-igreja'}/dashboard`);
    } catch (err: any) {
      if (err?.message?.includes('Já existe uma conta') || err?.message?.includes('email-already-in-use')) {
        setAuthError('Este e-mail já possui uma conta ativa. Acesse a aba "Já Tenho Conta" para entrar ou redefina sua senha.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      success('Autenticação via Google realizada!', 'Seu perfil foi vinculado com sucesso.');
      const targetOrg = loggedUser ? await findAndSwitchUserOrg(loggedUser.id) : currentOrganization;
      navigate(`/${targetOrg?.slug || currentOrganization.slug || 'minha-igreja'}/dashboard`);
    } catch {
      // Handled in context
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      await resetPassword(forgotEmail.trim());
      setForgotSuccess(`Enviamos um link de recuperação para o e-mail: ${forgotEmail.trim()}`);
    } catch {
      // Handled in context
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-b from-indigo-600/15 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header Back Button */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Página Inicial</span>
        </Link>
        <Link
          to="/signup"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Criar Nova Igreja →
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Logo & Title */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeTab === 'login' ? 'Acesse sua Conta' : 'Primeiro Acesso'}
            </h1>
            <p className="text-xs text-slate-400">
              {activeTab === 'login' 
                ? 'Oiko Gestão Integrada • Painel da Equipe' 
                : 'Ative sua conta cadastrada pela liderança'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Já Tenho Conta</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('first-access')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'first-access'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Primeiro Acesso</span>
            </button>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 space-y-1">
                <div>
                  <span className="font-bold">Aviso: </span>
                  <span>{authError}</span>
                </div>
                {authError.includes('Já existe uma conta') && (
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('login')}
                    className="text-xs text-indigo-300 hover:text-white font-bold underline"
                  >
                    Clique aqui para fazer login →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: REGULAR LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoadingAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.54 0 2.9.55 3.97 1.45l2.97-2.97C17.13 1.8 14.73 1 12 1 7.37 1 3.48 3.65 1.63 7.51l3.57 2.77C6.07 7.4 8.79 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.87c2.16-1.99 3.73-4.94 3.73-8.69z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.2 14.72c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L1.63 7.77C.59 9.87 0 12.22 0 14.72s.59 4.85 1.63 6.95l3.57-2.77z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.87c-1.08.72-2.45 1.16-4.24 1.16-3.21 0-5.93-2.4-6.8-5.28L1.63 16.37C3.48 20.23 7.37 23.5 12 23.5z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ou com e-mail e senha
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="seuemail@exemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Senha</label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Sua senha secreta"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoadingAuth ? (
                    <span>Entrando...</span>
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: FIRST ACCESS / ACTIVATION FOR INVITED MEMBERS */}
          {activeTab === 'first-access' && (
            <div className="space-y-4">
              {/* Guidance Banner */}
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Se você foi cadastrado pela sua liderança, use o <strong>mesmo e-mail</strong> cadastrado para ativar seu acesso e definir sua senha.
                </p>
              </div>

              {/* Google One-Click Activation */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoadingAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.54 0 2.9.55 3.97 1.45l2.97-2.97C17.13 1.8 14.73 1 12 1 7.37 1 3.48 3.65 1.63 7.51l3.57 2.77C6.07 7.4 8.79 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.87c2.16-1.99 3.73-4.94 3.73-8.69z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.2 14.72c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L1.63 7.77C.59 9.87 0 12.22 0 14.72s.59 4.85 1.63 6.95l3.57-2.77z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.87c-1.08.72-2.45 1.16-4.24 1.16-3.21 0-5.93-2.4-6.8-5.28L1.63 16.37C3.48 20.23 7.37 23.5 12 23.5z"
                  />
                </svg>
                <span>Ativar com Conta Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ou defina sua senha por e-mail
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* Activation Form */}
              <form onSubmit={handleFirstAccessSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    E-mail Cadastrado *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={firstAccessEmail}
                      onChange={(e) => {
                        setFirstAccessEmail(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="o-mesmo-email-cadastrado@igreja.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={firstAccessName}
                      onChange={(e) => setFirstAccessName(e.target.value)}
                      placeholder="Ex: Marcelo Massoto"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      Definir Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showFirstAccessPassword ? 'text' : 'password'}
                        required
                        value={firstAccessPassword}
                        onChange={(e) => {
                          setFirstAccessPassword(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder="Mínimo 6 dígitos"
                        className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFirstAccessPassword(!showFirstAccessPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showFirstAccessPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      Confirmar Senha *
                    </label>
                    <input
                      type={showFirstAccessPassword ? 'text' : 'password'}
                      required
                      value={firstAccessConfirmPassword}
                      onChange={(e) => {
                        setFirstAccessConfirmPassword(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50 mt-1"
                >
                  {isLoadingAuth ? (
                    <span>Ativando acesso...</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Ativar Meu Acesso & Entrar</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Sign Up Link */}
          <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
            <span>Sua igreja ainda não usa o Oiko?</span>
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Cadastrar Igreja →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-2">
        Oiko Gestão Integrada • Sistema Operacional para Igrejas e Ministérios
      </footer>

      {/* Modal Esqueci a Senha */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                <span>Recuperar Senha</span>
              </h3>
              <button
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotSuccess(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>E-mail enviado!</span>
                </p>
                <p>{forgotSuccess}</p>
                <button
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotSuccess(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs mt-2"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Informe o seu e-mail de cadastro. Enviaremos as instruções oficiais do Firebase para redefinir sua senha.
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Enviar Link de Redefinição
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
