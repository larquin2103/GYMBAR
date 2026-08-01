/** Turno de caja con apertura, movimientos y cierre (ver docs/03, docs/04). */
export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  openedBy: string;
  openedAt: Date;
  openingFloatCents: number;
  currency: string;
  closedBy: string | null;
  closedAt: Date | null;
  totals: {
    incomeCents: number;
    expenseCents: number;
    expectedCents: number;
    countedCents: number;
    diffCents: number;
  };
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'income' | 'expense';
  amountCents: number;
  currency: string;
  reason: string;
  paymentId: string | null;
  staffUid: string;
  createdAt: Date;
}

export interface CashboxRepository {
  getOpenSession(orgId: string): Promise<CashSession | null>;
  listMovements(orgId: string, sessionId: string): Promise<CashMovement[]>;
  listRecentSessions(orgId: string, max?: number): Promise<CashSession[]>;
}
