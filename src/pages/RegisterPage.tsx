import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Check, 
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUpWithEmail, loginWithGoogle, currentUser, isLoadingAuth, authError, setAuthError } = useAuth();
  const { createOrganization } = useTenant();
  const { success } = useNotification();

  // Selected Plan from query or default
  const defaultPlan = (searchParams.get('plan') || 'PRO').toUpperCase() as 'STARTER' | 'PRO' | 'ENTERPRISE';
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'PRO' | 'ENTERPRISE'>(
    ['STARTER', 'PRO', 'ENTERPRISE'].includes(defaultPlan) ? defaultPlan : 'PRO'
  );

  // Form Fields
  const [adminName, setAdminName] = useState(currentUser?.name && currentUser.name !== 'Novo Usuário' ? currentUser.name : '');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Church Fields
  const [churchName, setChurchName] = useState('');
  const [slug, setSlug] = useState('');
  const [city, setCity] = useState('');
  const [mainCampusName, setMainCampusName] = useState('Sede Principal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill from currentUser if logged in
  useEffect(() => {
    if (currentUser?.email) {
      if (currentUser.name && currentUser.name !== 'Novo Usuário') {
        setAdminName(currentUser.name);
      }
      setAdminEmail(currentUser.email);
    }
  }, [currentUser]);

  // Auto-generate slug from church name
  useEffect(() => {
    if (churchName && !slug) {
      const generated = churchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [churchName]);

  const handleGoogleRegister = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const loggedUser = await loginWithGoogle();
      if (!loggedUser) return;

      setAdminName(loggedUser.name);
      setAdminEmail(loggedUser.email);

      if (churchName.trim()) {
        const cleanSlug = (slug.trim() || churchName.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase();
        createOrganization(
          churchName.trim(),
          cleanSlug,
          mainCampusName.trim() || 'Sede Principal',
          city.trim() || 'Cidade Principal',
          selectedPlan,
          loggedUser
        );
        success(`Igreja "${churchName}" criada com sucesso! Seja bem-vindo ao Oiko Gestão.`);
        navigate(`/${cleanSlug}/dashboard`);
      } else {
        success('Autenticado com Google!', 'Informe o nome da sua igreja abaixo para concluir a criação.');
      }
    } catch (err: any) {
      console.error('Google Registration Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim()) {
      setAuthError('Por favor informe o nome da sua igreja.');
      return;
    }

    const isGoogleAuth = !!currentUser?.email;

    if (!isGoogleAuth) {
      if (!adminName.trim() || !adminEmail.trim()) {
        setAuthError('Preencha os dados do administrador.');
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('As senhas digitadas não coincidem.');
        return;
      }

      if (password.length < 6) {
        setAuthError('A senha deve possuir pelo menos 6 caracteres.');
        return;
      }
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      // 1. Get or Create User
      let targetUser = currentUser;
      if (!targetUser?.email) {
        targetUser = await signUpWithEmail(adminName.trim(), adminEmail.trim(), password);
      }

      // 2. Create Organization, Campus & Admin Membership in Firestore
      const cleanSlug = (slug.trim() || churchName.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase();
      createOrganization(
        churchName.trim(),
        cleanSlug,
        mainCampusName.trim() || 'Sede Principal',
        city.trim() || 'Cidade Principal',
        selectedPlan,
        targetUser
      );

      success(`Igreja "${churchName}" criada com sucesso! Seja bem-vindo ao Oiko Gestão.`);
      navigate(`/${cleanSlug}/dashboard`);

    } catch (err: any) {
      console.error('Registration Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white p-4 sm:p-6 lg:p-8 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Site</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Já possui conta?</span>
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Fazer Login
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto my-auto py-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cadastrar Minha Igreja no Oiko
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Inicie seu teste gratuito de 14 dias com acesso total a tarefas, sedes, eventos e automações.
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

          {/* Plan Selector Bar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>Selecione o Pacote Inicial:</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'STARTER', label: 'Starter', price: 'R$ 97/mês', desc: 'Até 15 membros • 2 campi' },
                { id: 'PRO', label: 'Pro (Recomendado)', price: 'R$ 197/mês', desc: 'Até 50 membros • 10 campi' },
                { id: 'ENTERPRISE', label: 'Enterprise', price: 'R$ 397/mês', desc: 'Membros e campi ilimitados' }
              ].map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-300 block mt-1">{p.price}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google One-Click Register Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isSubmitting || isLoadingAuth}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{currentUser?.email ? `Continuar como ${currentUser.name || currentUser.email}` : 'Criar Conta com o Google'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ou preencha os dados abaixo
              </span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Administrator Data */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>1. Dados do Administrador Principal</span>
                </h3>
                {currentUser?.email && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Autenticado via Google
                  </span>
                )}
              </div>

              {currentUser?.email ? (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {currentUser.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Seu Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ex: Pr. Thiago Moura"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Seu E-mail Profissional</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="thiago@suaigreja.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Crie sua Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Confirmar Senha</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>


            {/* Step 2: Church / Organization Data */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>2. Dados da Igreja / Ministério</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Nome Oficial da Igreja</label>
                  <input
                    type="text"
                    required
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Ex: Igreja Batista da Manhã"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Identificador / URL do Painel</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 rounded-l-xl bg-slate-950 border border-r-0 border-slate-800 text-[11px] text-slate-500">
                      app/
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="minha-igreja"
                      className="w-full px-3 py-2.5 rounded-r-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Cidade / UF Principal</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo / SP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Nome do Campus Principal (Sede)</label>
                  <input
                    type="text"
                    value={mainCampusName}
                    onChange={(e) => setMainCampusName(e.target.value)}
                    placeholder="Ex: Auditório Principal / Sede Central"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting || isLoadingAuth}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting || isLoadingAuth ? (
                  <span>Criando ambiente da igreja...</span>
                ) : (
                  <>
                    <span>Criar Minha Igreja & Acessar Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-2">
        Oiko Gestão Integrada • Ao criar a conta você concorda com nossos Termos de Uso e Política de Privacidade.
      </footer>
    </div>
  );
};
