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
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Estável • Recomendado' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tag: 'Alta Capacidade' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Ultra Rápido' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Avançado' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', tag: 'Raciocínio Profundo' },
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
      // Se o usuário tinha ficado com o 3.6-flash salvo no navegador (que está com instabilidade no Google), migra para o 2.5-flash
      if (stored === 'gemini-3.6-flash') {
        localStorage.setItem(storageKey, 'gemini-2.5-flash');
        return 'gemini-2.5-flash';
      }
      return stored;
    }
    return 'gemini-2.5-flash';
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
    model = 'gemini-2.5-flash',
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
    const rawFallbackList = [model, 'gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    const modelsToTry: string[] = [];
    for (const m of rawFallbackList) {
      if (m && !modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    }

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
