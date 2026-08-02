import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface SetUserRoleData {
  targetUid: string;
  orgId: string;
  role: 'admin' | 'reception' | 'trainer';
}

const VALID_ROLES = new Set(['admin', 'reception', 'trainer']);

/**
 * Asigna organización y rol (custom claims) a un usuario. SOLO un admin de la
 * misma organización puede ejecutarla. El cliente jamás asigna permisos por su
 * cuenta (ver docs/05).
 */
export const setUserRole = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');

  const callerOrg = auth.token.orgId as string | undefined;
  const callerRole = auth.token.role as string | undefined;
  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede asignar roles.');
  }

  const data = request.data as SetUserRoleData;
  if (!data?.targetUid || !data?.orgId || !VALID_ROLES.has(data.role)) {
    throw new HttpsError('invalid-argument', 'Datos inválidos.');
  }
  if (data.orgId !== callerOrg) {
    throw new HttpsError('permission-denied', 'No puedes asignar roles fuera de tu organización.');
  }

  await getAuth().setCustomUserClaims(data.targetUid, {
    orgId: data.orgId,
    role: data.role,
  });

  // Mantiene el directorio y el índice de usuarios en sincronía con el claim.
  const db = getFirestore();
  await db
    .collection('organizations')
    .doc(data.orgId)
    .collection('staff')
    .doc(data.targetUid)
    .set({ role: data.role }, { merge: true });
  await db.collection('users').doc(data.targetUid).set({ role: data.role }, { merge: true });

  return { ok: true };
});
