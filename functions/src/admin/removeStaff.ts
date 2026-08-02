import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

/**
 * Quita a un integrante del personal: revoca sus claims (pierde acceso a la
 * organización) y elimina su registro del directorio. No borra la cuenta de
 * Auth. Solo un admin de la misma organización; no puede eliminarse a sí mismo.
 */
export const removeStaff = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  if (auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede eliminar usuarios.');
  }

  const data = request.data as { orgId: string; targetUid: string };
  if (data.orgId !== auth.token.orgId) {
    throw new HttpsError('permission-denied', 'Organización inválida.');
  }
  if (!data.targetUid) throw new HttpsError('invalid-argument', 'Usuario inválido.');
  if (data.targetUid === auth.uid) {
    throw new HttpsError('failed-precondition', 'No puedes eliminarte a ti mismo.');
  }

  // Revoca el acceso (claims a null). Best-effort si el usuario ya no existe.
  try {
    await getAuth().setCustomUserClaims(data.targetUid, null);
  } catch {
    // el usuario de Auth puede no existir; se continúa limpiando el directorio.
  }

  const db = getFirestore();
  await db
    .collection('organizations')
    .doc(data.orgId)
    .collection('staff')
    .doc(data.targetUid)
    .delete();
  await db.collection('users').doc(data.targetUid).delete();

  return { ok: true };
});
