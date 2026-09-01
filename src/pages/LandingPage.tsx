import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  CalendarDays, 
  ShieldCheck, 
  Users, 
  Zap, 
  TrendingUp, 
  MapPin, 
  Check, 
  HelpCircle, 
  ChevronRight,
  ChevronDown,
  Clock,
  Briefcase,
  Star,
  Flame,
  LayoutDashboard,
  Kanban
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const PLANS = [
    {
      id: 'STARTER',
      name: 'Starter',
      description: 'Ideal para igrejas e congregações locais estruturarem suas demandas e operações.',
      monthlyPrice: 97,
      yearlyPrice: 77,
      badge: null,
      highlight: false,
      features: [
        'Até 15 líderes e voluntários',
        'Até 2 sedes / campi',
        'Fluxo Kanban completo de tarefas',
        'Portal guiado de solicitações',
        'Gestão de até 20 eventos e cultos',
        'Notificações em tempo real e menções',
        'Suporte por e-mail'
      ],
      cta: 'Começar com Starter',
      ctaColor: 'bg-slate-800 hover:bg-slate-700 text-white'
    },
    {
      id: 'PRO',
      name: 'Pro Multi-Campi',
      description: 'Perfeito para ministérios em expansão que precisam de controle total entre departamentos e sedes.',
      monthlyPrice: 197,
      yearlyPrice: 157,
      badge: 'Mais Popular ⭐',
      highlight: true,
      features: [
        'Até 50 líderes e voluntários',
        'Até 10 sedes / congregações',
        'Tudo do plano Starter',
        'Cronograma Gantt & Linha do Tempo',
        'Regras de Automação de Tarefas',
        'Centro de Aprovação de Orçamentos e Peças',
        'Relatórios avançados e métricas de entrega',
        'Identidade visual e logo customizados',
        'Suporte prioritário via WhatsApp'
      ],
      cta: 'Assinar Plano Pro',
      ctaColor: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30'
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Para grandes redes, convenções e ministérios que exigem escala e sedes ilimitadas.',
      monthlyPrice: 397,
      yearlyPrice: 317,
      badge: 'Ilimitado',
      highlight: false,
      features: [
        'Líderes e membros ilimitados',
        'Sedes e congregações ilimitadas',
        'Tudo do plano Pro',
        'Controle granular de permissões (RBAC avançado)',
        'Integrações personalizadas e API',
        'SLA de atendimento garantido',
        'Gerente de conta e treinamento dedicado'
      ],
      cta: 'Falar com Consultor',
      ctaColor: 'bg-slate-800 hover:bg-slate-700 text-white'
    }
  ];

  const FAQS = [
    {
      q: 'O que é o Oiko Gestão Integrada?',
      a: 'O Oiko é uma plataforma completa desenvolvida especialmente para igrejas e ministérios gerenciarem todas as suas demandas operacionais, obras, reformas, compras, eventos, mídias, comunicação e voluntários em um único lugar.'
    },
    {
      q: 'Posso cadastrar mais de um campus ou filial?',
      a: 'Sim! A partir do plano Starter você já pode gerenciar múltiplos campi com filtros dedicados, garantindo que cada líder visualize as tarefas de sua própria congregação ou da rede inteira.'
    },
    {
      q: 'Como funciona o controle de permissões e perfis de acesso?',
      a: 'O Oiko possui sistema RBAC nativo: Administradores possuem controle total; Líderes criam e aprovam demandas; Equipe e Voluntários produzem tarefas no Kanban; e Solicitantes acompanham o status de seus pedidos com segurança.'
    },
    {
      q: 'Preciso instalar algum aplicativo no computador?',
      a: 'Não. O Oiko é 100% em nuvem e funciona diretamente no navegador em qualquer computador, tablet ou smartphone, com sincronização em tempo real.'
    },
    {
      q: 'Posso testar antes de assinar?',
      a: 'Sim! Ao criar a sua igreja, você recebe 14 dias de teste gratuito para experimentar todos os recursos com a sua equipe sem nenhum compromisso.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Glow Effects Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Oiko <span className="text-indigo-400">Gestão</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block -mt-1">
                Tarefas & Operações
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-white transition-colors">Dúvidas</a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 transition-all"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Criar Minha Igreja</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold animate-fade-in shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gestão Operacional de Alto Desempenho para Igrejas</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Chega de demandas perdidas no WhatsApp.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Centralize toda a operação da sua igreja.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Do planejamento de <strong>obras e compras</strong> aos <strong>cultos, eventos, conferências e mídias</strong>. Um sistema completo com fluxo Kanban, cronogramas e controle multi-campi.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Experimente 14 Dias Grátis</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#planos"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span>Ver Tabela de Planos</span>
          </a>
        </div>

        {/* Social Proof Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <h3 className="text-2xl font-black text-white">100%</h3>
            <p className="text-xs text-slate-400 mt-0.5">Nuvem e tempo real</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <h3 className="text-2xl font-black text-indigo-400">Multi-Sedes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gestão por campus e filial</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <h3 className="text-2xl font-black text-purple-400">0 ms</h3>
            <p className="text-xs text-slate-400 mt-0.5">Abertura instantânea</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <h3 className="text-2xl font-black text-emerald-400">RBAC</h3>
            <p className="text-xs text-slate-400 mt-0.5">Perfis e alçadas seguros</p>
          </div>
        </div>

        {/* Preview Mockup Frame */}
        <div className="pt-8 max-w-5xl mx-auto">
          <div className="rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-indigo-500/20 via-slate-800/50 to-slate-900/80 border border-slate-700/80 shadow-2xl">
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner">
              {/* Fake Window Bar */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] font-mono text-slate-500">app.oiko.gestao / dashboard</span>
                <div className="w-12" />
              </div>

              {/* Simulated UI Content */}
              <div className="p-6 sm:p-8 space-y-6 text-left bg-slate-900/90">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Quadro de Operações & Tarefas</h3>
                    <p className="text-xs text-slate-400">Acompanhe compras, obras prediais, artes, escalas e eventos em andamento.</p>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    Sincronização em Tempo Real Ativa
                  </span>
                </div>

                {/* Simulated Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>📥 DEMANDAS & IDEIAS</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">3</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white space-y-1.5 shadow-sm">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">Obras & Manutenção</span>
                      <p className="font-semibold">Troca do telhado e revisão elétrica (R$ 3.000)</p>
                      <span className="text-[10px] text-slate-400 block">Resp: André • Sede Principal</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white space-y-1.5 shadow-sm">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">Logística</span>
                      <p className="font-semibold">Comprar cones para isolar calçada The School</p>
                      <span className="text-[10px] text-slate-400 block">Resp: Hugo • Campus Norte</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                      <span>⚡ EM PRODUÇÃO</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 text-[10px]">2</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-white space-y-1.5 shadow-md">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">Comunicação</span>
                      <p className="font-semibold">Vídeo de Abertura da Conferência Missão de Casa</p>
                      <span className="text-[10px] text-slate-400 block">Resp: Jean & Thiago • Geral</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>✅ CONCLUÍDO</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[10px]">14</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white space-y-1.5 opacity-80">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">Eventos</span>
                      <p className="font-semibold">Cardápio & Vendas do Almoço de Domingo</p>
                      <span className="text-[10px] text-slate-400 block">Resp: André • Concluído</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECURSOS & MÓDULOS SECTION ─────────────────────── */}
      <section id="recursos" className="py-20 sm:py-28 bg-slate-900/40 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
              Feito sob medida para ministérios
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que sua liderança precisa em uma única plataforma
            </h3>
            <p className="text-sm sm:text-base text-slate-400">
              Elimine o caos de planilhas desatualizadas e grupos de mensagens com módulos interligados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Kanban className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Quadro Kanban de Tarefas</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Acompanhe o status de cada pedido com prazos, responsáveis, checklists e anexos. Prioridades claras para a equipe de execução.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Eventos, Séries & Cultos</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Planeje conferências, aniversários, retiros e cultos especiais conectando todas as tarefas necessárias ao cronograma geral.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Multi-Campi & Sedes</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Visão consolidada para a diretoria geral e filtros específicos para que cada congregação foque exclusivamente em suas demandas.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Centro de Aprovações</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Alçadas pastorais e de liderança para validar orçamentos, artes, compras e cronogramas antes da execução final.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Portal de Solicitações Guiado</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Formulário passo a passo com briefing detalhado para que os líderes enviem pedidos completos sem retrabalho.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-4 shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Notificações & Menções</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Mencione membros com @nome nos comentários, receba alertas instantâneos no sino e resumo diário das entregas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANOS & TABELA DE PREÇOS (PRICING) ─────────────── */}
      <section id="planos" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
            Investimento transparente
          </h2>
          <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Escolha o pacote ideal para a sua igreja
          </h3>
          <p className="text-sm sm:text-base text-slate-400">
            Todos os planos incluem 14 dias de teste grátis. Cancele a qualquer momento sem taxas extras.
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={`text-xs font-semibold ${billingPeriod === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Mensal
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="w-12 h-6 rounded-full bg-slate-800 p-1 border border-slate-700 relative transition-colors focus:outline-none"
            >
              <div 
                className={`w-4 h-4 rounded-full bg-indigo-500 transition-transform duration-200 ${
                  billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingPeriod === 'yearly' ? 'text-white' : 'text-slate-400'}`}>
              <span>Anual</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                Economize 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan) => {
            const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                  plan.highlight
                    ? 'bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-600/20 lg:-translate-y-2'
                    : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold text-white">{plan.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-semibold text-slate-400">R$</span>
                      <span className="text-4xl font-black text-white">{price}</span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      {billingPeriod === 'yearly' ? 'Faturado anualmente (12x)' : 'Cobrado mensalmente'}
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      O que está incluso:
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    to={`/signup?plan=${plan.id}`}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all active:scale-95 ${plan.ctaColor}`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ SECTION ────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
              Tire suas dúvidas
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Perguntas Frequentes
            </h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-indigo-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                        isOpen ? 'rotate-180 text-indigo-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-[10px]">
              O
            </div>
            <span className="font-bold text-slate-300">Oiko Gestão Integrada</span>
            <span>• © {new Date().getFullYear()} Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300 transition-colors">Acessar Conta</Link>
            <Link to="/signup" className="hover:text-slate-300 transition-colors">Cadastrar Igreja</Link>
            <a href="#planos" className="hover:text-slate-300 transition-colors">Preços</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
