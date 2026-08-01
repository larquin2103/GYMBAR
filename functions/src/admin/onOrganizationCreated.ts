import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

interface CreateOrgData {
  organizationName: string;
}

/**
 * Bootstrap de un tenant nuevo: crea la organización y convierte al usuario que
 * la crea en su primer administrador (custom claims orgId + role=admin). Es la
 * única vía para obtener el claim de admin sin otro admin previo (ver docs/05).
 */
export const createOrganization = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');

  const name = (request.data as CreateOrgData)?.organizationName?.trim();
  if (!name) throw new HttpsError('invalid-argument', 'El nombre de la organización es requerido.');

  // Un usuario que ya pertenece a una organización no puede crear otra (MVP).
  if (auth.token.orgId) {
    throw new HttpsError('failed-precondition', 'El usuario ya pertenece a una organización.');
  }

  const db = getFirestore();
  const orgRef = db.collection('organizations').doc();
  const now = new Date();

  await db.runTransaction(async (tx) => {
    tx.set(orgRef, {
      name,
      ownerUid: auth.uid,
      createdAt: now,
      updatedAt: now,
    });
    tx.set(orgRef.collection('staff').doc(auth.uid), {
      uid: auth.uid,
      role: 'admin',
      displayName: auth.token.name ?? auth.token.email ?? 'Administrador',
      createdAt: now,
    });
    tx.set(db.collection('users').doc(auth.uid), {
      organizationId: orgRef.id,
      role: 'admin',
    });
  });

  await getAuth().setCustomUserClaims(auth.uid, { orgId: orgRef.id, role: 'admin' });

  return { organizationId: orgRef.id };
});
