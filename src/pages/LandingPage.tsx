import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  CalendarDays, 
  ShieldCheck, 
  Users, 
  Zap, 
  MapPin, 
  Check, 
  HelpCircle, 
  ChevronDown,
  Clock,
  Briefcase,
  Kanban,
  UserCheck,
  HeartHandshake,
  Lock,
  Layers,
  Phone
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
      name: 'Starter (Pastor)',
      description: 'Ideal para pastores, congregações locais e secretarias estruturarem demandas e acolhimento.',
      monthlyPrice: 29.90,
      yearlyPrice: 23.90,
      badge: 'Plano Pastor',
      highlight: false,
      features: [
        'Até 2 usuários (Pastor + Auxiliar)',
        'Máx. 2 Congregações / Sedes',
        'Quadro Kanban de Tarefas & Obras',
        'Jornada de Membros (até 50 contatos/mês)',
        'Portal Público de Solicitações com Protocolo',
        'Até 20 Eventos Ativos',
        'Suporte por E-mail e WhatsApp'
      ],
      cta: 'Começar 14 Dias Grátis',
      ctaSubtext: '14 dias sem compromisso • Sem cartão',
      btnClass: 'bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 hover:border-slate-300'
    },
    {
      id: 'PRO',
      name: 'Pro Multi-Campi',
      description: 'Para igrejas em crescimento que necessitam dos 3 serviços completos e gestão multiministerial.',
      monthlyPrice: 197,
      yearlyPrice: 157,
      badge: 'Mais Popular ⭐',
      highlight: true,
      features: [
        'Até 50 usuários/voluntários',
        'Até 10 Congregações / Sedes',
        'Tudo do plano Starter (Pastor)',
        'Integração de Membros Ilimitada (Células & Batismo)',
        'Cuidado & Agenda Pastoral com Sigilo Ministerial',
        'Cronograma Gantt + Centro de Aprovações',
        'Eventos Ativos Ilimitados',
        'Logo e cores da sua Igreja',
        'Suporte WhatsApp Prioritário'
      ],
      cta: 'Começar 14 Dias Grátis',
      ctaSubtext: 'Acesso liberado imediatamente aos 3 serviços',
      btnClass: 'bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-200'
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Denominações completas, convenções e grandes operações que exigem escala ilimitada.',
      monthlyPrice: 397,
      yearlyPrice: 317,
      badge: 'Ilimitado',
      highlight: false,
      features: [
        'Usuários e voluntários ilimitados',
        'Sedes e Campi Ilimitados',
        'Os 3 Serviços com volume 100% ilimitado',
        'Controle granular de permissões (RBAC avançado)',
        'White-label total e acesso à API',
        'SLA de atendimento garantido',
        'Gerente de Sucesso Dedicado e Treinamento'
      ],
      cta: 'Falar com Consultor / Testar',
      ctaSubtext: 'Treinamento e implantação assistida',
      btnClass: 'bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 hover:border-slate-300'
    }
  ];

  const FAQS = [
    {
      q: 'O que é o Oiko Gestão?',
      a: 'É uma plataforma completa (SaaS) construída 100% na nuvem, desenvolvida especificamente para resolver os 3 maiores desafios de igrejas: 1) Operações & Tarefas Gerais (obras, compras, cultos e mídias), 2) Integração & Jornada de Novos Membros (fechando a porta dos fundos da igreja), e 3) Gabinete & Agenda Pastoral com sigilo ministerial e visualização em calendário.'
    },
    {
      q: 'Minha igreja tem congregações/filiais, o sistema atende?',
      a: 'Sim! O Oiko Gestão possui arquitetura Multi-Sedes nativa. Você pode gerenciar a igreja sede e dezenas de filiais no mesmo painel. Os dados de cada campus ficam isolados para a equipe local, mas a diretoria geral tem a visão consolidada de toda a denominação.'
    },
    {
      q: 'Como funciona o sigilo e as permissões de acesso (RBAC)?',
      a: 'O sistema possui 4 perfis seguros (Administrador, Líder, Voluntário e Solicitante) com controle de sigilo ministerial: anotações confidenciais de gabinete e atendimentos pastorais só são visíveis para pastores autorizados. Voluntários de mídia ou obras não têm acesso a essas informações confidenciais.'
    },
    {
      q: 'Preciso instalar algum software nos computadores da igreja?',
      a: 'Nenhuma instalação é necessária. O Oiko Gestão roda direto no navegador (Chrome, Safari, Edge) em computadores, tablets e smartphones com sincronização instantânea em tempo real (0ms com Firebase).'
    },
    {
      q: 'Como funciona o teste grátis de 14 dias?',
      a: 'Basta criar a conta da sua igreja sem precisar colocar cartão de crédito. Você terá acesso livre a todas as funcionalidades. Após os 14 dias, não haverá cobrança automática; sua conta entra em modo leitura até você decidir contratar um plano oficial, sem perder nenhum dado cadastrado.'
    }
  ];

  return (
    <div className="bg-slate-50 text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-brand-500 selection:text-white min-h-screen">
      {/* Elementos visuais sutis de fundo (Gradient Orbs) */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute top-40 left-0 w-[30rem] h-[30rem] bg-blue-100/40 rounded-full blur-[100px] -translate-x-1/2" />
      </div>

      {/* ── HEADER / NAVBAR ───────────────────────────────────────── */}
      <header className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              O
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 tracking-tight">Oiko Gestão</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                v2.0
              </span>
            </div>
          </Link>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8 items-center text-sm font-medium text-slate-600">
            <a href="#pilares" className="hover:text-brand-600 transition-colors">3 Pilares</a>
            <a href="#modulos" className="hover:text-brand-600 transition-colors">Módulos</a>
            <a href="#precos" className="hover:text-brand-600 transition-colors">Preços</a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
          </nav>
          
          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Entrar
            </Link>
            <Link 
              to="/signup" 
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all transform hover:scale-105"
            >
              Testar 14 Dias Grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-16">
        {/* ── HERO SECTION ────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16 pb-20 text-center lg:text-left flex flex-col lg:flex-row items-center gap-14">
          
          {/* Hero Left Content */}
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start z-10">
            {/* Pill Badge with Ping animation */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-brand-600 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              Gestão Operacional & Pastoral de Alto Desempenho
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Chega de demandas perdidas no WhatsApp. <br />
              <span className="bg-gradient-to-r from-brand-600 to-sky-500 bg-clip-text text-transparent">
                Centralize toda a operação da sua igreja.
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl leading-relaxed">
              A única plataforma que integra em perfeita harmonia os <strong>3 serviços vitais</strong>: 1) Tarefas & Obras da Igreja, 2) Jornada e Acolhimento de Novos Membros, e 3) Gabinete e Agenda Pastoral com sigilo absoluto.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
              <Link 
                to="/signup" 
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <Zap className="w-5 h-5 fill-white text-white" />
                Experimente 14 Dias Grátis
              </Link>
              <a 
                href="#precos" 
                className="flex items-center justify-center px-8 py-4 rounded-xl text-base font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
              >
                Ver Tabela de Planos
              </a>
            </div>
            
            {/* Tríade de Confiança & Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full border-t border-slate-200 pt-8 text-left">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-900 font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  100% Nuvem
                </span>
                <span className="text-xs text-slate-500">Sem instalação</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-900 font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Multi-Sedes
                </span>
                <span className="text-xs text-slate-500">Campi isolados</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-900 font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Tempo Real
                </span>
                <span className="text-xs text-slate-500">Sync Firebase 0ms</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-900 font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  RBAC Nativo
                </span>
                <span className="text-xs text-slate-500">Acesso seguro</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              14 dias sem compromisso. Sem necessidade de cartão. Cancele quando quiser.
            </p>
          </div>

          {/* Hero Right Mockup Frame (MacOS Light Window) */}
          <div className="lg:w-1/2 relative z-10 w-full">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-brand-500/10">
              {/* Top Window Bar */}
              <div className="bg-slate-100 px-4 py-3 flex items-center border-b border-slate-200">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto text-xs text-slate-500 font-medium font-mono">
                  app.oikogestao.com/igreja-sede
                </div>
              </div>
              
              {/* Simulated Kanban Columns */}
              <div className="bg-slate-50/50 p-4 flex gap-4 overflow-x-auto min-h-[380px]">
                
                {/* Coluna 1 */}
                <div className="w-60 flex-shrink-0 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-slate-700 font-bold text-xs">Demandas & Ideias</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">2</span>
                  </div>
                  
                  {/* Card 1 */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-brand-300 transition-colors cursor-pointer group">
                    <div className="flex gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">OBRAS</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mb-2 leading-snug">Reforma do Berçário - Campus Norte</p>
                    <div className="flex justify-between items-center text-slate-500 text-[10px]">
                      <div className="flex items-center gap-1 font-medium">Checklist: 2/5</div>
                      <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold">PR</div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-brand-300 transition-colors cursor-pointer">
                    <div className="flex gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700">MÍDIA</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">Identidade Visual: Retiro de Jovens</p>
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="w-60 flex-shrink-0 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-slate-700 font-bold text-xs">Em Produção</h3>
                    <span className="bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5 rounded-full font-bold">1</span>
                  </div>
                  
                  {/* Card 3 */}
                  <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-brand-300 transition-colors cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                    <div className="flex justify-between items-start mb-2 ml-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">COMPRAS</span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">R$ 1.800</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 ml-1 leading-snug">Comprar Cabos XLR e Microfones</p>
                  </div>
                </div>

                {/* Coluna 3 */}
                <div className="w-60 flex-shrink-0 flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-slate-500 font-bold text-xs">Concluído</h3>
                    <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">1</span>
                  </div>
                  
                  {/* Card 4 */}
                  <div className="bg-slate-100/80 border border-slate-200/60 p-3 rounded-xl">
                    <div className="flex gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">CULTOS</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 line-through leading-snug">Escala de Voluntários - Santa Ceia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3 GRANDES PILARES INTEGRADOS ────────────────────────── */}
        <section id="pilares" className="py-20 relative bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-600 text-xs font-bold uppercase tracking-wider mb-3">
                A Tríade de Gestão da Igreja
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                3 Grandes Serviços Integrados no Oiko
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Ao invés de contratar ferramentas separadas que não se comunicam, centralize toda a sua igreja em um ecossistema inteligente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pilar 1: Tarefas */}
              <div className="bg-slate-50/80 border border-slate-200 p-8 rounded-2xl hover:bg-white hover:shadow-xl hover:border-brand-300 transition-all group relative overflow-hidden">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Kanban className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-700 text-[10px] font-extrabold uppercase tracking-wider mb-3">
                  Serviço 1 • Operações
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Tarefas & Operações da Igreja</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Obras, reformas, compras, eventos, cultos e mídias. Quadro Kanban ágil com controle de concorrência, checklists atômicos, prazos e anexos do Canva/Drive.
                </p>
              </div>

              {/* Pilar 2: Membros */}
              <div className="bg-slate-50/80 border border-slate-200 p-8 rounded-2xl hover:bg-white hover:shadow-xl hover:border-emerald-300 transition-all group relative overflow-hidden">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider mb-3">
                  Serviço 2 • Membresia
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Jornada & Integração de Membros</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Feche a "porta dos fundos" da igreja. Funil visual para acolher cada novo visitante, fazer o 1º contato via WhatsApp, conectar em células e preparar para o batismo.
                </p>
              </div>

              {/* Pilar 3: Pastoral */}
              <div className="bg-slate-50/80 border border-slate-200 p-8 rounded-2xl hover:bg-white hover:shadow-xl hover:border-amber-300 transition-all group relative overflow-hidden">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider mb-3">
                  Serviço 3 • Sigilo Ministerial
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Cuidado & Agenda Pastoral</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Atendimentos em gabinete, aconselhamentos e visitas com privacidade absoluta restrita aos pastores. Visão de quadro e calendário de horários para a agenda pastoral.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6 MÓDULOS OPERACIONAIS DETALHADOS ───────────────────── */}
        <section id="modulos" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Poderoso por baixo do capô.<br />
                Simples na palma da mão.
              </h2>
              <p className="text-slate-600 text-lg">
                Seis módulos integrados para resolver os maiores gargalos operacionais da sua igreja, sem complicações.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Modulo 1 */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-lg hover:border-brand-300 transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Kanban className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Quadro Kanban</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Gestão ágil de prazos e responsáveis. Use checklists atômicos, anexe arquivos, links do Drive ou artes do Canva diretamente no card da tarefa.
                </p>
              </div>

              {/* Modulo 2 */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-lg hover:border-purple-300 transition-all group">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Eventos & Cultos</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Centralize a organização de conferências, retiros e séries de pregações. Vincule tarefas aos eventos e acompanhe a barra de progresso real.
                </p>
              </div>

              {/* Modulo 3 */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-lg hover:border-emerald-300 transition-all group">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Campi & Sedes</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Gerencie a igreja sede e todas as congregações no mesmo painel. Dados isolados por campus ou visão consolidada para a liderança master.
                </p>
              </div>

              {/* Modulo 4 */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-lg hover:border-amber-300 transition-all group">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Centro de Aprovações</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Fim do "faz e depois desfaz". Valide orçamentos de compras, artes para redes sociais e pautas de eventos antes da produção começar.
                </p>
              </div>

              {/* Modulo 5 (Destaque) */}
              <div className="bg-white border-2 border-brand-500 shadow-md p-8 rounded-2xl hover:border-brand-600 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                  DIFERENCIAL
                </div>
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Portal Público de Pedidos</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Líderes e membros abrem solicitações (compras, artes, consertos) via link sem precisar de senha. Gera número de protocolo para acompanhamento.
                </p>
              </div>

              {/* Modulo 6 */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl hover:shadow-lg hover:border-pink-300 transition-all group">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Notificações e Menções</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Comunicação focada na tarefa. Marque membros com @nome, acompanhe o histórico de alterações e receba alertas de prazos estourando.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLANOS & PREÇOS ─────────────────────────────────────── */}
        <section id="precos" className="py-24 relative bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Escolha a escala da sua operação.
              </h2>
              <p className="text-slate-600 text-lg">
                Sem taxas escondidas. Funcionalidades liberadas para escalar junto com a sua igreja.
              </p>
              
              {/* Toggle Mensal / Anual */}
              <div className="mt-8 flex justify-center items-center gap-3">
                <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                  Mensal
                </span>
                <div 
                  onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                  className="w-12 h-6 bg-brand-600 rounded-full p-1 cursor-pointer flex items-center shadow-inner transition-colors"
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
                <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-slate-900 font-bold' : 'text-slate-500'} flex items-center gap-1.5`}>
                  <span>Anual</span>
                  <span className="text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                    -20% OFF
                  </span>
                </span>
              </div>
            </div>

            {/* Grid dos 3 Planos */}
            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {PLANS.map((plan) => {
                const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

                return (
                  <div
                    key={plan.id}
                    className={`p-8 rounded-2xl flex flex-col transition-all duration-200 ${
                      plan.highlight
                        ? 'bg-white border-2 border-brand-500 relative transform lg:-translate-y-4 shadow-xl shadow-brand-100'
                        : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mb-6 h-10 leading-relaxed">{plan.description}</p>
                    
                    <div className="mb-6 border-b border-slate-100 pb-6">
                      <span className="text-4xl font-extrabold text-slate-900">
                        R$ {Number.isInteger(price) ? price : price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-slate-500 font-medium text-sm">
                        {billingPeriod === 'yearly' ? '/mês no anual' : '/mês'}
                      </span>
                      {billingPeriod === 'yearly' && (
                        <div className="text-xs text-slate-400 mt-1">
                          ou R$ {Number.isInteger(plan.monthlyPrice) ? plan.monthlyPrice : plan.monthlyPrice.toFixed(2).replace('.', ',')}/mês no plano mensal
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3.5 text-sm text-slate-600 mb-8 flex-1">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/signup"
                      className={`w-full py-3 px-4 text-center rounded-xl text-sm font-bold transition mt-auto block ${plan.btnClass}`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ACCORDION ───────────────────────────────────────── */}
        <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Perguntas Frequentes</h2>
              <p className="text-slate-600 text-base">Tudo o que você precisa saber antes de otimizar a gestão da sua igreja.</p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex justify-between items-center font-semibold p-6 text-left text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-brand-600 transition-transform duration-200 shrink-0 ml-4 ${
                          isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="text-slate-600 px-6 pb-6 pt-2 leading-relaxed text-sm bg-white border-t border-slate-100 animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  O
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">Oiko Gestão</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Gestão Operacional de Alto Desempenho para Igrejas. Transformando a complexidade do backoffice e acolhimento em processos simples.
              </p>
            </div>

            <div>
              <h4 className="text-slate-900 font-semibold mb-4 text-xs uppercase tracking-wider">3 Serviços</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#pilares" className="hover:text-brand-600 transition">Quadro de Operações</a></li>
                <li><a href="#pilares" className="hover:text-brand-600 transition">Jornada de Membros</a></li>
                <li><a href="#pilares" className="hover:text-brand-600 transition">Agenda Pastoral Sigilosa</a></li>
                <li><Link to="/login" className="hover:text-brand-600 transition">Login no Painel</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 font-semibold mb-4 text-xs uppercase tracking-wider">Recursos</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#modulos" className="hover:text-brand-600 transition">Portal de Demandas</a></li>
                <li><a href="#precos" className="hover:text-brand-600 transition">Planos e Preços</a></li>
                <li><a href="#faq" className="hover:text-brand-600 transition">Perguntas Frequentes</a></li>
                <li><a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition">Falar com Suporte</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 font-semibold mb-4 text-xs uppercase tracking-wider">Legal & LGPD</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link to="/termos" className="hover:text-brand-600 transition">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-brand-600 transition">Política de Privacidade</Link></li>
                <li className="pt-3 flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Servidores Seguros na Nuvem
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>&copy; 2026 Oiko Gestão. Todos os direitos reservados.</p>
            <div className="flex items-center gap-1.5">
              <span>Feito com dedicação para impulsionar a obra do Reino.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
