"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAIPrompt = handleAIPrompt;
const firestore_1 = require("firebase-admin/firestore");
const aiPermissions_1 = require("./aiPermissions");
const OpenAIProvider_1 = require("./providers/OpenAIProvider");
const aiMemory_1 = require("./aiMemory");
async function handleAIPrompt(userId, tenantId, message, history) {
    // 1. Validar Acesso Real do Usuário à Organização (Zero Trust Layer)
    const membership = await (0, aiPermissions_1.validateTenantAccess)(userId, tenantId);
    // 2. Montar Contexto Básico
    const db = (0, firestore_1.getFirestore)();
    const userRef = await db.collection('users').doc(userId).get();
    const userData = userRef.data();
    const orgRef = await db.collection('organizations').doc(tenantId).get();
    const orgData = orgRef.data();
    // 3. Buscar Memória Semântica
    const semanticMemory = await (0, aiMemory_1.getSemanticMemory)(tenantId, userId);
    const systemContext = `
    Você é o "Oiko IA", um assistente inteligente do sistema Oiko Gestão.
    Você está ajudando o usuário ${userData?.name || 'Membro'} (Papel: ${membership.role}).
    A organização atual é ${orgData?.name || 'Igreja'}.
    
    Sua função é auxiliar na gestão de membros, tarefas, eventos e painéis usando as ferramentas disponíveis.
    
    ${semanticMemory}
    
    INSTRUÇÕES COMPORTAMENTAIS:
    - Baseie-se SEMPRE na Memória Semântica para personalizar seu tom e saber detalhes do usuário.
    - Se o usuário pedir para você lembrar de algo, use a ferramenta de atualizar memória.
  `;
    // 3. Inicializar o Provedor de IA (Inversão de Dependência)
    // Extrai a chave específica do Tenant ou cai no fallback global
    const tenantApiKey = orgData?.aiSettings?.apiKey || null;
    const preferredProvider = orgData?.aiSettings?.provider || process.env.AI_PROVIDER || 'gemini'; // 'openai' ou 'gemini'
    let aiProvider;
    if (preferredProvider === 'gemini') {
        const { GeminiProvider } = await Promise.resolve().then(() => __importStar(require('./providers/GeminiProvider')));
        aiProvider = new GeminiProvider(tenantApiKey);
    }
    else {
        aiProvider = new OpenAIProvider_1.OpenAIProvider(tenantApiKey);
    }
    // 4. Executar Prompt (o provedor já deve ter as Tools injetadas na sua configuração)
    const response = await aiProvider.generateResponse({
        systemPrompt: systemContext,
        userMessage: message,
        history: history,
        context: { userId, tenantId, role: membership.role }
    });
    return response;
}
//# sourceMappingURL=aiRouter.js.map