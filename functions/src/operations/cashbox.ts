import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

function assertReception(request: { auth?: { token: Record<string, unknown> } | null }): string {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  const orgId = auth.token.orgId as string | undefined;
  const role = auth.token.role as string | undefined;
  if (!orgId || (role !== 'admin' && role !== 'reception')) {
    throw new HttpsError('permission-denied', 'Sin permiso para operar caja.');
  }
  return orgId;
}

export const openCashSession = onCall(async (request) => {
  const orgId = assertReception(request);
  const data = request.data as { openingFloatCents: number; currency: string };
  const db = getFirestore();
  const sessions = db.collection('organizations').doc(orgId).collection('cashSessions');
  const open = await sessions.where('status', '==', 'open').limit(1).get();
  if (!open.empty) throw new HttpsError('failed-precondition', 'Ya hay una caja abierta.');
  const ref = sessions.doc();
  await ref.set({
    status: 'open',
    openedBy: request.auth!.uid,
    openedAt: FieldValue.serverTimestamp(),
    openingFloatCents: data.openingFloatCents ?? 0,
    currency: data.currency ?? 'CUP',
    closedBy: null,
    closedAt: null,
    totals: { incomeCents: 0, expenseCents: 0, expectedCents: 0, countedCents: 0, diffCents: 0 },
  });
  return { sessionId: ref.id };
});

export const addCashMovement = onCall(async (request) => {
  const orgId = assertReception(request);
  const data = request.data as { type: 'income' | 'expense'; amountCents: number; reason: string };
  if (!['income', 'expense'].includes(data.type) || !(data.amountCents > 0)) {
    throw new HttpsError('invalid-argument', 'Movimiento inválido.');
  }
  const db = getFirestore();
  const sessions = db.collection('organizations').doc(orgId).collection('cashSessions');
  const open = await sessions.where('status', '==', 'open').limit(1).get();
  if (open.empty) throw new HttpsError('failed-precondition', 'No hay caja abierta.');
  await open.docs[0]!.ref.collection('movements').doc().set({
    type: data.type,
    amountCents: data.amountCents,
    reason: data.reason,
    paymentId: null,
    staffUid: request.auth!.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Cierra la caja calculando esperado vs contado en el servidor (no confiable al cliente). */
export const closeCashSession = onCall(async (request) => {
  const orgId = assertReception(request);
  const data = request.data as { countedCents: number };
  const db = getFirestore();
  const sessions = db.collection('organizations').doc(orgId).collection('cashSessions');
  const open = await sessions.where('status', '==', 'open').limit(1).get();
  if (open.empty) throw new HttpsError('failed-precondition', 'No hay caja abierta.');
  const sessionRef = open.docs[0]!.ref;
  const session = open.docs[0]!.data();

  const movementsSnap = await sessionRef.collection('movements').get();
  let income = 0;
  let expense = 0;
  movementsSnap.forEach((m) => {
    const x = m.data();
    if (x.type === 'income') income += x.amountCents;
    else expense += x.amountCents;
  });
  const expected = session.openingFloatCents + income - expense;
  const totals = {
    incomeCents: income,
    expenseCents: expense,
    expectedCents: expected,
    countedCents: data.countedCents,
    diffCents: data.countedCents - expected,
  };
  await sessionRef.update({
    status: 'closed',
    closedBy: request.auth!.uid,
    closedAt: FieldValue.serverTimestamp(),
    totals,
  });
  return { totals };
});
