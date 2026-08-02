/**
 * Bootstrap de un gimnasio (tenant) y su primer administrador.
 *
 * Crea (o reutiliza) el usuario de acceso, la organización en Firestore y le
 * asigna los custom claims { orgId, role: 'admin' }. Es la única vía de obtener
 * un admin sin otro admin previo. Replica la Cloud Function createOrganization,
 * pero se ejecuta con el SDK de Admin para poder correrlo una sola vez al montar
 * el proyecto (sin necesidad de una UI de alta).
 *
 * Requisitos:
 *   1) Una cuenta de servicio con permisos (Firebase Admin). Descárgala desde:
 *      Consola de Firebase → Configuración del proyecto → Cuentas de servicio →
 *      "Generar nueva clave privada".
 *   2) Exportar la ruta al JSON:  export GOOGLE_APPLICATION_CREDENTIALS=./sa.json
 *
 * Uso:
 *   node scripts/bootstrap-org.mjs "correo@dominio.com" "ContraseñaFuerte" "Mi Gimnasio"
 *
 * Dependencia: usa firebase-admin (ya instalado en el workspace functions).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [email, password, orgName] = process.argv.slice(2);
if (!email || !password || !orgName) {
  console.error('Uso: node scripts/bootstrap-org.mjs "<email>" "<password>" "<Nombre del gimnasio>"');
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
    console.log(`• Usuario existente: ${email} (${u.uid})`);
    return u;
  } catch {
    const u = await auth.createUser({ email, password, displayName: 'Administrador' });
    console.log(`• Usuario creado: ${email} (${u.uid})`);
    return u;
  }
}

async function main() {
  const user = await ensureUser();

  if (user.customClaims?.orgId) {
    console.log(`• El usuario ya pertenece a la organización ${user.customClaims.orgId}. Nada que hacer.`);
    return;
  }

  const orgRef = db.collection('organizations').doc();
  const now = new Date();
  await db.runTransaction(async (tx) => {
    tx.set(orgRef, { name: orgName, ownerUid: user.uid, currency: 'CUP', createdAt: now, updatedAt: now });
    tx.set(orgRef.collection('staff').doc(user.uid), {
      uid: user.uid,
      email,
      role: 'admin',
      displayName: 'Administrador',
      createdAt: now,
    });
    tx.set(db.collection('users').doc(user.uid), { organizationId: orgRef.id, role: 'admin' });
  });

  await auth.setCustomUserClaims(user.uid, { orgId: orgRef.id, role: 'admin' });

  console.log(`\n✓ Listo. Organización "${orgName}" creada: ${orgRef.id}`);
  console.log('  El usuario ya es admin. Inicia sesión en la app con ese correo y contraseña.');
  console.log('  (Si ya habías iniciado sesión, cierra y vuelve a entrar para refrescar los permisos.)');
}

main().catch((e) => {
  console.error('Error en el bootstrap:', e);
  process.exit(1);
});
