/**
 * Otorga acceso real (cuenta + rol) a un integrante del personal — modo sin
 * Cloud Functions.
 *
 * En el plan gratuito no se pueden asignar custom claims desde el navegador, así
 * que este script (Admin SDK, ejecutado por ti) crea/reutiliza la cuenta de
 * acceso, le fija los claims { orgId, role } y sincroniza el directorio. Después,
 * la persona inicia sesión en la app con ese correo y contraseña.
 *
 * Requisitos:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./sa.json   (clave de cuenta de servicio)
 *
 * Uso:
 *   node scripts/set-staff-role.mjs <orgId> <email> <password> <role> ["Nombre"]
 *   role ∈ admin | reception | trainer
 *
 * El <orgId> es el id de tu organización (lo imprime bootstrap-org.mjs; también
 * es el id del documento en la colección "organizations" de Firestore).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [orgId, email, password, role, displayName] = process.argv.slice(2);
const ROLES = new Set(['admin', 'reception', 'trainer']);

if (!orgId || !email || !password || !ROLES.has(role)) {
  console.error('Uso: node scripts/set-staff-role.mjs <orgId> <email> <password> <admin|reception|trainer> ["Nombre"]');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Falta GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de la cuenta de servicio).');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

async function ensureUser() {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password });
    console.log(`• Usuario existente: ${email} (${u.uid}) — contraseña actualizada`);
    return u;
  } catch {
    const u = await auth.createUser({ email, password, displayName: displayName || undefined });
    console.log(`• Usuario creado: ${email} (${u.uid})`);
    return u;
  }
}

async function main() {
  const user = await ensureUser();
  const claims = (user.customClaims ?? {});
  if (claims.orgId && claims.orgId !== orgId) {
    throw new Error(`El usuario ya pertenece a otra organización (${claims.orgId}).`);
  }

  await auth.setCustomUserClaims(user.uid, { orgId, role });

  const now = new Date();
  await db
    .collection('organizations')
    .doc(orgId)
    .collection('staff')
    .doc(user.uid)
    .set(
      { uid: user.uid, email: email.toLowerCase(), displayName: displayName || user.displayName || email, role, createdAt: now },
      { merge: true },
    );
  await db.collection('users').doc(user.uid).set({ organizationId: orgId, role }, { merge: true });

  console.log(`\n✓ Listo. ${email} ahora es "${role}" en la organización ${orgId}.`);
  console.log('  Que inicie sesión en la app con ese correo y contraseña.');
}

main().catch((e) => {
  console.error('Error:', e.message ?? e);
  process.exit(1);
});
