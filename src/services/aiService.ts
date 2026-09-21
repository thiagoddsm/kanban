import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  data?: any; // Dados extras da ação (ex: { taskId: '...' })
}

export const AIService = {
  /**
   * Envia uma mensagem para o Oiko IA Engine (Callable Function).
   * @param message Texto digitado/falado pelo usuário.
   * @param tenantId ID da organização atual para validação de contexto/autorização.
   * @param history Histórico de mensagens atual da sessão (Opcional, Fase 1).
   */
  async sendMessage(message: string, tenantId: string, history: AIMessage[] = []): Promise<AIMessage> {
    if (!functions) throw new Error("Firebase Functions não inicializado.");

    const agentFn = httpsCallable(functions, 'oikoAIAgent');

    // Prepara o formato esperado pela OpenAI no histórico
    const formattedHistory = history.map(h => ({
      role: h.role,
      content: h.content
    }));

    try {
      const result = await agentFn({
        message,
        tenantId,
        history: formattedHistory
      });

      const responseData = (result.data as any).data; // A function retorna { success: true, data: { text: '...', data: {} } }
      
      return {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: responseData.text,
        timestamp: new Date().toISOString(),
        data: responseData.data
      };
    } catch (error: any) {
      console.error("Erro ao comunicar com o Oiko IA:", error);
      throw error;
    }
  }
};
