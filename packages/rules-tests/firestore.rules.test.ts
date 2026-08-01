/**
 * Tests de aislamiento multi-tenant de las Firestore Rules.
 *
 * Requiere el emulador de Firestore corriendo. Ejecutar con:
 *   npm run test:emulator --workspace @gymbar/rules-tests
 * (o `firebase emulators:exec --only firestore "vitest run"`).
 *
 * Estos casos son el contrato de seguridad mínimo del producto (ver docs/05, docs/11).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
let testEnv: RulesTestEnvironment;

function ctx(uid: string, orgId: string, role: string) {
  return testEnv.authenticatedContext(uid, { orgId, role }).firestore();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gymbar-rules-test',
    firestore: {
      rules: readFileSync(join(__dirname, '..', '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('aislamiento multi-tenant', () => {
  it('un usuario NO puede leer clientes de otra organización', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertFails(getDoc(doc(db, 'organizations/orgB/members/m1')));
  });

  it('un usuario SÍ puede leer clientes de su propia organización', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertSucceeds(getDoc(doc(db, 'organizations/orgA/members/m1')));
  });

  it('recepción puede crear un cliente en su organización', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertSucceeds(
      setDoc(doc(db, 'organizations/orgA/members/m2'), { firstName: 'Ana', lastName: 'Ruiz' }),
    );
  });
});

describe('pagos server-authoritative', () => {
  it('nadie puede crear un pago desde el cliente (lo hace la Cloud Function)', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertFails(
      setDoc(doc(db, 'organizations/orgA/payments/p1'), { amountCents: 1000, currency: 'USD' }),
    );
  });

  it('un pago existente no se puede editar ni borrar desde el cliente', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'organizations/orgA/payments/p1'), {
        amountCents: 1000,
        currency: 'USD',
      });
    });
    const db = ctx('u1', 'orgA', 'admin');
    await assertFails(updateDoc(doc(db, 'organizations/orgA/payments/p1'), { amountCents: 5 }));
    await assertFails(deleteDoc(doc(db, 'organizations/orgA/payments/p1')));
  });

  it('un pago SÍ es legible por recepción', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertSucceeds(getDoc(doc(db, 'organizations/orgA/payments/p1')));
  });
});

describe('roles y caja', () => {
  it('recepción NO puede crear/cerrar caja desde el cliente (es server-side)', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertFails(setDoc(doc(db, 'organizations/orgA/cashSessions/s1'), { status: 'open' }));
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'organizations/orgA/cashSessions/s2'), {
        status: 'open',
      });
    });
    await assertFails(
      updateDoc(doc(db, 'organizations/orgA/cashSessions/s2'), { status: 'closed' }),
    );
  });
});
