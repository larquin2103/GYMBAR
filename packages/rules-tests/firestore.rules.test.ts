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

describe('inmutabilidad de pagos', () => {
  it('recepción puede crear un pago', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await assertSucceeds(
      setDoc(doc(db, 'organizations/orgA/payments/p1'), { amountCents: 1000, currency: 'USD' }),
    );
  });

  it('nadie puede editar un pago desde el cliente', async () => {
    const db = ctx('u1', 'orgA', 'admin');
    await assertFails(updateDoc(doc(db, 'organizations/orgA/payments/p1'), { amountCents: 5 }));
  });

  it('nadie puede borrar un pago desde el cliente', async () => {
    const db = ctx('u1', 'orgA', 'admin');
    await assertFails(deleteDoc(doc(db, 'organizations/orgA/payments/p1')));
  });
});

describe('roles', () => {
  it('un entrenador NO puede registrar pagos', async () => {
    const db = ctx('t1', 'orgA', 'trainer');
    await assertFails(
      setDoc(doc(db, 'organizations/orgA/payments/p2'), { amountCents: 1000, currency: 'USD' }),
    );
  });

  it('recepción NO puede cerrar caja (update bloqueado; es server-side)', async () => {
    const db = ctx('u1', 'orgA', 'reception');
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'organizations/orgA/cashSessions/s1'), {
        status: 'open',
      });
    });
    await assertFails(
      updateDoc(doc(db, 'organizations/orgA/cashSessions/s1'), { status: 'closed' }),
    );
  });
});
