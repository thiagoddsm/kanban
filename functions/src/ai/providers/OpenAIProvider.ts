import OpenAI from 'openai';
import { AIProvider, AIInput, AIResponse, AITool, ToolResult } from './AIProvider';
import { getOikoToolsDefinition, handleOikoToolExecution } from '../aiTools';

export class OpenAIProvider implements AIProvider {
  private openai: OpenAI;

  constructor(tenantApiKey?: string) {
    // Usa a chave do tenant se fornecida, senão usa a chave global do Oiko
    const apiKey = tenantApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key da OpenAI não configurada (Nem no Tenant, nem Global).");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(input: AIInput): Promise<AIResponse> {
    const messages: any[] = [
      { role: 'system', content: input.systemPrompt },
      ...(input.history || []),
      { role: 'user', content: input.userMessage }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o-mini', // Configurável
        messages,
        tools: getOikoToolsDefinition() as any, // Carrega o Tool Registry do Oiko
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;

      // Se a IA decidiu chamar uma ou mais ferramentas
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Exemplo simples (Fase 0): Executando apenas a 1ª tool chamada e retornando o resultado
        // Em Fase 1+, faremos um loop robusto alimentando a OpenAI com os resultados.
        const toolCall = message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);
        
        const toolResult = await this.executeTool({
          name: toolCall.function.name,
          arguments: args
        }, input.context);

        return {
          text: `Ação executada: ${toolCall.function.name}. Resultado: ${toolResult.message || 'Sucesso'}`,
          toolCalls: message.tool_calls,
          data: toolResult.data
        };
      }

      return {
        text: message.content || '',
      };
    } catch (error) {
      console.error('OpenAI Error:', error);
      throw error;
    }
  }

  async executeTool(tool: AITool, context: AIInput['context']): Promise<ToolResult> {
    return handleOikoToolExecution(tool.name, tool.arguments, context);
  }
}
