import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type { OperationsService } from '@/domain/operations/operations.service';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession } from '@/domain/cashbox/cashbox.entity';
import type { Sale, SaleLine } from '@/domain/product/product.entity';
import { startOfDay, addDays } from '@/domain/membership/membership.logic';
import { decideAccess, dateKeyOf } from '@/domain/checkin/checkin.logic';

const toDate = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());

/**
 * Operaciones sensibles ejecutadas en el cliente (modo sin Cloud Functions).
 *
 * Replican la orquestación de las Cloud Functions usando transacciones de
 * Firestore para mantener atomicidad. La integridad se apoya además en las
 * Reglas de Seguridad (quién puede escribir qué). Nota: al no haber servidor,
 * la idempotencia estricta y el recálculo server-side son best-effort; es un
 * compromiso consciente para operar en el plan gratuito (ver docs/13).
 */
export class FirestoreOperationsService implements OperationsService {
  constructor(private readonly db: Firestore) {}

  private col(orgId: string, name: string) {
    return collection(this.db, 'organizations', orgId, name);
  }

  /** Id de la sesión de caja abierta (o null). Fuera de transacción: el SDK
   * cliente no permite consultas dentro de runTransaction. */
  private async openSessionId(orgId: string): Promise<string | null> {
    const snap = await getDocs(
      query(this.col(orgId, 'cashSessions'), where('status', '==', 'open'), fbLimit(1)),
    );
    return snap.empty ? null : snap.docs[0]!.id;
  }

  async renewMembership(input: {
    orgId: string;
    memberId: string;
    planId: string;
    method: Payment['method'];
    clientRequestId: string;
    notes?: string;
  }): Promise<{ membership: Membership; payment: Payment }> {
    const { orgId } = input;
    const memberRef = doc(this.col(orgId, 'members'), input.memberId);
    const planRef = doc(this.col(orgId, 'plans'), input.planId);
    const sessionId = await this.openSessionId(orgId);

    return runTransaction(this.db, async (tx) => {
      const [memberSnap, planSnap] = await Promise.all([tx.get(memberRef), tx.get(planRef)]);
      if (!memberSnap.exists()) throw new Error('Cliente no encontrado');
      if (!planSnap.exists()) throw new Error('Plan no encontrado');
      const m = memberSnap.data();
      const plan = planSnap.data();

      const now = new Date();
      const currentEnd = m.membershipEndDate ? toDate(m.membershipEndDate) : null;
      const stillActive =
        m.status === 'active' && currentEnd && startOfDay(currentEnd) >= startOfDay(now);
      const startDate = startOfDay(now);
      const endDate = addDays(stillActive ? startOfDay(currentEnd!) : startOfDay(now), plan.durationDays);
      const memberName = `${m.firstName} ${m.lastName}`;

      const membershipRef = doc(this.col(orgId, 'memberships'));
      const membership: Membership = {
        id: membershipRef.id,
        memberId: input.memberId,
        planId: input.planId,
        planNameSnapshot: plan.name,
        priceCentsSnapshot: plan.priceCents,
        currency: plan.currency,
        status: 'active',
        startDate,
        endDate,
        frozenDays: 0,
        createdAt: now,
        updatedAt: now,
      };
      tx.set(membershipRef, {
        memberId: membership.memberId,
        planId: membership.planId,
        planNameSnapshot: membership.planNameSnapshot,
        priceCentsSnapshot: membership.priceCentsSnapshot,
        currency: membership.currency,
        status: 'active',
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        frozenDays: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const paymentRef = doc(this.col(orgId, 'payments'));
      const payment: Payment = {
        id: paymentRef.id,
        memberId: input.memberId,
        memberNameSnapshot: memberName,
        membershipId: membershipRef.id,
        amountCents: plan.priceCents,
        currency: plan.currency,
        method: input.method,
        cashSessionId: sessionId,
        staffUid: 'client',
        notes: input.notes ?? null,
        receiptNumber: paymentRef.id.slice(0, 8).toUpperCase(),
        createdAt: now,
      };
      tx.set(paymentRef, {
        memberId: payment.memberId,
        memberNameSnapshot: payment.memberNameSnapshot,
        membershipId: payment.membershipId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        method: payment.method,
        cashSessionId: payment.cashSessionId,
        staffUid: payment.staffUid,
        notes: payment.notes,
        receiptNumber: payment.receiptNumber,
        createdAt: serverTimestamp(),
      });

      if (sessionId) {
        tx.set(doc(collection(this.db, 'organizations', orgId, 'cashSessions', sessionId, 'movements')), {
          type: 'income',
          amountCents: payment.amountCents,
          currency: payment.currency,
          reason: `Pago ${plan.name} · ${memberName}`,
          paymentId: paymentRef.id,
          staffUid: 'client',
          createdAt: serverTimestamp(),
        });
      }

      tx.update(memberRef, {
        status: 'active',
        currentMembershipId: membershipRef.id,
        membershipEndDate: Timestamp.fromDate(endDate),
        updatedAt: serverTimestamp(),
      });

      return { membership, payment };
    });
  }

  async registerCheckIn(input: {
    orgId: string;
    memberId: string;
    source: CheckIn['source'];
  }): Promise<CheckIn> {
    const { orgId } = input;
    const memberRef = doc(this.col(orgId, 'members'), input.memberId);
    const checkinRef = doc(this.col(orgId, 'checkins'));

    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(memberRef);
      if (!snap.exists()) throw new Error('Cliente no encontrado');
      const m = snap.data();
      const decision = decideAccess(m.status);
      const now = new Date();
      const checkin: CheckIn = {
        id: checkinRef.id,
        memberId: input.memberId,
        memberNameSnapshot: `${m.firstName} ${m.lastName}`,
        result: decision.result,
        source: input.source,
        createdAt: now,
        dateKey: dateKeyOf(now),
      };
      tx.set(checkinRef, {
        memberId: checkin.memberId,
        memberNameSnapshot: checkin.memberNameSnapshot,
        result: checkin.result,
        source: checkin.source,
        createdAt: serverTimestamp(),
        dateKey: checkin.dateKey,
      });
      tx.update(memberRef, { lastCheckInAt: serverTimestamp() });
      return checkin;
    });
  }

  async openCashSession(input: {
    orgId: string;
    openingFloatCents: number;
    currency: string;
  }): Promise<CashSession> {
    const existing = await this.openSessionId(input.orgId);
    if (existing) throw new Error('Ya hay una caja abierta');
    const ref = doc(this.col(input.orgId, 'cashSessions'));
    const now = new Date();
    const session: CashSession = {
      id: ref.id,
      status: 'open',
      openedBy: 'client',
      openedAt: now,
      openingFloatCents: input.openingFloatCents,
      currency: input.currency,
      closedBy: null,
      closedAt: null,
      totals: { incomeCents: 0, expenseCents: 0, expectedCents: 0, countedCents: 0, diffCents: 0 },
    };
    await runTransaction(this.db, async (tx) => {
      tx.set(ref, {
        status: 'open',
        openedBy: 'client',
        openedAt: serverTimestamp(),
        openingFloatCents: input.openingFloatCents,
        currency: input.currency,
        closedBy: null,
        closedAt: null,
        totals: session.totals,
      });
    });
    return session;
  }

  async addCashMovement(input: {
    orgId: string;
    type: 'income' | 'expense';
    amountCents: number;
    reason: string;
  }): Promise<void> {
    const sessionId = await this.openSessionId(input.orgId);
    if (!sessionId) throw new Error('No hay caja abierta');
    const sessionSnap = await getDoc(doc(this.col(input.orgId, 'cashSessions'), sessionId));
    const currency = sessionSnap.data()?.currency ?? 'CUP';
    await runTransaction(this.db, async (tx) => {
      tx.set(
        doc(collection(this.db, 'organizations', input.orgId, 'cashSessions', sessionId, 'movements')),
        {
          type: input.type,
          amountCents: input.amountCents,
          currency,
          reason: input.reason,
          paymentId: null,
          staffUid: 'client',
          createdAt: serverTimestamp(),
        },
      );
    });
  }

  async closeCashSession(input: { orgId: string; countedCents: number }): Promise<CashSession> {
    const sessionId = await this.openSessionId(input.orgId);
    if (!sessionId) throw new Error('No hay caja abierta');
    const sessionRef = doc(this.col(input.orgId, 'cashSessions'), sessionId);
    // Los movimientos se leen fuera de la transacción (el SDK no consulta dentro).
    const movesSnap = await getDocs(
      collection(this.db, 'organizations', input.orgId, 'cashSessions', sessionId, 'movements'),
    );
    let income = 0;
    let expense = 0;
    movesSnap.forEach((mv) => {
      const x = mv.data();
      if (x.type === 'income') income += x.amountCents ?? 0;
      else if (x.type === 'expense') expense += x.amountCents ?? 0;
    });

    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(sessionRef);
      if (!snap.exists()) throw new Error('Caja no encontrada');
      const s = snap.data();
      const expected = (s.openingFloatCents ?? 0) + income - expense;
      const totals = {
        incomeCents: income,
        expenseCents: expense,
        expectedCents: expected,
        countedCents: input.countedCents,
        diffCents: input.countedCents - expected,
      };
      tx.update(sessionRef, {
        status: 'closed',
        closedBy: 'client',
        closedAt: serverTimestamp(),
        totals,
      });
      return {
        id: sessionId,
        status: 'closed',
        openedBy: s.openedBy ?? 'client',
        openedAt: toDate(s.openedAt),
        openingFloatCents: s.openingFloatCents ?? 0,
        currency: s.currency ?? 'CUP',
        closedBy: 'client',
        closedAt: new Date(),
        totals,
      } satisfies CashSession;
    });
  }

  async registerSale(input: {
    orgId: string;
    items: { productId: string; quantity: number }[];
    method: Sale['method'];
    memberId?: string | null;
    memberNameSnapshot?: string | null;
    clientRequestId: string;
  }): Promise<Sale> {
    const { orgId } = input;
    if (input.items.length === 0) throw new Error('La venta no tiene productos');
    const sessionId = await this.openSessionId(orgId);

    return runTransaction(this.db, async (tx) => {
      // Todas las lecturas antes de las escrituras.
      const refs = input.items.map((it) => doc(this.col(orgId, 'products'), it.productId));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));

      const lines: SaleLine[] = [];
      let currency = 'CUP';
      const stockAfter: number[] = [];
      snaps.forEach((snap, i) => {
        if (!snap.exists()) throw new Error('Producto no encontrado');
        const p = snap.data();
        const qty = Math.max(1, Math.round(input.items[i]!.quantity));
        if ((p.stock ?? 0) < qty) throw new Error(`Sin stock suficiente de ${p.name}`);
        currency = p.currency ?? currency;
        lines.push({
          productId: refs[i]!.id,
          nameSnapshot: p.name,
          unitPriceCents: p.priceCents,
          quantity: qty,
          subtotalCents: p.priceCents * qty,
        });
        stockAfter.push((p.stock ?? 0) - qty);
      });
      const totalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);
      const now = new Date();

      const saleRef = doc(this.col(orgId, 'sales'));
      const sale: Sale = {
        id: saleRef.id,
        items: lines,
        totalCents,
        currency,
        method: input.method,
        memberId: input.memberId ?? null,
        memberNameSnapshot: input.memberNameSnapshot ?? null,
        cashSessionId: sessionId,
        staffUid: 'client',
        createdAt: now,
      };
      tx.set(saleRef, {
        items: lines,
        totalCents,
        currency,
        method: input.method,
        memberId: sale.memberId,
        memberNameSnapshot: sale.memberNameSnapshot,
        cashSessionId: sessionId,
        staffUid: 'client',
        createdAt: serverTimestamp(),
      });

      lines.forEach((line, i) => {
        tx.update(refs[i]!, { stock: stockAfter[i], updatedAt: serverTimestamp() });
        tx.set(doc(this.col(orgId, 'stockMovements')), {
          productId: line.productId,
          productNameSnapshot: line.nameSnapshot,
          type: 'sale',
          quantityDelta: -line.quantity,
          stockAfter: stockAfter[i],
          reason: `Venta ${saleRef.id.slice(0, 8)}`,
          saleId: saleRef.id,
          staffUid: 'client',
          createdAt: serverTimestamp(),
        });
      });

      if (sessionId) {
        tx.set(doc(collection(this.db, 'organizations', orgId, 'cashSessions', sessionId, 'movements')), {
          type: 'income',
          amountCents: totalCents,
          currency,
          reason: `Venta de productos (${lines.length} art.)`,
          paymentId: null,
          staffUid: 'client',
          createdAt: serverTimestamp(),
        });
      }

      return sale;
    });
  }
}
