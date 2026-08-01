import type { PaymentMethod } from '@gymbar/shared';

/** Pago inmutable (ver docs/03, docs/04). Las correcciones son anulaciones. */
export interface Payment {
  id: string;
  memberId: string;
  memberNameSnapshot: string;
  membershipId: string | null;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  cashSessionId: string | null;
  staffUid: string;
  notes: string | null;
  receiptNumber: string;
  createdAt: Date;
}

export interface PaymentRepository {
  listRecent(orgId: string, max?: number): Promise<Payment[]>;
  listForMember(orgId: string, memberId: string, max?: number): Promise<Payment[]>;
  listForSession(orgId: string, sessionId: string): Promise<Payment[]>;
}
