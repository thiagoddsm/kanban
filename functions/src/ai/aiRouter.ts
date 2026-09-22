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
    const { GeminiProvider } = await import('./providers/GeminiProvider');
    aiProvider = new GeminiProvider(tenantApiKey);
  } else {
    aiProvider = new OpenAIProvider(tenantApiKey);
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
