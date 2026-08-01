import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const ACCESS: Record<string, { result: string; allowed: boolean }> = {
  active: { result: 'allowed', allowed: true },
  expired: { result: 'expired', allowed: true },
  pending: { result: 'pending_payment', allowed: true },
  frozen: { result: 'denied', allowed: false },
  cancelled: { result: 'denied', allowed: false },
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Registra un intento de acceso (siempre) y decide el acceso por política. */
export const registerCheckIn = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  const orgId = auth.token.orgId as string | undefined;
  if (!orgId) throw new HttpsError('permission-denied', 'Organización inválida.');

  const data = request.data as { memberId: string; source: string };
  const db = getFirestore();
  const org = db.collection('organizations').doc(orgId);
  const memberSnap = await org.collection('members').doc(data.memberId).get();
  if (!memberSnap.exists) throw new HttpsError('not-found', 'Cliente no encontrado.');
  const member = memberSnap.data()!;

  const decision = ACCESS[member.status as string] ?? { result: 'denied', allowed: false };
  const now = new Date();
  const ref = org.collection('checkins').doc();
  await ref.set({
    memberId: data.memberId,
    memberNameSnapshot: `${member.firstName} ${member.lastName}`,
    result: decision.result,
    source: data.source ?? 'search',
    createdAt: FieldValue.serverTimestamp(),
    dateKey: dateKey(now),
  });
  await memberSnap.ref.update({ lastCheckInAt: FieldValue.serverTimestamp() });

  return { id: ref.id, result: decision.result, allowed: decision.allowed };
});
