import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const VALID_ROLES = new Set(['admin', 'reception', 'trainer']);

/** Contraseña temporal aleatoria; el usuario la reemplaza con el enlace de reset. */
function randomPassword(): string {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2).toUpperCase() +
    '!9'
  );
}

/**
 * Da de alta a un integrante del personal de punta a punta: crea (o reutiliza)
 * la cuenta de acceso, le asigna organización y rol (custom claims), registra el
 * directorio y devuelve un enlace para que defina su contraseña. Solo un admin de
 * la misma organización puede ejecutarla (ver docs/05).
 */
export const inviteStaff = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  if (auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede agregar usuarios.');
  }

  const data = request.data as {
    orgId: string;
    email: string;
    displayName: string;
    role: 'admin' | 'reception' | 'trainer';
  };
  if (data.orgId !== auth.token.orgId) {
    throw new HttpsError('permission-denied', 'Organización inválida.');
  }
  const email = data.email?.trim().toLowerCase();
  if (!email || !VALID_ROLES.has(data.role)) {
    throw new HttpsError('invalid-argument', 'Correo o rol inválidos.');
  }

  const adminAuth = getAuth();
  let user;
  let created = false;
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch {
    user = await adminAuth.createUser({
      email,
      password: randomPassword(),
      displayName: data.displayName?.trim() || undefined,
    });
    created = true;
  }

  // No robar un usuario que ya pertenece a otra organización.
  const claims = (user.customClaims ?? {}) as { orgId?: string };
  if (claims.orgId && claims.orgId !== data.orgId) {
    throw new HttpsError('failed-precondition', 'El usuario ya pertenece a otra organización.');
  }

  await adminAuth.setCustomUserClaims(user.uid, { orgId: data.orgId, role: data.role });

  const db = getFirestore();
  const now = new Date();
  const displayName = data.displayName?.trim() || user.displayName || email;
  await db
    .collection('organizations')
    .doc(data.orgId)
    .collection('staff')
    .doc(user.uid)
    .set({ uid: user.uid, email, displayName, role: data.role, createdAt: now }, { merge: true });
  await db
    .collection('users')
    .doc(user.uid)
    .set({ organizationId: data.orgId, role: data.role }, { merge: true });

  // Enlace para que el usuario establezca su contraseña (no se envía correo aquí;
  // el admin lo comparte). Best-effort: si falla, el alta igual queda hecha.
  let resetLink: string | null = null;
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email);
  } catch {
    resetLink = null;
  }

  return {
    uid: user.uid,
    email,
    displayName,
    role: data.role,
    createdAt: now.toISOString(),
    created,
    resetLink,
  };
});
