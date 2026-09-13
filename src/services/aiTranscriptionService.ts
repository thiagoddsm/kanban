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
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Padrão • Rápido e Gratuito' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Nova Geração • Alta Precisão' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Avançado • Experimental' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Raciocínio Profundo • Textos Longos' },
] as const;

export type AiModelId = typeof AI_MODELS[number]['id'];

const STORAGE_KEY_PREFIX = 'oiko_ai_gemini_key_v1';
const STORAGE_MODEL_PREFIX = 'oiko_ai_gemini_model_v1';

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
      return stored;
    }
    return 'gemini-1.5-flash';
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
    model = 'gemini-1.5-flash',
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
  }): Promise<{ success: boolean; tasks?: AiTaskItem[]; summary?: string; error?: string }> {
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

DATA ATUAL DE REFERÊNCIA: ${currentDateStr} (${dayOfWeek}).
Use esta data para calcular prazos relativos citados na conversa (ex: "até sexta-feira", "na próxima semana", "fim do mês"). O formato de data deve ser estritamente YYYY-MM-DD.

MEMBROS DA EQUIPE CADASTRADOS NO SISTEMA:
${memberNames}
SEMPRE tente mapear os responsáveis das tarefas aos nomes exatos desta lista quando mencionados.

PROJETOS / EVENTOS ATIVOS:
${eventNames}
Se a tarefa pertencer a um desses projetos ou eventos, associe exatamente o nome dele.

CAMPI / UNIDADES:
${campusNames}

TIPOS DE DEMANDA VÁLIDOS:
${demandTypeNames}

REGRAS DE FORMATAÇÃO:
1. Retorne APENAS um objeto JSON válido. Não inclua blocos markdown como \`\`\`json ou texto explicativo fora do JSON.
2. Cada tarefa deve ser um item de ação claro e acionável.
3. Se houver etapas menores mencionadas na reunião, adicione-as no campo "checklist_subtarefas" da tarefa principal.
4. "prioridade" deve ser estritamente uma de: "Baixa", "Média", "Alta" ou "Urgente".
5. "status" pode ser "Em Triagem", "Em Andamento" ou "Planejamento".

ESTRUTURA JSON EXIGIDA:
{
  "resumo_reuniao": "Breve resumo de 1 a 2 parágrafos dos principais pontos discutidos",
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
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

        if (res.status === 400 || res.status === 403) {
          if (errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('key not valid') || errMsg.toLowerCase().includes('apikey')) {
            return {
              success: false,
              error: 'Chave do Gemini inválida ou sem permissão. Verifique sua chave no Google AI Studio.',
            };
          }
        }
        if (res.status === 404) {
          return {
            success: false,
            error: `O modelo "${model}" não foi encontrado ou não está disponível para esta chave. Experimente selecionar o Gemini 1.5 Flash.`,
          };
        }
        if (res.status === 429) {
          return {
            success: false,
            error: 'Limite de requisições excedido na sua chave Gemini (Rate limit). Aguarde alguns instantes.',
          };
        }

        return {
          success: false,
          error: `Falha na comunicação com o Gemini: ${errMsg}`,
        };
      }

      const data = await res.json();
      const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawResponseText) {
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
        return {
          success: false,
          error: 'A resposta da IA não continha a lista de tarefas esperada. Verifique as anotações.',
        };
      }

      return {
        success: true,
        tasks: parsed.tarefas,
        summary: parsed.resumo_reuniao,
      };
    } catch (err: any) {
      console.error('Erro ao chamar Gemini API:', err);
      return {
        success: false,
        error: err?.message || 'Falha de conexão com os servidores do Google Gemini.',
      };
    }
  }
}
