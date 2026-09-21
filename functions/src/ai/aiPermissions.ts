import { getFirestore } from 'firebase-admin/firestore';

/**
 * Valida de forma estrita no backend se o usuário (userId) 
 * realmente pertence ao tenant (tenantId) e retorna os dados de Membership.
 */
export async function validateTenantAccess(userId: string, tenantId: string) {
  const db = getFirestore();
  const memRef = db.collection('organizations').doc(tenantId).collection('memberships').doc(userId);
  const memSnap = await memRef.get();

  if (!memSnap.exists) {
    throw new Error('UNAUTHORIZED_TENANT_ACCESS: Usuário não possui membership nesta organização.');
  }

  const membership = memSnap.data();

  if (membership?.status !== 'ACTIVE') {
    throw new Error('INACTIVE_MEMBERSHIP: O usuário não está ativo nesta organização.');
  }

  return membership;
}

/**
 * Utilitário para validar permissões granulares por role.
 */
export function hasPermission(role: string, requiredPermissionLevel: 'green' | 'yellow' | 'red'): boolean {
  if (role === 'ADMIN') return true;
  
  if (requiredPermissionLevel === 'green') return true; // Leitura (Geralmente liberada ou escopada pela ferramenta)
  
  if (requiredPermissionLevel === 'yellow' && (role === 'LEADER' || role === 'MANAGER')) return true;

  // Red actions (Deleção/Finanças) só admin.
  return false;
}
