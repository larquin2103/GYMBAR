import { httpsCallable, type Functions } from 'firebase/functions';
import type { OperationsService } from '@/domain/operations/operations.service';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession } from '@/domain/cashbox/cashbox.entity';

/**
 * Operaciones sensibles vía Cloud Functions callables (transaccionales e
 * idempotentes en el servidor, ver docs/09). El cliente solo propone; el
 * servidor decide y persiste. Las fechas llegan como ISO y se rehidratan.
 */
export class FirebaseOperationsService implements OperationsService {
  constructor(private readonly fns: Functions) {}

  private call<TReq, TRes>(name: string) {
    return httpsCallable<TReq, TRes>(this.fns, name);
  }

  async renewMembership(input: {
    orgId: string;
    memberId: string;
    planId: string;
    method: Payment['method'];
    clientRequestId: string;
    notes?: string;
  }): Promise<{ membership: Membership; payment: Payment }> {
    const res = await this.call<typeof input, { membership: Membership; payment: Payment }>(
      'renewMembership',
    )(input);
    return res.data;
  }

  async registerCheckIn(input: {
    orgId: string;
    memberId: string;
    source: CheckIn['source'];
  }): Promise<CheckIn> {
    const res = await this.call<typeof input, CheckIn>('registerCheckIn')(input);
    return res.data;
  }

  async openCashSession(input: {
    orgId: string;
    openingFloatCents: number;
    currency: string;
  }): Promise<CashSession> {
    const res = await this.call<typeof input, CashSession>('openCashSession')(input);
    return res.data;
  }

  async addCashMovement(input: {
    orgId: string;
    type: 'income' | 'expense';
    amountCents: number;
    reason: string;
  }): Promise<void> {
    await this.call<typeof input, void>('addCashMovement')(input);
  }

  async closeCashSession(input: { orgId: string; countedCents: number }): Promise<CashSession> {
    const res = await this.call<typeof input, CashSession>('closeCashSession')(input);
    return res.data;
  }
}
