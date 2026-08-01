import { describe, expect, it, beforeEach } from 'vitest';
import { DemoOperationsService } from './demoOperations';
import { getDemoData, DEMO_ORG_ID } from './demoStore';
import { isMembershipActive } from '@/domain/membership/membership.logic';

describe('DemoOperationsService (orquestación de renovación)', () => {
  const ops = new DemoOperationsService();
  let memberId: string;
  let planId: string;

  beforeEach(() => {
    const data = getDemoData(DEMO_ORG_ID);
    // usa un cliente vencido para verificar la reactivación
    const expired = data.members.find((m) => m.status === 'expired')!;
    memberId = expired.id;
    planId = data.plans.find((p) => p.name === 'Mensual')!.id;
  });

  it('renovar crea pago, membresía activa y actualiza el estado del cliente', async () => {
    const { membership, payment } = await ops.renewMembership({
      orgId: DEMO_ORG_ID,
      memberId,
      planId,
      method: 'cash',
      clientRequestId: crypto.randomUUID(),
    });

    expect(payment.amountCents).toBe(70000);
    expect(isMembershipActive(membership)).toBe(true);

    const member = getDemoData(DEMO_ORG_ID).members.find((m) => m.id === memberId)!;
    expect(member.status).toBe('active');
    expect(member.currentMembershipId).toBe(membership.id);
  });

  it('cerrar caja cuadra ingresos contra el efectivo contado', async () => {
    await ops.openCashSession({ orgId: DEMO_ORG_ID, openingFloatCents: 10000, currency: 'MXN' });
    await ops.addCashMovement({
      orgId: DEMO_ORG_ID,
      type: 'income',
      amountCents: 5000,
      reason: 'venta',
    });
    const closed = await ops.closeCashSession({ orgId: DEMO_ORG_ID, countedCents: 15000 });
    // esperado = 10000 fondo + 5000 ingreso = 15000; contado 15000 → diff 0
    expect(closed.totals.expectedCents).toBe(15000);
    expect(closed.totals.diffCents).toBe(0);
  });
});
