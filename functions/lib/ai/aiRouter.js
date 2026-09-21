"use strict";
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
    // Extrai a chave específica do Tenant (se a igreja contratou o próprio pacote de IA) 
    // ou cai no fallback da chave global do Oiko.
    const tenantApiKey = orgData?.aiSettings?.apiKey || null;
    const aiProvider = new OpenAIProvider_1.OpenAIProvider(tenantApiKey);
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