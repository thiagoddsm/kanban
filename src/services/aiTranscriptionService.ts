import { User, ChurchEvent, Campus, DemandTypeDefinition } from '../types';

export interface AiTaskItem {
  id?: string;
  titulo: string;
  descricao_orientacoes?: string;
  status?: string;
  prioridade?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  tipo?: string;
  campus_unidade?: string;
  projeto_evento?: string;
  estimativa?: string;
  datas?: {
    data_inicio?: string;
    prazo_final?: string;
  };
  responsaveis?: Array<{
    nome: string;
    selecionado?: boolean;
  }>;
  checklist_subtarefas?: Array<{
    id?: string;
    titulo: string;
    concluida?: boolean;
    responsavel?: string;
    prazo?: string;
  }>;
}

export interface AiExtractionResponse {
  tarefas: AiTaskItem[];
  resumo_reuniao?: string;
}

export const AI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Mais Recente • Recomendado' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Alta Capacidade • Rápido' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Ultra Rápido • Econômico' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Equilibrado' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', tag: 'Raciocínio Profundo' },
] as const;

export type AiModelId = typeof AI_MODELS[number]['id'];

const STORAGE_KEY_PREFIX = 'oiko_ai_gemini_key_v1';
const STORAGE_MODEL_PREFIX = 'oiko_ai_gemini_model_v1';

export interface MindMapBranch {
  id: string;
  label: string;
  category?: 'DECISAO' | 'PROJETO' | 'IDEIA' | 'ALERTA';
  children: Array<{
    id: string;
    label: string;
  }>;
}

export interface MindMapData {
  centralTopic: string;
  branches: MindMapBranch[];
}

export interface WordCloudEntry {
  word: string;
  weight: number; // 1 a 10
  count?: number;
}

export interface PersonActivitySummary {
  personName: string;
  matchedUserId?: string;
  roleOrMinistry?: string;
  summary: string;
  tasks: Array<{
    title: string;
    description?: string;
    deadline?: string;
    priority?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
    demandType?: string;
    checklist?: string[];
  }>;
}

export interface LiveMeetingIntelligence {
  centralTopic: string;
  executiveSummary: string;
  keyDecisions: string[];
  openQuestions: string[];
  mindMap: MindMapData;
  keywords: WordCloudEntry[];
  peopleActivities: PersonActivitySummary[];
  rawTasks: AiTaskItem[];
}

const PT_STOPWORDS = new Set([
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no',
  'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à',
  'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só',
  'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter',
  'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'estão', 'você', 'tinha', 'foram', 'essa', 'num',
  'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos', 'elas', 'havia', 'seja', 'qual',
  'será', 'nós', 'tenho', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'fosse', 'dele',
  'tu', 'te', 'vocês', 'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso',
  'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela',
  'aqueles', 'aquelas', 'isto', 'aquilo', 'estou', 'está', 'estamos', 'estão', 'estive', 'esteve',
  'estivemos', 'estiveram', 'estava', 'estávamos', 'estavam', 'então', 'ai', 'aí', 'né', 'tá',
  'pra', 'pro', 'gente', 'coisa', 'fazer', 'feito', 'sobre', 'aqui', 'ali', 'lá', 'onde', 'como',
  'porque', 'porquê', 'pois', 'assim', 'agora', 'hoje', 'ontem', 'amanhã', 'vai', 'vamos', 'vou',
  'pode', 'podem', 'acho', 'acha', 'bom', 'boa', 'bem', 'mal', 'tudo', 'todos', 'todas', 'cada'
]);

export class AiLiveMeetingHelper {
  /**
   * Calcula instantaneamente a nuvem de palavras local a partir do texto transcrito (0ms de latência)
   */
  public static computeLocalWordCloud(text: string, maxWords = 28): WordCloudEntry[] {
    if (!text || !text.trim()) return [];
    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'“”‘’\[\]\n\r]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !PT_STOPWORDS.has(w) && !/^\d+$/.test(w));

    const freqMap = new Map<string, number>();
    for (const w of words) {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    }

    const sorted = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords);

    if (sorted.length === 0) return [];
    const maxCount = sorted[0][1];
    const minCount = sorted[sorted.length - 1][1];
    const range = Math.max(1, maxCount - minCount);

    return sorted.map(([word, count]) => ({
      word: word.charAt(0).toUpperCase() + word.slice(1),
      count,
      weight: Math.max(2, Math.min(10, Math.round(2 + ((count - minCount) / range) * 8))),
    }));
  }

  /**
   * Resolve a lista ordenada de endpoints reais do Google Gemini API para evitar 404 e garantir resposta na 1ª chamada.
   */
  public static resolveEffectiveModels(selectedModel?: string): string[] {
    const map: Record<string, string[]> = {
      'gemini-3.8-flash': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'],
      'gemini-3.7-flash': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'],
      'gemini-3.5-flash-lite': ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-flash-latest'],
      'gemini-3.5-flash': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'],
      'gemini-3.1-pro': ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-flash-latest'],
    };
    const mapped = (selectedModel && map[selectedModel]) || [];
    return Array.from(
      new Set([
        ...mapped,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-1.5-flash',
      ])
    );
  }

  /**
   * Motor de Inteligência Instantânea Local (0ms de latência):
   * Constrói imediatamente Mapa Mental, Resumo Executivo e Atividades por Pessoa a partir das falas/notas
   * enquanto o Gemini processa em background (ou caso a chave/rede esteja indisponível).
   */
  public static buildInstantIntelligence(
    segments: Array<{ id: string; timestamp: string; text: string }>,
    users: User[] = [],
    customTitle?: string
  ): LiveMeetingIntelligence | null {
    const cleanSegments = (segments || [])
      .map((s) => ({ ...s, text: (s.text || '').trim() }))
      .filter((s) => s.text.length >= 3);

    if (cleanSegments.length === 0) return null;

    const fullText = cleanSegments.map((s) => s.text).join(' ');
    const keywords = this.computeLocalWordCloud(fullText, 28);

    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const capitalize = (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

    // Palavras comuns que NÃO são nomes de pessoas
    const NON_PERSON_WORDS = new Set([
      'reuniao', 'video', 'festa', 'arte', 'culto', 'igreja', 'grupo', 'equipe', 'domingo',
      'sabado', 'semana', 'criativamente', 'sobre', 'fazer', 'gravar', 'criar', 'postar',
      'projeto', 'evento', 'campanha', 'pauta', 'tema', 'ideia', 'decisao', 'urgente',
      'importante', 'hoje', 'amanha', 'ontem', 'depois', 'antes', 'vamos', 'precisa',
      'definir', 'organizar', 'preparar', 'enviar', 'mandar', 'falar', 'conversar'
    ]);

    const inferDemandType = (text: string): string => {
      const n = normalize(text);
      if (/\b(video|gravar|gravacao|reels|edicao|camera|filmagem|teaser)\b/.test(n)) return 'Vídeo';
      if (/\b(arte|design|flyer|cartaz|banner|carrossel|post|card|layout)\b/.test(n)) return 'Arte';
      if (/\b(foto|fotografia|cobertura|ensaio)\b/.test(n)) return 'Fotografia';
      if (/\b(texto|legenda|roteiro|copy|aviso|email)\b/.test(n)) return 'Texto';
      if (/\b(som|audio|mesa|microfone|luz|iluminacao|palco|telao)\b/.test(n)) return 'Produção / Técnica';
      return 'Planejamento';
    };

    const inferCategory = (text: string): 'DECISAO' | 'PROJETO' | 'IDEIA' | 'ALERTA' => {
      const n = normalize(text);
      if (/\b(urgente|atencao|problema|cuidado|atraso|bloqueado|falta)\b/.test(n)) return 'ALERTA';
      if (/\b(decidimos|definido|aprovado|fechado|combinado|reuniao)\b/.test(n)) return 'DECISAO';
      if (/\b(vai|gravar|fazer|criar|produzir|organizar|entregar|preparar)\b/.test(n)) return 'PROJETO';
      return 'IDEIA';
    };

    const inferChecklist = (dtype: string, text: string): string[] => {
      if (dtype === 'Vídeo') {
        return ['Alinhar roteiro e detalhes da gravação', 'Realizar captação e edição', 'Enviar prévia para aprovação'];
      }
      if (dtype === 'Arte') {
        return ['Definir referências visuais e texto', 'Criar layout da peça', 'Revisar e exportar arquivos'];
      }
      if (normalize(text).includes('reuniao')) {
        return ['Confirmar horário com os participantes', 'Alinhar pauta principal', 'Registrar definições no Kanban'];
      }
      return [`Executar: ${capitalize(text.slice(0, 60))}`, 'Validar entrega com a equipe'];
    };

    // Detecta pessoas mencionadas em uma frase (cadastradas em users OU nomes próprios na frase)
    const extractPeopleFromLine = (line: string): Array<{ name: string; matchedUser?: User }> => {
      const foundMap = new Map<string, { name: string; matchedUser?: User }>();
      const normLine = normalize(line);

      // 1. Procura usuários cadastrados na organização
      for (const u of users) {
        if (!u.name) continue;
        const firstName = u.name.trim().split(/\s+/)[0];
        const normFirst = normalize(firstName);
        const normFull = normalize(u.name);
        if (normFirst.length >= 3) {
          const regex = new RegExp(`\\b${normFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(normLine) || (normFull.length >= 4 && normLine.includes(normFull))) {
            foundMap.set(normFirst, { name: u.name, matchedUser: u });
          }
        }
      }

      // 2. Procura sujeito antes de verbo de ação (ex: "francisco vai gravar...", "Lizandra reunião com...")
      const subjectRegex = /(?:^|[.,;]\s*)([a-zA-ZÀ-ÿ]{3,16})\s+(?:vai|ira|irá|ficou|precisa|deve|reuniao|reunião|cuidara|cuidará|fara|fará|assumiu|assume|combinou)\b/gi;
      let match: RegExpExecArray | null;
      while ((match = subjectRegex.exec(line)) !== null) {
        const candidate = match[1];
        const normCand = normalize(candidate);
        if (!PT_STOPWORDS.has(normCand) && !NON_PERSON_WORDS.has(normCand) && !foundMap.has(normCand)) {
          const matchedUser = users.find((u) => normalize(u.name).includes(normCand));
          foundMap.set(normCand, {
            name: matchedUser ? matchedUser.name : capitalize(candidate.toLowerCase()),
            matchedUser,
          });
        }
      }

      // 3. Procura nomes após "com", "e", "para" (ex: "com Hugo", "com Francisco e Belle")
      const afterPrepRegex = /\b(?:com|para|pro|pra|e)\s+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ]{2,15})(?:\s+e\s+([A-ZÀ-Ÿ][a-zA-ZÀ-ÿ]{2,15}))?/g;
      while ((match = afterPrepRegex.exec(line)) !== null) {
        for (const group of [match[1], match[2]]) {
          if (!group) continue;
          const normCand = normalize(group);
          if (!PT_STOPWORDS.has(normCand) && !NON_PERSON_WORDS.has(normCand) && !foundMap.has(normCand)) {
            const matchedUser = users.find((u) => normalize(u.name).includes(normCand));
            foundMap.set(normCand, {
              name: matchedUser ? matchedUser.name : capitalize(group.toLowerCase()),
              matchedUser,
            });
          }
        }
      }

      return Array.from(foundMap.values());
    };

    const peopleMap = new Map<string, PersonActivitySummary>();
    const branches: MindMapBranch[] = [];
    const keyDecisions: string[] = [];
    const openQuestions: string[] = [];

    cleanSegments.forEach((seg, idx) => {
      const text = seg.text;
      const people = extractPeopleFromLine(text);
      const dtype = inferDemandType(text);
      const category = inferCategory(text);
      const cleanTitle = capitalize(text.replace(/^[-\s•*]+/, ''));

      // Decisões e Perguntas
      if (text.includes('?') || /\b(duvida|dúvida|como|quando|qual|definir)\b/i.test(text)) {
        openQuestions.push(cleanTitle);
      } else {
        keyDecisions.push(cleanTitle);
      }

      // Ramo do Mapa Mental (até 6 ramos principais)
      if (branches.length < 6) {
        const words = text.split(/\s+/);
        const shortLabel = words.length > 5 ? words.slice(0, 5).join(' ') + '...' : cleanTitle;
        const children: Array<{ id: string; label: string }> = [
          { id: `c_${idx}_1`, label: cleanTitle.slice(0, 70) },
        ];
        if (people.length > 0) {
          children.push({
            id: `c_${idx}_2`,
            label: `Envolvidos: ${people.map((p) => p.name).join(', ')}`,
          });
        }
        children.push({
          id: `c_${idx}_3`,
          label: `Categoria: ${dtype}`,
        });

        branches.push({
          id: `b_${idx}`,
          label: capitalize(shortLabel),
          category,
          children,
        });
      }

      // Atividades por Pessoa
      const targets =
        people.length > 0
          ? people
          : [{ name: 'A Definir', matchedUser: undefined }];

      targets.forEach((person) => {
        const key = normalize(person.name);
        const existing = peopleMap.get(key) || {
          personName: person.name,
          matchedUserId: person.matchedUser?.id,
          roleOrMinistry:
            person.name === 'A Definir'
              ? 'Pendente de Definição'
              : (person.matchedUser as any)?.ministry || (person.matchedUser as any)?.department || 'Membro da Equipe',
          summary:
            person.name === 'A Definir'
              ? 'Demandas gerais identificadas aguardando definição de responsável.'
              : `Atividades e alinhamentos envolvendo ${person.name} na reunião.`,
          tasks: [],
        };

        const otherPeople = people.filter((p) => normalize(p.name) !== key).map((p) => p.name);
        const taskDesc =
          otherPeople.length > 0
            ? `${cleanTitle} (Em conjunto com: ${otherPeople.join(', ')}) — Registrado às ${seg.timestamp}`
            : `${cleanTitle} — Registrado às ${seg.timestamp}`;

        existing.tasks.push({
          title: cleanTitle,
          description: taskDesc,
          priority: category === 'ALERTA' ? 'Urgente' : 'Alta',
          demandType: dtype,
          checklist: inferChecklist(dtype, text),
        });

        peopleMap.set(key, existing);
      });
    });

    const topKeywords = keywords.slice(0, 2).map((k) => k.word);
    const centralTopic =
      (customTitle && customTitle.trim()) ||
      (topKeywords.length > 0 ? `Pauta: ${topKeywords.join(' & ')}` : 'Reunião em Andamento');

    const executiveSummary =
      cleanSegments.length === 1
        ? `Pauta iniciada abordando: "${cleanSegments[0].text}".`
        : `Reunião com ${cleanSegments.length} tópicos registrados até o momento. Principais pontos discutidos: ${cleanSegments
            .slice(0, 4)
            .map((s) => capitalize(s.text))
            .join(' • ')}.`;

    return {
      centralTopic,
      executiveSummary,
      keyDecisions: keyDecisions.slice(0, 6),
      openQuestions: openQuestions.slice(0, 4),
      mindMap: {
        centralTopic,
        branches,
      },
      keywords,
      peopleActivities: Array.from(peopleMap.values()),
      rawTasks: [],
    };
  }

  /**
   * Analisa a transcrição acumulada da reunião em tempo real via Gemini e devolve Mapa Mental,
   * Resumo Executivo, Palavras-Chave e Atividades por Pessoa.
   */
  public static async analyzeLiveMeeting({
    transcriptText,
    apiKey,
    model = 'gemini-3.8-flash',
    context,
  }: {
    transcriptText: string;
    apiKey: string;
    model?: string;
    context: {
      organizationName: string;
      users: User[];
      events: ChurchEvent[];
      campuses: Campus[];
      demandTypes: DemandTypeDefinition[];
    };
  }): Promise<{ success: boolean; data?: LiveMeetingIntelligence; error?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        error: 'Chave da API do Gemini não configurada.',
      };
    }

    if (!transcriptText || transcriptText.trim().length < 10) {
      return {
        success: false,
        error: 'Aguardando mais conteúdo falado na reunião para processar.',
      };
    }

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });

    const memberNames = context.users.map((u) => u.name).join(', ') || 'Equipe Geral';
    const eventNames = context.events.map((e) => e.title).join(', ') || 'Geral';
    const demandTypeNames = context.demandTypes.map((dt) => dt.label).join(', ') || 'Arte, Vídeo, Social Media, Texto';

    const prompt = `Você é o núcleo de inteligência J.A.R.V.I.S. acompanhando ao vivo uma reunião da organização "${context.organizationName}".
Analise a transcrição até o momento e gere uma estrutura completa em JSON contendo:
1. Mapa Mental estruturado (tema central, até 5 ramos principais e 2 a 4 sub-nós por ramo).
2. Resumo executivo da reunião, decisões já tomadas e pontos em aberto.
3. Palavras-chave e conceitos de maior impacto (com peso de 1 a 10).
4. Resumo de atividades e entregas por pessoa com tarefas estruturadas para o Kanban.

DATA DE REFERÊNCIA: ${currentDateStr} (${dayOfWeek})
MEMBROS CADASTRADOS: [${memberNames}]
EVENTOS/PROJETOS: [${eventNames}]
TIPOS DE DEMANDA: [${demandTypeNames}]

DIRETRIZ CRÍTICA DE ATRIBUIÇÃO DE RESPONSÁVEIS:
- Em reuniões de equipe, ideias e demandas são debatidas coletivamente.
- NUNCA atribua arbitrariamente uma tarefa a uma pessoa a menos que ela tenha sido EXPLICITAMENTE indicada ou comandada na conversa (ex: "Thiago você faz isso", "Dinho cuida dos cabos", "Fulano assume", ou alguém dizendo "eu assumo...").
- Quando uma tarefa ou ação surgir MAS NINGUÉM foi expressamente citado como responsável, coloque OBRIGATORIAMENTE:
  "personName": "A Definir"
  "roleOrMinistry": "Pendente de Definição"
  (Assim o usuário selecionará o responsável da lista de membros diretamente na tela antes de exportar).
- Se uma pessoa cadastrada foi expressamente indicada, use o nome exato contido em [${memberNames}].

Retorne ESTRITAMENTE este formato JSON válido (sem markdown em volta):
{
  "centralTopic": "Título curto do tema central da reunião",
  "executiveSummary": "Resumo claro e direto do que foi discutido até agora em 2-4 frases.",
  "keyDecisions": ["Decisão 1", "Decisão 2"],
  "openQuestions": ["Ponto em aberto ou dúvida 1"],
  "mindMap": {
    "centralTopic": "Tema Central",
    "branches": [
      {
        "id": "b1",
        "label": "Tópico Principal 1",
        "category": "PROJETO",
        "children": [
          { "id": "c1", "label": "Sub-item ou definição 1.1" },
          { "id": "c2", "label": "Sub-item ou definição 1.2" }
        ]
      }
    ]
  },
  "keywords": [
    { "word": "Conferência", "weight": 10 },
    { "word": "Vídeo", "weight": 8 }
  ],
  "peopleActivities": [
    {
      "personName": "Nome da Pessoa (se citado expressamente) OU 'A Definir'",
      "roleOrMinistry": "Papel citado OU 'Pendente de Definição'",
      "summary": "Síntese do que essa pessoa falou/assumiu, ou resumo das ações gerais pendentes de responsável",
      "tasks": [
        {
          "title": "Ação específica",
          "description": "Contexto e detalhes explicativos da demanda discutida",
          "deadline": "YYYY-MM-DD",
          "priority": "Alta",
          "demandType": "Vídeo",
          "checklist": ["Subtarefa 1", "Subtarefa 2"]
        }
      ]
    }
  ],
  "rawTasks": [
    {
      "titulo": "Título da demanda",
      "descricao_orientacoes": "Contexto",
      "status": "Em Andamento",
      "prioridade": "Alta",
      "tipo": "Vídeo",
      "datas": {
        "data_inicio": "${currentDateStr}",
        "prazo_final": "YYYY-MM-DD"
      },
      "responsaveis": [{ "nome": "Nome ou A Definir", "selecionado": true }],
      "checklist_subtarefas": [{ "titulo": "Etapa 1", "concluida": false }]
    }
  ]
}`;

    const modelsToTry = this.resolveEffectiveModels(model);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${prompt}\n\n--- TRANSCRIÇÃO AO VIVO DA REUNIÃO ---\n${transcriptText}` }],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2,
      },
    };

    let lastError = 'Não foi possível sincronizar a inteligência da reunião neste ciclo.';

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      const nextCandidate = modelsToTry[i + 1];

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData?.error?.message || `HTTP ${res.status}`;
          lastError = msg;

          if (res.status === 400 || res.status === 403) {
            if (msg.toLowerCase().includes('key')) {
              return { success: false, error: 'Chave Gemini inválida. Verifique sua configuração de chave.' };
            }
          }
          if ((res.status === 429 || res.status === 503) && nextCandidate) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          continue;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let parsed: LiveMeetingIntelligence;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        // Faz o match de cada pessoa com os usuários reais da organização
        if (Array.isArray(parsed.peopleActivities)) {
          parsed.peopleActivities = parsed.peopleActivities.map((pa) => {
            const rawName = (pa.personName || '').trim();
            const lower = rawName.toLowerCase();

            const isUnassigned =
              !rawName ||
              lower.includes('definir') ||
              lower.includes('pendente') ||
              lower.includes('ninguém') ||
              lower.includes('ninguem') ||
              lower.includes('equipe') ||
              lower.includes('geral') ||
              lower.includes('a designar') ||
              lower.includes('não atribuído') ||
              lower.includes('nao atribuido') ||
              lower.includes('sem responsável');

            if (isUnassigned) {
              return {
                ...pa,
                personName: 'A Definir',
                roleOrMinistry: pa.roleOrMinistry || 'Pendente de Definição',
                matchedUserId: undefined,
              };
            }

            const matchedUser = context.users.find(
              (u) =>
                u.name.toLowerCase() === lower ||
                u.name.toLowerCase().includes(lower) ||
                (rawName.length >= 3 && lower.includes(u.name.split(' ')[0].toLowerCase()))
            );

            return {
              ...pa,
              matchedUserId: matchedUser?.id,
              personName: matchedUser ? matchedUser.name : rawName,
            };
          });
        }

        return { success: true, data: parsed };
      } catch (err: any) {
        console.warn(`[Jarvis Live Meeting] Falha com modelo ${currentModel}:`, err);
        lastError = err?.message || lastError;
      }
    }

    return {
      success: false,
      error: lastError,
    };
  }
}

export class AiTranscriptionService {
  /**
   * Obtém a chave do Gemini configurada para o usuário no tenant específico.
   * Prioridade:
   * 1. localStorage do usuário no tenant atual
   * 2. VITE_GEMINI_API_KEY no .env (fallback opcional de desenvolvimento)
   */
  public static getApiKey(orgId: string, userId: string): string {
    const key = `${STORAGE_KEY_PREFIX}_${orgId}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored && stored.trim()) {
      return stored.trim();
    }
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    return envKey ? envKey.trim() : '';
  }

  /**
   * Salva a chave do Gemini com isolamento estrito por tenant e por usuário.
   */
  public static setApiKey(orgId: string, userId: string, key: string): void {
    const storageKey = `${STORAGE_KEY_PREFIX}_${orgId}_${userId}`;
    if (!key.trim()) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, key.trim());
    }
  }

  /**
   * Obtém o modelo preferido pelo usuário no tenant.
   */
  public static getSelectedModel(orgId: string, userId: string): AiModelId {
    const storageKey = `${STORAGE_MODEL_PREFIX}_${orgId}_${userId}`;
    const stored = localStorage.getItem(storageKey) as AiModelId;
    if (stored && AI_MODELS.some((m) => m.id === stored)) {
      // Migra modelos legados/descontinuados para o 3.8-flash
      if ((stored as string) === 'gemini-3.6-flash' || (stored as string) === 'gemini-2.5-flash' || (stored as string) === 'gemini-2.5-flash-lite') {
        localStorage.setItem(storageKey, 'gemini-3.8-flash');
        return 'gemini-3.8-flash';
      }
      return stored;
    }
    return 'gemini-3.8-flash';
  }

  /**
   * Salva o modelo selecionado pelo usuário no tenant.
   */
  public static setSelectedModel(orgId: string, userId: string, model: AiModelId): void {
    const storageKey = `${STORAGE_MODEL_PREFIX}_${orgId}_${userId}`;
    localStorage.setItem(storageKey, model);
  }

  /**
   * Processa anotações brutas de reunião ou transcrições do Granola usando a API do Gemini.
   */
  public static async extractTasksFromTranscript({
    transcriptText,
    apiKey,
    model = 'gemini-3.8-flash',
    context,
    onProgress,
  }: {
    transcriptText: string;
    apiKey: string;
    model?: string;
    context: {
      organizationName: string;
      users: User[];
      events: ChurchEvent[];
      campuses: Campus[];
      demandTypes: DemandTypeDefinition[];
    };
    onProgress?: (msg: string) => void;
  }): Promise<{ success: boolean; tasks?: AiTaskItem[]; summary?: string; error?: string; usedFallbackModel?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        error: 'Chave da API do Google Gemini não informada. Configure sua chave individual para continuar.',
      };
    }

    if (!transcriptText || transcriptText.trim().length < 10) {
      return {
        success: false,
        error: 'Por favor, cole um texto com mais detalhes da reunião ou ata para análise.',
      };
    }

    const today = new Date();
    const currentDateStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });

    const memberNames = context.users.map((u) => u.name).join(', ') || 'Nenhum membro cadastrado';
    const eventNames = context.events.map((e) => e.title).join(', ') || 'Nenhum evento cadastrado';
    const campusNames = context.campuses.map((c) => c.name).join(', ') || 'Sede Principal';
    const demandTypeNames = context.demandTypes.map((dt) => dt.label).join(', ') || 'Arte, Vídeo, Social Media, Texto';

    const systemInstruction = `Você é um assistente sênior de gestão de projetos para equipes ministeriais e de marketing da igreja/organização "${context.organizationName}".
Sua tarefa é analisar uma transcrição ou anotações brutas de reunião (vindo de ferramentas como Granola, Otter, Whisper ou ata manuscrita) e extrair TODAS as tarefas, demandas e planos de ação acordados.

--- DIRETRIZES DE EXTRAÇÃO ---
1. IDENTIFICAÇÃO DE DEMANDAS: Cada ação combinada, material a ser produzido, vídeo, arte, postagem, cobertura ou evento deve se tornar um item de tarefa individual.
2. RESPONSÁVEIS: Identifique o nome das pessoas designadas para cada tarefa com base na lista de membros da igreja: [${memberNames}]. Se houver menção ao nome, associe no campo responsaveis.
3. DATAS & PRAZOS:
   - Data atual de referência: ${currentDateStr} (${dayOfWeek}).
   - Se disser "até sexta-feira", calcule a data da próxima sexta a partir de ${currentDateStr}.
   - Se disser "para o culto de domingo", calcule a data do próximo domingo.
   - Formato estrito: YYYY-MM-DD.
4. CAMPUS: Se mencionado, associe a um dos campi: [${campusNames}].
5. PROJETO / EVENTO: Se a tarefa fizer parte de um evento específico da igreja, associe a: [${eventNames}].
6. TIPO DE DEMANDA: Classifique segundo os tipos existentes: [${demandTypeNames}].
7. CHECKLIST: Se a tarefa tiver subtarefas, etapas de aprovação ou marcos, liste no checklist_subtarefas.

--- FORMATO DE SAÍDA ---
Responda ESTRITAMENTE em formato JSON válido, sem qualquer texto introdutório ou markdown antes ou depois. Use exatamente esta estrutura:
{
  "resumo_reuniao": "Breve síntese executiva das decisões da reunião em 2 ou 3 frases.",
  "tarefas": [
    {
      "titulo": "Título sucinto e claro da demanda",
      "descricao_orientacoes": "Instruções completas e contexto mencionado na reunião",
      "status": "Em Andamento",
      "prioridade": "Alta",
      "tipo": "Tipo adequado",
      "campus_unidade": "Nome do campus ou Geral",
      "projeto_evento": "Nome do evento ou vazio",
      "estimativa": "Pequeno, Médio ou Grande",
      "datas": {
        "data_inicio": "${currentDateStr}",
        "prazo_final": "YYYY-MM-DD"
      },
      "responsaveis": [
        { "nome": "Nome do Responsável", "selecionado": true }
      ],
      "checklist_subtarefas": [
        { "titulo": "Subetapa 1", "concluida": false, "responsavel": "Nome", "prazo": "YYYY-MM-DD" }
      ]
    }
  ]
}`;

    // Lista ordenada de modelos a testar com fallback automático
    const modelsToTry = AiLiveMeetingHelper.resolveEffectiveModels(model);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemInstruction}\n\n--- TRANSCRIÇÃO / ANOTAÇÕES DA REUNIÃO ---\n${transcriptText}`,
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2,
      },
    };

    let lastErrorMessage = '';

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      const isFallback = i > 0;
      const nextCandidate = modelsToTry[i + 1];

      try {
        if (isFallback) {
          onProgress?.(`Modelo alternativo acionado: ${currentModel}. Interpretando reunião...`);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Erro ${res.status}: ${res.statusText}`;
          lastErrorMessage = errMsg;

          // Se a chave for inválida ou não autorizada, não adianta tentar outro modelo
          if (res.status === 400 || res.status === 403) {
            if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('key not valid') || errMsg.toLowerCase().includes('apikey')) {
              return {
                success: false,
                error: 'Chave do Gemini inválida ou sem permissão. Verifique sua chave no Google AI Studio.',
              };
            }
          }

          // Se o modelo está sobrecarregado (503) ou atingiu rate limit (429) ou modelo não existe (404)
          if (res.status === 503 || res.status === 429 || res.status === 404) {
            if (nextCandidate) {
              const reason = res.status === 503 ? 'sobrecarregado no Google' : res.status === 429 ? 'atingiu limite de taxa' : 'não disponível';
              console.warn(`[AI Transcription] Modelo ${currentModel} ${reason} (${res.status}). Acionando fallback para ${nextCandidate}...`);
              onProgress?.(`O modelo ${currentModel} está ${reason} (HTTP ${res.status}). Tentando automaticamente ${nextCandidate}...`);
              await new Promise((resolve) => setTimeout(resolve, 1200));
              continue; // Tenta o próximo modelo
            } else {
              if (res.status === 503) {
                return {
                  success: false,
                  error: 'Os servidores do Google Gemini estão temporariamente com alta demanda/sobrecarga (HTTP 503). Aguarde 1 minuto e tente novamente.',
                };
              }
              if (res.status === 429) {
                return {
                  success: false,
                  error: 'Limite de requisições excedido na sua chave Gemini (Rate limit). Aguarde alguns instantes.',
                };
              }
            }
          }

          if (!nextCandidate) {
            return {
              success: false,
              error: `Falha na comunicação com o Gemini: ${errMsg}`,
            };
          }
          continue;
        }

        const data = await res.json();
        const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawResponseText) {
          if (nextCandidate) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          return {
            success: false,
            error: 'A IA não retornou conteúdo. Tente novamente com um trecho diferente de texto.',
          };
        }

        let parsed: AiExtractionResponse;
        try {
          parsed = JSON.parse(rawResponseText);
        } catch (parseErr) {
          const cleaned = rawResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        if (!parsed || !Array.isArray(parsed.tarefas)) {
          if (nextCandidate) {
            continue;
          }
          return {
            success: false,
            error: 'A resposta da IA não continha a lista de tarefas esperada. Verifique as anotações.',
          };
        }

        return {
          success: true,
          tasks: parsed.tarefas,
          summary: parsed.resumo_reuniao,
          usedFallbackModel: isFallback ? currentModel : undefined,
        };
      } catch (networkErr: any) {
        console.warn(`[AI Transcription] Erro de rede com modelo ${currentModel}:`, networkErr?.message);
        if (nextCandidate) {
          onProgress?.(`Oscilação de rede ao contatar ${currentModel}. Alternando para ${nextCandidate}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        lastErrorMessage = networkErr?.message || 'Falha de conexão com os servidores do Google Gemini.';
      }
    }

    return {
      success: false,
      error: lastErrorMessage || 'Falha ao processar com os modelos disponíveis do Gemini. Tente novamente em instantes.',
    };
  }
}
