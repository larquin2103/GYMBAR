import type { OperationsService } from '@/domain/operations/operations.service';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession } from '@/domain/cashbox/cashbox.entity';
import type { Sale, SaleLine } from '@/domain/product/product.entity';
import { computeRenewalPeriod, deriveMemberStatus } from '@/domain/membership/membership.logic';
import { decideAccess, dateKeyOf } from '@/domain/checkin/checkin.logic';
import { getDemoData, nextReceiptNumber } from './demoStore';

const uid = () => crypto.randomUUID();

/**
 * Implementación demo (en memoria) de las operaciones sensibles. Replica la
 * orquestación que en producción hará una Cloud Function transaccional: renovar
 * toca membresía + pago + caja + estado del cliente de forma consistente.
 */
export class DemoOperationsService implements OperationsService {
  async renewMembership(input: {
    orgId: string;
    memberId: string;
    planId: string;
    method: Payment['method'];
    clientRequestId: string;
    notes?: string;
  }): Promise<{ membership: Membership; payment: Payment }> {
    const data = getDemoData(input.orgId);
    // Nota: la idempotencia (clientRequestId) se garantiza en el servidor (Cloud
    // Function). En el demo, de un solo hilo y sin reintentos, no aplica.
    const member = data.members.find((m) => m.id === input.memberId);
    if (!member) throw new Error('Cliente no encontrado');
    const plan = data.plans.find((p) => p.id === input.planId);
    if (!plan) throw new Error('Plan no encontrado');

    const current = member.currentMembershipId
      ? (data.memberships.find((m) => m.id === member.currentMembershipId) ?? null)
      : null;
    const period = computeRenewalPeriod(current, plan);
    const now = new Date();

    const membership: Membership = {
      id: uid(),
      memberId: member.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      priceCentsSnapshot: plan.priceCents,
      currency: plan.currency,
      status: 'active',
      startDate: period.startDate,
      endDate: period.endDate,
      frozenDays: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.memberships.push(membership);

    const openSession = data.cashSessions.find((s) => s.status === 'open') ?? null;
    const payment: Payment = {
      id: uid(),
      memberId: member.id,
      memberNameSnapshot: `${member.firstName} ${member.lastName}`,
      membershipId: membership.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      method: input.method,
      cashSessionId: openSession?.id ?? null,
      staffUid: 'demo-admin',
      notes: input.notes ?? null,
      receiptNumber: nextReceiptNumber(input.orgId),
      createdAt: now,
    };
    data.payments.push(payment);

    // Movimiento de caja si hay sesión abierta.
    if (openSession) {
      data.cashMovements.push({
        id: uid(),
        sessionId: openSession.id,
        type: 'income',
        amountCents: payment.amountCents,
        currency: payment.currency,
        reason: `Pago ${plan.name} · ${payment.memberNameSnapshot}`,
        paymentId: payment.id,
        staffUid: 'demo-admin',
        createdAt: now,
      });
    }

    // Recalcula campos derivados del cliente (lo hará una CF en prod).
    member.currentMembershipId = membership.id;
    member.membershipEndDate = membership.endDate;
    member.status = deriveMemberStatus(membership);
    member.updatedAt = now;

    return { membership, payment };
  }

  async registerCheckIn(input: {
    orgId: string;
    memberId: string;
    source: CheckIn['source'];
  }): Promise<CheckIn> {
    const data = getDemoData(input.orgId);
    const member = data.members.find((m) => m.id === input.memberId);
    if (!member) throw new Error('Cliente no encontrado');
    const decision = decideAccess(member.status);
    const now = new Date();
    const checkin: CheckIn = {
      id: uid(),
      memberId: member.id,
      memberNameSnapshot: `${member.firstName} ${member.lastName}`,
      result: decision.result,
      source: input.source,
      createdAt: now,
      dateKey: dateKeyOf(now),
    };
    data.checkins.push(checkin);
    member.lastCheckInAt = now;
    return checkin;
  }

  async openCashSession(input: {
    orgId: string;
    openingFloatCents: number;
    currency: string;
  }): Promise<CashSession> {
    const data = getDemoData(input.orgId);
    if (data.cashSessions.some((s) => s.status === 'open')) {
      throw new Error('Ya hay una caja abierta');
    }
    const session: CashSession = {
      id: uid(),
      status: 'open',
      openedBy: 'demo-admin',
      openedAt: new Date(),
      openingFloatCents: input.openingFloatCents,
      currency: input.currency,
      closedBy: null,
      closedAt: null,
      totals: { incomeCents: 0, expenseCents: 0, expectedCents: 0, countedCents: 0, diffCents: 0 },
    };
    data.cashSessions.push(session);
    return session;
  }

  async addCashMovement(input: {
    orgId: string;
    type: 'income' | 'expense';
    amountCents: number;
    reason: string;
  }): Promise<void> {
    const data = getDemoData(input.orgId);
    const session = data.cashSessions.find((s) => s.status === 'open');
    if (!session) throw new Error('No hay caja abierta');
    data.cashMovements.push({
      id: uid(),
      sessionId: session.id,
      type: input.type,
      amountCents: input.amountCents,
      currency: session.currency,
      reason: input.reason,
      paymentId: null,
      staffUid: 'demo-admin',
      createdAt: new Date(),
    });
  }

  async closeCashSession(input: { orgId: string; countedCents: number }): Promise<CashSession> {
    const data = getDemoData(input.orgId);
    const session = data.cashSessions.find((s) => s.status === 'open');
    if (!session) throw new Error('No hay caja abierta');
    const movements = data.cashMovements.filter((m) => m.sessionId === session.id);
    const income = movements
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amountCents, 0);
    const expense = movements
      .filter((m) => m.type === 'expense')
      .reduce((s, m) => s + m.amountCents, 0);
    const expected = session.openingFloatCents + income - expense;
    session.status = 'closed';
    session.closedBy = 'demo-admin';
    session.closedAt = new Date();
    session.totals = {
      incomeCents: income,
      expenseCents: expense,
      expectedCents: expected,
      countedCents: input.countedCents,
      diffCents: input.countedCents - expected,
    };
    return session;
  }

  async registerSale(input: {
    orgId: string;
    items: { productId: string; quantity: number }[];
    method: Sale['method'];
    memberId?: string | null;
    memberNameSnapshot?: string | null;
    clientRequestId: string;
  }): Promise<Sale> {
    const data = getDemoData(input.orgId);
    if (input.items.length === 0) throw new Error('La venta no tiene productos');

    // Valida stock y arma las líneas con precios del catálogo (no del cliente).
    const lines: SaleLine[] = [];
    let currency = data.settings.currency;
    for (const item of input.items) {
      const product = data.products.find((p) => p.id === item.productId);
      if (!product) throw new Error('Producto no encontrado');
      const qty = Math.max(1, Math.round(item.quantity));
      if (product.stock < qty) throw new Error(`Sin stock suficiente de ${product.name}`);
      currency = product.currency;
      lines.push({
        productId: product.id,
        nameSnapshot: product.name,
        unitPriceCents: product.priceCents,
        quantity: qty,
        subtotalCents: product.priceCents * qty,
      });
    }
    const totalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);
    const now = new Date();
    const openSession = data.cashSessions.find((s) => s.status === 'open') ?? null;

    const sale: Sale = {
      id: uid(),
      items: lines,
      totalCents,
      currency,
      method: input.method,
      memberId: input.memberId ?? null,
      memberNameSnapshot: input.memberNameSnapshot ?? null,
      cashSessionId: openSession?.id ?? null,
      staffUid: 'demo-admin',
      createdAt: now,
    };
    data.sales.push(sale);

    // Descuenta inventario y deja asiento por cada producto.
    for (const line of lines) {
      const product = data.products.find((p) => p.id === line.productId)!;
      product.stock -= line.quantity;
      product.updatedAt = now;
      data.stockMovements.push({
        id: uid(),
        productId: product.id,
        productNameSnapshot: product.name,
        type: 'sale',
        quantityDelta: -line.quantity,
        stockAfter: product.stock,
        reason: `Venta ${sale.id.slice(0, 8)}`,
        saleId: sale.id,
        staffUid: 'demo-admin',
        createdAt: now,
      });
    }

    // Ingreso en caja si hay sesión abierta.
    if (openSession) {
      data.cashMovements.push({
        id: uid(),
        sessionId: openSession.id,
        type: 'income',
        amountCents: totalCents,
        currency,
        reason: `Venta de productos (${lines.length} art.)`,
        paymentId: null,
        staffUid: 'demo-admin',
        createdAt: now,
      });
    }

    return sale;
  }
}

export const demoOperations = new DemoOperationsService();
