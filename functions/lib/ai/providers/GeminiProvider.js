"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const genai_1 = require("@google/genai");
const aiTools_1 = require("../aiTools");
class GeminiProvider {
    ai;
    constructor(tenantApiKey) {
        const apiKey = tenantApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("API Key do Gemini não configurada.");
        }
        this.ai = new genai_1.GoogleGenAI({ apiKey });
    }
    async generateResponse(input) {
        const toolsDefinition = (0, aiTools_1.getOikoToolsDefinition)();
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
        let response;
        try {
            response = await this.ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                    systemInstruction,
                    tools: geminiTools
                }
            });
        }
        catch (err) {
            if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('Quota')) {
                return {
                    text: "Poxa, atingimos o limite de velocidade do nosso plano gratuito na IA do Google. Você poderia aguardar só um minutinho e tentar de novo?"
                };
            }
            throw err;
        }
        // Handle Tool Calling Loop (Oiko Engine -> Function Execution -> Gemini Callback)
        while (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            const toolName = call.name || '';
            const args = call.args;
            let result;
            try {
                result = await this.executeTool({ name: toolName, arguments: args }, input.context);
            }
            catch (e) {
                result = { error: e.message };
            }
            // Adiciona a chamada que a IA fez no histórico
            contents.push({
                role: 'model',
                parts: [{ functionCall: call }]
            });
            // Devolve o resultado pro Gemini
            contents.push({
                role: 'user',
                parts: [{ functionResponse: { name: toolName, response: result } }]
            });
            try {
                response = await this.ai.models.generateContent({
                    model: modelName,
                    contents,
                    config: {
                        systemInstruction,
                        tools: geminiTools
                    }
                });
            }
            catch (err) {
                if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('Quota')) {
                    return {
                        text: "Poxa, atingimos o limite de velocidade do plano gratuito do Google ao tentar concluir a ação. Aguarde um minutinho."
                    };
                }
                throw err;
            }
        }
        return {
            text: response.text || "Sem resposta compreensível."
        };
    }
    async executeTool(tool, context) {
        return (0, aiTools_1.handleOikoToolExecution)(tool.name, tool.arguments, context);
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=GeminiProvider.js.map