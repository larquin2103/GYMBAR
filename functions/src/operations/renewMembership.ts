import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VALID_METHODS = new Set(['cash', 'card', 'transfer', 'other']);

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Renueva/asigna una membresía de forma transaccional e idempotente. Extiende la
 * vigencia según el plan, registra el pago (inmutable) y su movimiento de caja, y
 * recalcula el estado del cliente. El clientRequestId evita cobros duplicados por
 * reintentos de red (ver docs/09).
 */
export const renewMembership = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  const orgId = auth.token.orgId as string | undefined;
  const role = auth.token.role as string | undefined;
  if (!orgId || (role !== 'admin' && role !== 'reception')) {
    throw new HttpsError('permission-denied', 'Sin permiso para cobrar.');
  }

  const data = request.data as {
    orgId: string;
    memberId: string;
    planId: string;
    method: string;
    clientRequestId: string;
    notes?: string;
  };
  if (data.orgId !== orgId) throw new HttpsError('permission-denied', 'Organización inválida.');
  if (!data.memberId || !data.planId || !VALID_METHODS.has(data.method) || !data.clientRequestId) {
    throw new HttpsError('invalid-argument', 'Datos inválidos.');
  }

  const db = getFirestore();
  const org = db.collection('organizations').doc(orgId);
  const memberRef = org.collection('members').doc(data.memberId);
  const planRef = org.collection('plans').doc(data.planId);
  const idempRef = org.collection('idempotency').doc(data.clientRequestId);

  return db.runTransaction(async (tx) => {
    const idemp = await tx.get(idempRef);
    if (idemp.exists) return idemp.data()!.result; // ya procesado

    const [memberSnap, planSnap] = await Promise.all([tx.get(memberRef), tx.get(planRef)]);
    if (!memberSnap.exists) throw new HttpsError('not-found', 'Cliente no encontrado.');
    if (!planSnap.exists) throw new HttpsError('not-found', 'Plan no encontrado.');
    const member = memberSnap.data()!;
    const plan = planSnap.data()!;

    const now = new Date();
    const currentEnd = member.membershipEndDate?.toDate?.() ?? null;
    const stillActive =
      member.status === 'active' && currentEnd && startOfDay(currentEnd) >= startOfDay(now);
    const base = stillActive ? startOfDay(currentEnd) : startOfDay(now);
    const endDate = new Date(base.getTime() + plan.durationDays * MS_PER_DAY);

    const membershipRef = org.collection('memberships').doc();
    tx.set(membershipRef, {
      memberId: data.memberId,
      planId: data.planId,
      planNameSnapshot: plan.name,
      priceCentsSnapshot: plan.priceCents,
      currency: plan.currency,
      status: 'active',
      startDate: Timestamp.fromDate(startOfDay(now)),
      endDate: Timestamp.fromDate(endDate),
      frozenDays: 0,
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Sesión de caja abierta (si existe) para el movimiento de ingreso.
    const openSessions = await tx.get(
      org.collection('cashSessions').where('status', '==', 'open').limit(1),
    );
    const sessionId = openSessions.empty ? null : openSessions.docs[0]!.id;

    const paymentRef = org.collection('payments').doc();
    tx.set(paymentRef, {
      memberId: data.memberId,
      memberNameSnapshot: `${member.firstName} ${member.lastName}`,
      membershipId: membershipRef.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      method: data.method,
      cashSessionId: sessionId,
      staffUid: auth.uid,
      notes: data.notes ?? null,
      receiptNumber: paymentRef.id.slice(0, 8).toUpperCase(),
      createdAt: FieldValue.serverTimestamp(),
    });

    if (sessionId) {
      tx.set(org.collection('cashSessions').doc(sessionId).collection('movements').doc(), {
        type: 'income',
        amountCents: plan.priceCents,
        currency: plan.currency,
        reason: `Pago ${plan.name}`,
        paymentId: paymentRef.id,
        staffUid: auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    tx.update(memberRef, {
      status: 'active',
      currentMembershipId: membershipRef.id,
      membershipEndDate: Timestamp.fromDate(endDate),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const result = { membershipId: membershipRef.id, paymentId: paymentRef.id };
    tx.set(idempRef, { result, createdAt: FieldValue.serverTimestamp() });
    return result;
  });
});
