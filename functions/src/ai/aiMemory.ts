import { getFirestore } from 'firebase-admin/firestore';

/**
 * Busca a memória semântica do banco de dados (fatos, preferências e contexto).
 * Divide entre Memória do Tenant (Igreja) e Memória do Usuário (Preferências pessoais).
 */
export async function getSemanticMemory(tenantId: string, userId: string): Promise<string> {
  const db = getFirestore();
  
  // Memória global da Organização (ex: "A igreja realiza cultos de jovens aos sábados")
  const tenantMemRef = db.collection('organizations').doc(tenantId).collection('ai_memory').doc('tenant_context');
  
  // Memória específica do Usuário (ex: "Prefere respostas curtas", "Trabalha no financeiro")
  const userMemRef = db.collection('organizations').doc(tenantId).collection('ai_memory').doc(`user_prefs_${userId}`);

  const [tenantSnap, userSnap] = await Promise.all([tenantMemRef.get(), userMemRef.get()]);

  let memoryContext = "--- MEMÓRIA SEMÂNTICA ---\n";
  
  if (tenantSnap.exists) {
    memoryContext += `[Sobre a Organização]: ${JSON.stringify(tenantSnap.data())}\n`;
  } else {
    memoryContext += `[Sobre a Organização]: Nenhuma informação adicional registrada.\n`;
  }

  if (userSnap.exists) {
    memoryContext += `[Sobre o Usuário (${userId})]: ${JSON.stringify(userSnap.data())}\n`;
  } else {
    memoryContext += `[Sobre o Usuário]: Nenhuma preferência pessoal registrada.\n`;
  }

  memoryContext += "--------------------------\n";

  return memoryContext;
}

/**
 * Permite que a IA atualize ativamente a memória semântica aprendendo com a conversa.
 */
export async function updateSemanticMemory(tenantId: string, userId: string | null, key: string, value: any) {
  const db = getFirestore();
  
  // Se userId for nulo, estamos atualizando uma regra/memória global da organização
  const docId = userId ? `user_prefs_${userId}` : 'tenant_context';
  const memRef = db.collection('organizations').doc(tenantId).collection('ai_memory').doc(docId);

  // Usa merge para não sobreescrever outras chaves da memória
  await memRef.set({ [key]: value, updatedAt: new Date().toISOString() }, { merge: true });

  return { success: true, message: `Memória (${key}) atualizada com sucesso.` };
}
