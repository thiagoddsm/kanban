import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { handleAIPrompt } from './aiRouter';

/**
 * Callable Function Principal do Oiko IA Engine
 * O frontend React chama essa função passando a mensagem do usuário (e o histórico, se não estivermos mantendo na nuvem).
 */
export const oikoAIAgent = onCall({ region: 'us-central1' }, async (request: any) => {
  // 1. Zero Trust: Identifica o usuário via Firebase Auth do Request
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Acesso negado. Usuário não autenticado.');
  }

  const userId = auth.uid;
  const data = request.data;
  
  if (!data.message) {
    throw new HttpsError('invalid-argument', 'O payload deve conter a propriedade "message".');
  }

  // 2. Extração segura do Tenant
  // NOTA: No Firebase Auth do Oiko, as custom claims podem ter a organização,
  // ou podemos buscar no Firestore para validar. Para a Fase 0, passamos o tenantId
  // pelo payload, mas VALIDAREMOS no backend antes de prosseguir.
  const requestedTenantId = data.tenantId;
  if (!requestedTenantId) {
    throw new HttpsError('invalid-argument', 'O tenantId é obrigatório.');
  }

  try {
    logger.info(`Iniciando request IA para User: ${userId} em Tenant: ${requestedTenantId}`);
    
    // 3. Roteamento para a Engine de IA
    const response = await handleAIPrompt(userId, requestedTenantId, data.message, data.history || []);
    
    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    logger.error('Erro na execução do Oiko IA Engine:', error);
    throw new HttpsError('internal', error.message || 'Erro interno no processamento da IA.');
  }
});
