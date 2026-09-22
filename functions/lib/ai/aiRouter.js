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
    const role = membership.role;
    const memoryItems = semanticMemory;
    const systemPrompt = `
    Você é o assistente virtual da organização "${orgData?.name || 'Oiko Gestão'}".
    Seu nome é Oiko IA. Você é inteligente, proativo e prestativo.
    
    INSTRUÇÕES DE TOM E ESTILO (CRÍTICO):
    - Você agora está funcionando em um modo de VOZ / Chat ao Vivo.
    - Suas respostas serão LIDAS EM ÁUDIO para o usuário.
    - Portanto, seja NATURAL, DIRETO e CONVERSACIONAL. Aja como um humano em uma ligação.
    - NÃO use formatações complexas, markdown pesado, listas longas ou tabelas, pois o sintetizador de voz não lerá isso bem.
    - Vá direto ao ponto, não fique repetindo introduções robóticas.
    
    CONTEXTO DO USUÁRIO ATUAL:
    - ID do Usuário: ${userId}
    - Nome do Usuário: ${userData?.displayName || userData?.name || 'Usuário'}
    - Organização: ${orgData?.name}
    - Papel: ${role}

    MEMÓRIA SEMÂNTICA (Fatos e preferências lembradas a longo prazo):
    ${memoryItems}

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
        systemPrompt: systemPrompt,
        userMessage: message,
        history: history,
        context: { userId, tenantId, role: membership.role }
    });
    return response;
}
//# sourceMappingURL=aiRouter.js.map