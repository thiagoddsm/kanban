import { getFirestore } from 'firebase-admin/firestore';
import { validateTenantAccess } from './aiPermissions';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { getSemanticMemory } from './aiMemory';

export async function handleAIPrompt(userId: string, tenantId: string, message: string, history: any[]) {
  // 1. Validar Acesso Real do Usuário à Organização (Zero Trust Layer)
  const membership = await validateTenantAccess(userId, tenantId);
  
  // 2. Montar Contexto Básico
  const db = getFirestore();
  const userRef = await db.collection('users').doc(userId).get();
  const userData = userRef.data();
  
  const orgRef = await db.collection('organizations').doc(tenantId).get();
  const orgData = orgRef.data();

  // 3. Buscar Memória Semântica
  const semanticMemory = await getSemanticMemory(tenantId, userId);
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
    const { GeminiProvider } = await import('./providers/GeminiProvider');
    aiProvider = new GeminiProvider(tenantApiKey);
  } else {
    aiProvider = new OpenAIProvider(tenantApiKey);
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
