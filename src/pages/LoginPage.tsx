import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, resetPassword, isLoadingAuth, authError, setAuthError } = useAuth();
  const { currentOrganization } = useTenant();
  const { success } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      await loginWithEmail(email.trim(), password);
      success('Login realizado com sucesso!');
      navigate(`/${currentOrganization.slug || 'minha-igreja'}/dashboard`);
    } catch {
      // Error message is set in AuthContext
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      success('Login via Google realizado com sucesso!');
      navigate(`/${currentOrganization.slug || 'minha-igreja'}/dashboard`);
    } catch {
      // Handled
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
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Acesse sua Conta
            </h1>
            <p className="text-xs text-slate-400">
              Oiko Gestão Integrada • Painel Administrativo
            </p>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <span className="font-bold">Aviso: </span>
                <span>{authError}</span>
              </div>
            </div>
          )}

          {/* Google One-Click Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoadingAuth}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
              ou com e-mail
            </span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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

          {/* Sign Up Link */}
          <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
            <span>Sua igreja ainda não usa o Oiko? </span>
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Cadastrar Igreja
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
