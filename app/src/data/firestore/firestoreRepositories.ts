import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
  setDoc,
  updateDoc,
  Timestamp,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Plan, PlanInput, PlanRepository } from '@/domain/plan/plan.entity';
import type { Membership, MembershipRepository } from '@/domain/membership/membership.entity';
import type { Payment, PaymentRepository } from '@/domain/payment/payment.entity';
import type { CheckIn, CheckInRepository } from '@/domain/checkin/checkin.entity';
import type { CashSession, CashMovement, CashboxRepository } from '@/domain/cashbox/cashbox.entity';
import type { DashboardStats, StatsRepository } from '@/domain/stats/stats';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';

const d = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());
const col = (db: Firestore, orgId: string, name: string) =>
  collection(db, 'organizations', orgId, name);

function toPlan(id: string, x: DocumentData): Plan {
  return {
    id,
    name: x.name,
    type: x.type,
    priceCents: x.priceCents,
    currency: x.currency,
    durationDays: x.durationDays,
    isActive: x.isActive ?? true,
    allowsFreeze: x.allowsFreeze ?? false,
    createdAt: d(x.createdAt),
    updatedAt: d(x.updatedAt),
  };
}
function toMembership(id: string, x: DocumentData): Membership {
  return {
    id,
    memberId: x.memberId,
    planId: x.planId,
    planNameSnapshot: x.planNameSnapshot,
    priceCentsSnapshot: x.priceCentsSnapshot,
    currency: x.currency,
    status: x.status,
    startDate: d(x.startDate),
    endDate: d(x.endDate),
    frozenDays: x.frozenDays ?? 0,
    createdAt: d(x.createdAt),
    updatedAt: d(x.updatedAt),
  };
}
function toPayment(id: string, x: DocumentData): Payment {
  return {
    id,
    memberId: x.memberId,
    memberNameSnapshot: x.memberNameSnapshot ?? '',
    membershipId: x.membershipId ?? null,
    amountCents: x.amountCents,
    currency: x.currency,
    method: x.method,
    cashSessionId: x.cashSessionId ?? null,
    staffUid: x.staffUid,
    notes: x.notes ?? null,
    receiptNumber: x.receiptNumber,
    createdAt: d(x.createdAt),
  };
}
function toCheckIn(id: string, x: DocumentData): CheckIn {
  return {
    id,
    memberId: x.memberId,
    memberNameSnapshot: x.memberNameSnapshot ?? '',
    result: x.result,
    source: x.source,
    createdAt: d(x.createdAt),
    dateKey: x.dateKey,
  };
}
function toSession(id: string, x: DocumentData): CashSession {
  return {
    id,
    status: x.status,
    openedBy: x.openedBy,
    openedAt: d(x.openedAt),
    openingFloatCents: x.openingFloatCents,
    currency: x.currency,
    closedBy: x.closedBy ?? null,
    closedAt: x.closedAt ? d(x.closedAt) : null,
    totals: x.totals ?? {
      incomeCents: 0,
      expenseCents: 0,
      expectedCents: 0,
      countedCents: 0,
      diffCents: 0,
    },
  };
}

export class FirestorePlanRepository implements PlanRepository {
  constructor(private db: Firestore) {}
  async list(orgId: string): Promise<Plan[]> {
    const snap = await getDocs(query(col(this.db, orgId, 'plans'), orderBy('priceCents', 'asc')));
    return snap.docs.map((s) => toPlan(s.id, s.data()));
  }
  async getById(orgId: string, id: string): Promise<Plan | null> {
    const s = await getDoc(doc(col(this.db, orgId, 'plans'), id));
    return s.exists() ? toPlan(s.id, s.data()) : null;
  }
  async create(orgId: string, input: PlanInput): Promise<Plan> {
    const ref = doc(col(this.db, orgId, 'plans'));
    const now = new Date();
    await setDoc(ref, {
      ...input,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return { id: ref.id, ...input, createdAt: now, updatedAt: now };
  }
  async update(orgId: string, id: string, input: Partial<PlanInput>): Promise<void> {
    await updateDoc(doc(col(this.db, orgId, 'plans'), id), {
      ...input,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

export class FirestoreMembershipRepository implements MembershipRepository {
  constructor(private db: Firestore) {}
  async getCurrentForMember(orgId: string, memberId: string): Promise<Membership | null> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'memberships'),
        where('memberId', '==', memberId),
        orderBy('endDate', 'desc'),
        fbLimit(1),
      ),
    );
    const first = snap.docs[0];
    return first ? toMembership(first.id, first.data()) : null;
  }
  async listForMember(orgId: string, memberId: string): Promise<Membership[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'memberships'),
        where('memberId', '==', memberId),
        orderBy('endDate', 'desc'),
      ),
    );
    return snap.docs.map((s) => toMembership(s.id, s.data()));
  }
}

export class FirestorePaymentRepository implements PaymentRepository {
  constructor(private db: Firestore) {}
  private async run(orgId: string, ...cs: QueryConstraint[]) {
    const snap = await getDocs(query(col(this.db, orgId, 'payments'), ...cs));
    return snap.docs.map((s) => toPayment(s.id, s.data()));
  }
  async listRecent(orgId: string, max = 50): Promise<Payment[]> {
    return this.run(orgId, orderBy('createdAt', 'desc'), fbLimit(max));
  }
  async listForMember(orgId: string, memberId: string, max = 20): Promise<Payment[]> {
    return this.run(
      orgId,
      where('memberId', '==', memberId),
      orderBy('createdAt', 'desc'),
      fbLimit(max),
    );
  }
  async listForSession(orgId: string, sessionId: string): Promise<Payment[]> {
    return this.run(orgId, where('cashSessionId', '==', sessionId), orderBy('createdAt', 'asc'));
  }
}

export class FirestoreCheckInRepository implements CheckInRepository {
  constructor(private db: Firestore) {}
  async listRecentForMember(orgId: string, memberId: string, max = 10): Promise<CheckIn[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'checkins'),
        where('memberId', '==', memberId),
        orderBy('createdAt', 'desc'),
        fbLimit(max),
      ),
    );
    return snap.docs.map((s) => toCheckIn(s.id, s.data()));
  }
  async listToday(orgId: string): Promise<CheckIn[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'checkins'),
        where('dateKey', '==', dateKeyOf(new Date())),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map((s) => toCheckIn(s.id, s.data()));
  }
}

export class FirestoreCashboxRepository implements CashboxRepository {
  constructor(private db: Firestore) {}
  async getOpenSession(orgId: string): Promise<CashSession | null> {
    const snap = await getDocs(
      query(col(this.db, orgId, 'cashSessions'), where('status', '==', 'open'), fbLimit(1)),
    );
    const first = snap.docs[0];
    return first ? toSession(first.id, first.data()) : null;
  }
  async listMovements(orgId: string, sessionId: string): Promise<CashMovement[]> {
    const snap = await getDocs(
      query(
        collection(this.db, 'organizations', orgId, 'cashSessions', sessionId, 'movements'),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map((s) => {
      const x = s.data();
      return {
        id: s.id,
        sessionId,
        type: x.type,
        amountCents: x.amountCents,
        currency: x.currency,
        reason: x.reason,
        paymentId: x.paymentId ?? null,
        staffUid: x.staffUid,
        createdAt: d(x.createdAt),
      };
    });
  }
  async listRecentSessions(orgId: string, max = 10): Promise<CashSession[]> {
    const snap = await getDocs(
      query(col(this.db, orgId, 'cashSessions'), orderBy('openedAt', 'desc'), fbLimit(max)),
    );
    return snap.docs.map((s) => toSession(s.id, s.data()));
  }
}

export class FirestoreStatsRepository implements StatsRepository {
  constructor(private db: Firestore) {}
  async getDashboard(orgId: string): Promise<DashboardStats> {
    // En prod los rollups los mantienen Cloud Functions (counters/*). Aquí se lee
    // el documento agregado del día; si no existe aún, se devuelven ceros.
    const key = dateKeyOf(new Date());
    const s = await getDoc(doc(col(this.db, orgId, 'counters'), `daily-${key}`));
    const x = s.data() ?? {};
    return {
      activeMembers: x.activeMembers ?? 0,
      expiredMembers: x.expiredMembers ?? 0,
      checkinsToday: x.checkinsToday ?? 0,
      incomeTodayCents: x.incomeTodayCents ?? 0,
      incomeMonthCents: x.incomeMonthCents ?? 0,
      pendingRenewals: x.pendingRenewals ?? 0,
      currency: x.currency ?? 'CUP',
      weeklyAttendance: x.weeklyAttendance ?? [0, 0, 0, 0, 0, 0, 0],
    };
  }
}
