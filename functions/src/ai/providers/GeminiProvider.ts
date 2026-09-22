import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIInput, AIResponse, AITool, ToolResult } from './AIProvider';
import { getOikoToolsDefinition, handleOikoToolExecution } from '../aiTools';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor(tenantApiKey?: string) {
    const apiKey = tenantApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key do Gemini não configurada.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateResponse(input: AIInput): Promise<AIResponse> {
    const toolsDefinition = getOikoToolsDefinition();
    
    // Converte o formato do Oiko Tools (OpenAI JSON Schema) para o Formato Gemini
    const geminiTools = [{
      functionDeclarations: toolsDefinition.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      }))
    }];

    const systemInstruction = input.systemPrompt;
    
    // Converte histórico para o formato do Gemini
    let contents = (input.history || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: input.userMessage }]
    });

    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

    let response = await this.ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        tools: geminiTools as any
      }
    });

    // Handle Tool Calling Loop (Oiko Engine -> Function Execution -> Gemini Callback)
    while (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const toolName = call.name || '';
      const args = call.args;

      let result;
      try {
         result = await this.executeTool({ name: toolName, arguments: args as any }, input.context);
      } catch (e: any) {
         result = { error: e.message };
      }

      // Adiciona a chamada que a IA fez no histórico
      contents.push({
        role: 'model',
        parts: [{ functionCall: call } as any]
      });

      // Devolve o resultado pro Gemini
      contents.push({
        role: 'user', 
        parts: [{ functionResponse: { name: toolName, response: result } } as any]
      });

      response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: geminiTools as any
        }
      });
    }

    return {
      text: response.text || "Sem resposta compreensível."
    };
  }

  async executeTool(tool: AITool, context: AIInput['context']): Promise<ToolResult> {
    return handleOikoToolExecution(tool.name, tool.arguments, context);
  }
}
