export interface AIInput {
  systemPrompt: string;
  userMessage: string;
  history?: any[];
  context: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

export interface AIResponse {
  text: string;
  toolCalls?: any[];
  data?: any; // Informações que a UI possa precisar renderizar de forma customizada
}

export interface AITool {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface AIProvider {
  generateResponse(input: AIInput): Promise<AIResponse>;
  executeTool(tool: AITool, context: AIInput['context']): Promise<ToolResult>;
}
