import { 
  User, 
  Organization, 
  Campus, 
  Membership, 
  ChurchEvent, 
  Task, 
  ActivityLog, 
  Comment,
  DemandTypeDefinition,
  EventTemplate
} from '../types';

export const DEMAND_TYPES: DemandTypeDefinition[] = [
  {
    type: 'ARTE',
    label: 'Criar uma Arte / Design',
    icon: 'Palette',
    description: 'Post simples, convite, avatar, flyer digital ou criativo para mídias.',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    bgLight: 'hover:bg-indigo-950/40 hover:border-indigo-500/60',
    placeholderText: 'Ex: Arte para divulgação do retiro de casais no Instagram...',
  },
  {
    type: 'VIDEO',
    label: 'Produzir um Vídeo / Teaser',
    icon: 'Video',
    description: 'Captação, gravação em estúdio, edição de cortes, reels ou vinheta.',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    bgLight: 'hover:bg-rose-950/40 hover:border-rose-500/60',
    placeholderText: 'Ex: Vídeo de 60s convidando para a Conferência de Jovens...',
  },
  {
    type: 'SOCIAL_MEDIA',
    label: 'Divulgação / Social Media',
    icon: 'Share2',
    description: 'Carrossel de conteúdo, stories, calendário semanal de publicações.',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    bgLight: 'hover:bg-purple-950/40 hover:border-purple-500/60',
    placeholderText: 'Ex: Carrossel com resumo dos pontos da mensagem de domingo...',
  },
  {
    type: 'FOTOGRAFIA',
    label: 'Cobertura de Foto / Culto',
    icon: 'Camera',
    description: 'Escala de fotógrafos para batismo, culto especial ou evento.',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bgLight: 'hover:bg-cyan-950/40 hover:border-cyan-500/60',
    placeholderText: 'Ex: Cobertura fotográfica da Cantata de Natal no auditório...',
  },
  {
    type: 'IMPRESSAO',
    label: 'Solicitar Impressão / Gráfica',
    icon: 'Printer',
    description: 'Banners, panfletos, pulseiras, credenciais, carnês ou envelopes.',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bgLight: 'hover:bg-amber-950/40 hover:border-amber-500/60',
    placeholderText: 'Ex: 2 Banners roll-up 200x80cm para o saguão principal...',
  },
  {
    type: 'TEXTO',
    label: 'Solicitar Texto / Copywriting',
    icon: 'FileText',
    description: 'Roteiro pastoral, comunicado oficial, legenda ou artigo devocional.',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bgLight: 'hover:bg-emerald-950/40 hover:border-emerald-500/60',
    placeholderText: 'Ex: Carta aos membros sobre a nova campanha de missões...',
  },
  {
    type: 'APRESENTACAO',
    label: 'Telão LED / Slides Culto',
    icon: 'MonitorPlay',
    description: 'Slides de avisos, fundo de louvor, vinhetas para o software de transmissão.',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    bgLight: 'hover:bg-blue-950/40 hover:border-blue-500/60',
    placeholderText: 'Ex: Apresentação com versículos e avisos do culto da virada...',
  },
  {
    type: 'SITE',
    label: 'Página Web / Inscrições',
    icon: 'Globe',
    description: 'Landing page para evento, formulário de inscrição, atualização do site.',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    bgLight: 'hover:bg-teal-950/40 hover:border-teal-500/60',
    placeholderText: 'Ex: Página para inscrições da Escola Bíblica de Férias...',
  },
  {
    type: 'EVENTO',
    label: 'Pacote de Comunicação para Evento',
    icon: 'Layers',
    description: 'Pacote completo de artes, vídeos, landing page e impressos.',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    bgLight: 'hover:bg-pink-950/40 hover:border-pink-500/60',
    placeholderText: 'Ex: Pacote de comunicação para conferência de 3 dias...',
  },
  {
    type: 'LOGISTICA',
    label: 'Logística, Estrutura & Transporte',
    icon: 'Truck',
    description: 'Montagem de tendas/palco, transporte de equipamentos, credenciamento e recepção.',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bgLight: 'hover:bg-amber-950/40 hover:border-amber-500/60',
    placeholderText: 'Ex: Organização do transporte de van para o retiro no sítio...',
  },
  {
    type: 'OBRA',
    label: 'Obras, Reformas & Manutenção',
    icon: 'Wrench',
    description: 'Manutenção predial, pintura, elétrica, hidráulica, climatização e infraestrutura.',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    bgLight: 'hover:bg-orange-950/40 hover:border-orange-500/60',
    placeholderText: 'Ex: Troca de luminárias do auditório e pintura da sala infantil...',
  },
  {
    type: 'COMPRAS',
    label: 'Compras, Cotações & Suprimentos',
    icon: 'ShoppingCart',
    description: 'Cotação com fornecedores, compra de insumos, materiais e alimentação.',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bgLight: 'hover:bg-emerald-950/40 hover:border-emerald-500/60',
    placeholderText: 'Ex: Cotação de 500 cadeiras estofadas para o templo principal...',
  },
  {
    type: 'ADMINISTRATIVO',
    label: 'Secretaria, Pastoral & Gestão',
    icon: 'FileCheck2',
    description: 'Certificados de batismo, escalas de obreiros, relatórios e documentos.',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    bgLight: 'hover:bg-sky-950/40 hover:border-sky-500/60',
    placeholderText: 'Ex: Emissão de 45 certificados para formatura do discipulado...',
  },
  {
    type: 'OUTRO',
    label: 'Outra Demanda / Geral',
    icon: 'Package',
    description: 'Qualquer outra necessidade operacional da igreja ou ministérios.',
    color: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
    bgLight: 'hover:bg-slate-950/60 hover:border-slate-500/60',
    placeholderText: 'Descreva detalhadamente a necessidade operacional...',
  },
];

// --- EVENT TEMPLATES (Modelos para gerar projetos) ---
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'tmpl_conferencia',
    name: 'Conferência / Congresso Anual',
    category: 'CONFERENCIA',
    description: 'Pacote completo de entregas encadeadas para grandes conferências (identidade, landing page, vídeos, telões e cobertura).',
    defaultTasks: [
      {
        title: 'Identidade Visual & Key Visual do Tema',
        demandType: 'ARTE',
        daysBeforeEvent: 45,
        durationDays: 7,
        priority: 'HIGH',
        checklist: ['Paleta de cores e tipografia', 'Logo da conferência', 'Manual de aplicação'],
      },
      {
        title: 'Landing Page de Inscrições & Lotes',
        demandType: 'SITE',
        daysBeforeEvent: 40,
        durationDays: 5,
        priority: 'HIGH',
        checklist: ['Integração com gateway de pagamento', 'Informações de preletores', 'FAQ e cronograma'],
        dependsOnIndex: 0,
      },
      {
        title: 'Roteiro & Produção do Vídeo Teaser Oficial',
        demandType: 'VIDEO',
        daysBeforeEvent: 35,
        durationDays: 8,
        priority: 'URGENT',
        checklist: ['Gravação em estúdio com preletores', 'Edição cinematográfica', 'Mixagem de áudio'],
        dependsOnIndex: 0,
      },
      {
        title: 'Campanha de Lançamento no Instagram (Carrossel)',
        demandType: 'SOCIAL_MEDIA',
        daysBeforeEvent: 30,
        durationDays: 3,
        priority: 'HIGH',
        checklist: ['Carrossel 4:5', 'Stories de contagem regressiva', 'Link na bio'],
        dependsOnIndex: 0,
      },
      {
        title: 'Vinheta 3D e Telão LED de Abertura',
        demandType: 'APRESENTACAO',
        daysBeforeEvent: 15,
        durationDays: 5,
        priority: 'HIGH',
        checklist: ['Resolução 3840x1080', 'Loop de fundo para louvor'],
        dependsOnIndex: 2,
      },
    ],
  },
  {
    id: 'tmpl_culto_especial',
    name: 'Culto Especial / Batismo / Santa Ceia',
    category: 'CULTO',
    description: 'Demandas focadas no culto de celebração, banners de boas-vindas e escala de cobertura de foto.',
    defaultTasks: [
      {
        title: 'Banner de Divulgação & Stories do Culto',
        demandType: 'ARTE',
        daysBeforeEvent: 10,
        durationDays: 2,
        priority: 'MEDIUM',
        checklist: ['Arte para telão 16:9', 'Stories informativo', 'Post feed'],
      },
      {
        title: 'Escala de Fotografia & Mídias',
        demandType: 'FOTOGRAFIA',
        daysBeforeEvent: 5,
        durationDays: 1,
        priority: 'MEDIUM',
        checklist: ['Definir 2 fotógrafos', 'Alinhar momentos-chave do culto'],
      },
    ],
  },
];

// --- CLEAN INITIAL ZEROED STATE ---

// 1. Clean Starter Organization
export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_minha_igreja',
    name: 'Minha Igreja / Ministério',
    slug: 'minha-igreja',
    branding: {
      primaryColor: '#4f46e5',
      secondaryColor: '#818cf8',
    },
    subscription: {
      organizationId: 'org_minha_igreja',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    limits: {
      maxMembers: 100,
      maxCampuses: 20,
      maxEvents: 500,
      maxTasks: 5000,
      storageGB: 500,
      customBranding: true,
      advancedReports: true,
      gantt: true,
      apiAccess: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// 2. Clean Starter Campus
export const INITIAL_CAMPUSES: Campus[] = [
  {
    id: 'camp_sede',
    organizationId: 'org_minha_igreja',
    name: 'Campus Sede (Auditório Principal)',
    code: 'SEDE',
    city: 'São Paulo - SP',
    address: 'Sede Principal',
    isMainCampus: true,
    createdAt: new Date().toISOString(),
  }
];

// 3. Admin Inicial (placeholder — será substituído pelo usuário real após primeiro login)
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_placeholder',
    name: 'Administrador',
    email: '',
    createdAt: new Date().toISOString(),
  }
];

// 4. Membership inicial do Admin Placeholder
export const INITIAL_MEMBERSHIPS: Membership[] = [
  {
    id: 'mem_admin_placeholder',
    userId: 'usr_admin_placeholder',
    organizationId: 'org_minha_igreja',
    hasOrgWideAccess: true,
    campusIds: [],
    role: 'ADMIN',
    department: 'Diretoria Geral',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// 5. Zeroed Tasks, Events, Activities, and Comments (100% Clean)
export const INITIAL_EVENTS: ChurchEvent[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_ACTIVITIES: ActivityLog[] = [];
export const INITIAL_COMMENTS: Comment[] = [];

// 6. Default Event Categories
export const DEFAULT_EVENT_CATEGORIES = [
  { id: 'cat_culto', name: 'Culto Especial / Celebração', color: 'from-blue-600 to-indigo-600', description: 'Cultos de domingo, ceia, batismos ou vigílias.' },
  { id: 'cat_conferencia', name: 'Conferência / Congresso', color: 'from-purple-600 to-pink-600', description: 'Grandes eventos de múltiplos dias, convidados e preletores.' },
  { id: 'cat_obra', name: 'Obras & Infraestrutura Predial', color: 'from-orange-600 to-amber-600', description: 'Reformas, ampliações, climatização e manutenções.' },
  { id: 'cat_logistica', name: 'Logística & Grandes Montagens', color: 'from-amber-600 to-yellow-600', description: 'Montagens de estruturas, tendas, traslados e operações.' },
  { id: 'cat_compras', name: 'Aquisições & Suprimentos', color: 'from-emerald-600 to-teal-600', description: 'Processos de compras em grande escala, equipamentos e insumos.' },
  { id: 'cat_serie', name: 'Série de Mensagens & Campanhas', color: 'from-teal-600 to-cyan-600', description: 'Campanhas temáticas de pregações durante o mês.' },
  { id: 'cat_retiro', name: 'Retiro / Acampamento', color: 'from-rose-600 to-pink-600', description: 'Retiros de jovens, casais, líderes ou famílias.' },
  { id: 'cat_workshop', name: 'Workshop / Treinamento', color: 'from-cyan-600 to-blue-600', description: 'Capacitações ministeriais, voluntariado e cursos.' },
  { id: 'cat_outro', name: 'Outro Projeto / Demanda Geral', color: 'from-slate-600 to-slate-700', description: 'Qualquer outro projeto ou iniciativa da organização.' },
];

// 7. Default Departments / Ministries
export const DEFAULT_DEPARTMENTS = [
  { id: 'dep_pastoral', name: 'Diretoria Pastoral & Geral', description: 'Corpo pastoral e decisões estratégicas da liderança.' },
  { id: 'dep_logistica', name: 'Logística & Operações', description: 'Estrutura, transporte, recepção, segurança e apoio.' },
  { id: 'dep_obras', name: 'Obras & Manutenção Predial', description: 'Manutenção elétrica, hidráulica, reformas e pintura.' },
  { id: 'dep_compras', name: 'Compras & Almoxarifado', description: 'Cotações, compras de materiais, insumos e patrimônio.' },
  { id: 'dep_midias', name: 'Marketing & Comunicação', description: 'Design, audiovisual, social media, som e transmissão.' },
  { id: 'dep_secretaria', name: 'Secretaria & Administrativo', description: 'Atendimento, membros, certificados e documentos.' },
  { id: 'dep_louvor', name: 'Louvor, Artes & Técnica', description: 'Músicos, vocais, mesas de áudio e iluminação.' },
  { id: 'dep_jovens', name: 'Ministério de Jovens', description: 'Eventos jovens, cultos de sábado e conferências.' },
  { id: 'dep_kids', name: 'Ministério Infantil (Kids)', description: 'EBF, cultinho infantil e materiais didáticos.' },
  { id: 'dep_missoes', name: 'Ação Social & Missões', description: 'Projetos comunitários, cestas básicas e viagens.' },
];
