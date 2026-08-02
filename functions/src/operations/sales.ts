import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const VALID_METHODS = new Set(['cash', 'card', 'transfer', 'other']);

/**
 * Registra una venta de mostrador de forma transaccional e idempotente. Valida
 * y descuenta stock, recalcula precios desde el catálogo (no confía en el
 * cliente), registra la venta y su movimiento de ingreso en caja. El
 * clientRequestId evita ventas duplicadas por reintentos de red (ver docs/09).
 */
export const registerSale = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
  const orgId = auth.token.orgId as string | undefined;
  const role = auth.token.role as string | undefined;
  if (!orgId || (role !== 'admin' && role !== 'reception')) {
    throw new HttpsError('permission-denied', 'Sin permiso para vender.');
  }

  const data = request.data as {
    orgId: string;
    items: { productId: string; quantity: number }[];
    method: string;
    memberId?: string | null;
    memberNameSnapshot?: string | null;
    clientRequestId: string;
  };
  if (data.orgId !== orgId) throw new HttpsError('permission-denied', 'Organización inválida.');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new HttpsError('invalid-argument', 'La venta no tiene productos.');
  }
  if (!VALID_METHODS.has(data.method) || !data.clientRequestId) {
    throw new HttpsError('invalid-argument', 'Datos inválidos.');
  }

  const db = getFirestore();
  const org = db.collection('organizations').doc(orgId);
  const idempRef = org.collection('idempotency').doc(data.clientRequestId);

  return db.runTransaction(async (tx) => {
    const idemp = await tx.get(idempRef);
    if (idemp.exists) return idemp.data()!.result; // ya procesado

    // Lee productos y valida stock.
    const lines: {
      productId: string;
      nameSnapshot: string;
      unitPriceCents: number;
      quantity: number;
      subtotalCents: number;
      stockAfter: number;
    }[] = [];
    let currency = 'CUP';
    for (const item of data.items) {
      const qty = Math.max(1, Math.round(item.quantity));
      const ref = org.collection('products').doc(item.productId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Producto no encontrado.');
      const p = snap.data()!;
      if ((p.stock ?? 0) < qty) {
        throw new HttpsError('failed-precondition', `Sin stock suficiente de ${p.name}.`);
      }
      currency = p.currency ?? currency;
      lines.push({
        productId: item.productId,
        nameSnapshot: p.name,
        unitPriceCents: p.priceCents,
        quantity: qty,
        subtotalCents: p.priceCents * qty,
        stockAfter: (p.stock ?? 0) - qty,
      });
    }
    const totalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);

    const openSessions = await tx.get(
      org.collection('cashSessions').where('status', '==', 'open').limit(1),
    );
    const sessionId = openSessions.empty ? null : openSessions.docs[0]!.id;

    const saleRef = org.collection('sales').doc();
    tx.set(saleRef, {
      items: lines.map((l) => ({
        productId: l.productId,
        nameSnapshot: l.nameSnapshot,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        subtotalCents: l.subtotalCents,
      })),
      totalCents,
      currency,
      method: data.method,
      memberId: data.memberId ?? null,
      memberNameSnapshot: data.memberNameSnapshot ?? null,
      cashSessionId: sessionId,
      staffUid: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Descuenta stock y deja asiento por producto.
    for (const l of lines) {
      tx.update(org.collection('products').doc(l.productId), {
        stock: l.stockAfter,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(org.collection('stockMovements').doc(), {
        productId: l.productId,
        productNameSnapshot: l.nameSnapshot,
        type: 'sale',
        quantityDelta: -l.quantity,
        stockAfter: l.stockAfter,
        reason: `Venta ${saleRef.id.slice(0, 8)}`,
        saleId: saleRef.id,
        staffUid: auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    if (sessionId) {
      tx.set(org.collection('cashSessions').doc(sessionId).collection('movements').doc(), {
        type: 'income',
        amountCents: totalCents,
        currency,
        reason: `Venta de productos (${lines.length} art.)`,
        paymentId: null,
        staffUid: auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const result = { saleId: saleRef.id, totalCents };
    tx.set(idempRef, { result, createdAt: FieldValue.serverTimestamp() });
    return result;
  });
});
