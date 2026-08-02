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
  runTransaction,
  Timestamp,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { Plan, PlanInput, PlanRepository } from '@/domain/plan/plan.entity';
import type { Membership, MembershipRepository } from '@/domain/membership/membership.entity';
import type { Payment, PaymentRepository } from '@/domain/payment/payment.entity';
import type { CheckIn, CheckInRepository } from '@/domain/checkin/checkin.entity';
import type { CashSession, CashMovement, CashboxRepository } from '@/domain/cashbox/cashbox.entity';
import {
  materializeMeasurement,
  type Measurement,
  type MeasurementInput,
  type MeasurementRepository,
} from '@/domain/measurement/measurement.entity';
import type {
  OrganizationSettings,
  OrganizationSettingsInput,
  OrganizationRepository,
} from '@/domain/organization/organization.entity';
import type {
  StaffUser,
  StaffInput,
  StaffRepository,
  AddStaffResult,
} from '@/domain/staff/staff.entity';
import type {
  ExpiringRow,
  RosterRow,
  ReportsRepository,
} from '@/domain/reports/reports.entity';
import type {
  Routine,
  RoutineInput,
  RoutineStatus,
  RoutineRepository,
} from '@/domain/routine/routine.entity';
import type {
  Product,
  ProductInput,
  ProductRepository,
  StockMovement,
  Sale,
  AdjustStockInput,
  InventoryRepository,
} from '@/domain/product/product.entity';
import type { Role } from '@gymbar/shared';
import type { DashboardStats, StatsRepository } from '@/domain/stats/stats';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';
import { startOfDay } from '@/domain/membership/membership.logic';
import { memberFromDoc } from '@/data/member/member.mapper';

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
  async listRange(orgId: string, fromKey: string, toKey: string): Promise<CheckIn[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'checkins'),
        where('dateKey', '>=', fromKey),
        where('dateKey', '<=', toKey),
        orderBy('dateKey', 'desc'),
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

export class FirestoreMeasurementRepository implements MeasurementRepository {
  constructor(private db: Firestore) {}
  private col(orgId: string, memberId: string) {
    return collection(this.db, 'organizations', orgId, 'members', memberId, 'measurements');
  }
  async listForMember(orgId: string, memberId: string): Promise<Measurement[]> {
    const snap = await getDocs(query(this.col(orgId, memberId), orderBy('date', 'desc')));
    return snap.docs.map((s) => {
      const x = s.data();
      return materializeMeasurement(
        s.id,
        memberId,
        {
          date: d(x.date),
          weightKg: x.weightKg ?? null,
          heightCm: x.heightCm ?? null,
          bodyFatPct: x.bodyFatPct ?? null,
          muscleKg: x.muscleKg ?? null,
          neckCm: x.neckCm ?? null,
          chestCm: x.chestCm ?? null,
          waistCm: x.waistCm ?? null,
          hipCm: x.hipCm ?? null,
          armCm: x.armCm ?? null,
          thighCm: x.thighCm ?? null,
          calfCm: x.calfCm ?? null,
          notes: x.notes ?? null,
        },
        d(x.createdAt),
      );
    });
  }
  async add(orgId: string, memberId: string, input: MeasurementInput): Promise<Measurement> {
    const ref = doc(this.col(orgId, memberId));
    const now = new Date();
    const m = materializeMeasurement(ref.id, memberId, input, now);
    await setDoc(ref, {
      date: Timestamp.fromDate(m.date),
      weightKg: m.weightKg,
      heightCm: m.heightCm,
      bodyFatPct: m.bodyFatPct,
      muscleKg: m.muscleKg,
      neckCm: m.neckCm,
      chestCm: m.chestCm,
      waistCm: m.waistCm,
      hipCm: m.hipCm,
      armCm: m.armCm,
      thighCm: m.thighCm,
      calfCm: m.calfCm,
      notes: m.notes,
      createdAt: Timestamp.fromDate(now),
    });
    return m;
  }
}

export class FirestoreOrganizationRepository implements OrganizationRepository {
  constructor(private db: Firestore) {}
  async getSettings(orgId: string): Promise<OrganizationSettings> {
    const s = await getDoc(doc(this.db, 'organizations', orgId));
    const x = s.data() ?? {};
    return {
      name: x.name ?? 'Mi Gimnasio',
      currency: x.currency ?? 'CUP',
      phone: x.phone ?? null,
      address: x.address ?? null,
      kioskBlockExpired: x.kioskBlockExpired ?? true,
    };
  }
  async updateSettings(orgId: string, input: OrganizationSettingsInput): Promise<void> {
    await updateDoc(doc(this.db, 'organizations', orgId), {
      ...input,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

export class FirestoreStaffRepository implements StaffRepository {
  constructor(
    private db: Firestore,
    private fns: Functions,
  ) {}
  private col(orgId: string) {
    return collection(this.db, 'organizations', orgId, 'staff');
  }
  async list(orgId: string): Promise<StaffUser[]> {
    const snap = await getDocs(this.col(orgId));
    return snap.docs.map((s) => {
      const x = s.data();
      return {
        id: s.id,
        displayName: x.displayName ?? '',
        email: x.email ?? '',
        role: (x.role ?? 'reception') as Role,
        createdAt: d(x.createdAt),
      };
    });
  }
  async add(orgId: string, input: StaffInput): Promise<AddStaffResult> {
    // Alta de punta a punta vía Cloud Function: crea la cuenta de acceso, asigna
    // claims (orgId + rol) y registra el directorio. Devuelve el enlace para que
    // el usuario fije su contraseña (server-authoritative, ver docs/05).
    const res = await httpsCallable<
      { orgId: string; email: string; displayName: string; role: Role },
      {
        uid: string;
        email: string;
        displayName: string;
        role: Role;
        createdAt: string;
        resetLink: string | null;
      }
    >(
      this.fns,
      'inviteStaff',
    )({ orgId, email: input.email, displayName: input.displayName, role: input.role });
    const x = res.data;
    return {
      id: x.uid,
      displayName: x.displayName,
      email: x.email,
      role: x.role,
      createdAt: new Date(x.createdAt),
      inviteLink: x.resetLink ?? null,
    };
  }
  async updateRole(orgId: string, id: string, role: Role): Promise<void> {
    await httpsCallable<{ orgId: string; targetUid: string; role: Role }, { ok: boolean }>(
      this.fns,
      'setUserRole',
    )({ orgId, targetUid: id, role });
  }
  async remove(orgId: string, id: string): Promise<void> {
    await httpsCallable<{ orgId: string; targetUid: string }, { ok: boolean }>(
      this.fns,
      'removeStaff',
    )({ orgId, targetUid: id });
  }
}

function toRoutine(id: string, x: DocumentData): Routine {
  return {
    id,
    memberId: x.memberId,
    memberNameSnapshot: x.memberNameSnapshot ?? '',
    title: x.title ?? '',
    goal: x.goal ?? null,
    days: Array.isArray(x.days) ? x.days : [],
    notes: x.notes ?? null,
    status: (x.status ?? 'active') as RoutineStatus,
    createdBy: x.createdBy ?? '',
    createdAt: d(x.createdAt),
    updatedAt: d(x.updatedAt),
  };
}

export class FirestoreRoutineRepository implements RoutineRepository {
  constructor(private db: Firestore) {}
  async listRecent(orgId: string, max = 50): Promise<Routine[]> {
    const snap = await getDocs(
      query(col(this.db, orgId, 'routines'), orderBy('updatedAt', 'desc'), fbLimit(max)),
    );
    return snap.docs.map((s) => toRoutine(s.id, s.data()));
  }
  async listForMember(orgId: string, memberId: string): Promise<Routine[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'routines'),
        where('memberId', '==', memberId),
        orderBy('updatedAt', 'desc'),
      ),
    );
    return snap.docs.map((s) => toRoutine(s.id, s.data()));
  }
  async getById(orgId: string, id: string): Promise<Routine | null> {
    const s = await getDoc(doc(col(this.db, orgId, 'routines'), id));
    return s.exists() ? toRoutine(s.id, s.data()) : null;
  }
  async create(orgId: string, input: RoutineInput, createdBy: string): Promise<Routine> {
    const ref = doc(col(this.db, orgId, 'routines'));
    const now = new Date();
    await setDoc(ref, {
      ...input,
      status: 'active',
      createdBy,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return { id: ref.id, ...input, status: 'active', createdBy, createdAt: now, updatedAt: now };
  }
  async update(orgId: string, id: string, input: RoutineInput): Promise<void> {
    await updateDoc(doc(col(this.db, orgId, 'routines'), id), {
      ...input,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
  async setStatus(orgId: string, id: string, status: RoutineStatus): Promise<void> {
    await updateDoc(doc(col(this.db, orgId, 'routines'), id), {
      status,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

function toProduct(id: string, x: DocumentData): Product {
  return {
    id,
    name: x.name ?? '',
    sku: x.sku ?? '',
    category: x.category ?? '',
    priceCents: x.priceCents ?? 0,
    costCents: x.costCents ?? null,
    currency: x.currency ?? 'CUP',
    stock: x.stock ?? 0,
    lowStockThreshold: x.lowStockThreshold ?? 0,
    isActive: x.isActive ?? true,
    createdAt: d(x.createdAt),
    updatedAt: d(x.updatedAt),
  };
}

export class FirestoreProductRepository implements ProductRepository {
  constructor(private db: Firestore) {}
  async list(orgId: string): Promise<Product[]> {
    const snap = await getDocs(query(col(this.db, orgId, 'products'), orderBy('name', 'asc')));
    return snap.docs.map((s) => toProduct(s.id, s.data()));
  }
  async getById(orgId: string, id: string): Promise<Product | null> {
    const s = await getDoc(doc(col(this.db, orgId, 'products'), id));
    return s.exists() ? toProduct(s.id, s.data()) : null;
  }
  async create(orgId: string, input: ProductInput): Promise<Product> {
    const ref = doc(col(this.db, orgId, 'products'));
    const now = new Date();
    await setDoc(ref, {
      ...input,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return { id: ref.id, ...input, createdAt: now, updatedAt: now };
  }
  async update(orgId: string, id: string, input: Partial<ProductInput>): Promise<void> {
    await updateDoc(doc(col(this.db, orgId, 'products'), id), {
      ...input,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

export class FirestoreInventoryRepository implements InventoryRepository {
  constructor(private db: Firestore) {}
  async listMovements(orgId: string, max = 100): Promise<StockMovement[]> {
    const snap = await getDocs(
      query(col(this.db, orgId, 'stockMovements'), orderBy('createdAt', 'desc'), fbLimit(max)),
    );
    return snap.docs.map((s) => {
      const x = s.data();
      return {
        id: s.id,
        productId: x.productId,
        productNameSnapshot: x.productNameSnapshot ?? '',
        type: x.type,
        quantityDelta: x.quantityDelta ?? 0,
        stockAfter: x.stockAfter ?? 0,
        reason: x.reason ?? '',
        saleId: x.saleId ?? null,
        staffUid: x.staffUid ?? '',
        createdAt: d(x.createdAt),
      };
    });
  }
  async adjustStock(orgId: string, input: AdjustStockInput): Promise<void> {
    const productRef = doc(col(this.db, orgId, 'products'), input.productId);
    const moveRef = doc(col(this.db, orgId, 'stockMovements'));
    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists()) throw new Error('Producto no encontrado');
      const product = toProduct(snap.id, snap.data());
      const nextStock = product.stock + input.delta;
      if (nextStock < 0) throw new Error('El ajuste dejaría el stock en negativo');
      tx.update(productRef, { stock: nextStock, updatedAt: Timestamp.fromDate(new Date()) });
      tx.set(moveRef, {
        productId: product.id,
        productNameSnapshot: product.name,
        type: input.type,
        quantityDelta: input.delta,
        stockAfter: nextStock,
        reason: input.reason,
        saleId: null,
        staffUid: input.staffUid,
        createdAt: Timestamp.fromDate(new Date()),
      });
    });
  }
  async listRecentSales(orgId: string, max = 50): Promise<Sale[]> {
    const snap = await getDocs(
      query(col(this.db, orgId, 'sales'), orderBy('createdAt', 'desc'), fbLimit(max)),
    );
    return snap.docs.map((s) => {
      const x = s.data();
      return {
        id: s.id,
        items: Array.isArray(x.items) ? x.items : [],
        totalCents: x.totalCents ?? 0,
        currency: x.currency ?? 'CUP',
        method: x.method,
        memberId: x.memberId ?? null,
        memberNameSnapshot: x.memberNameSnapshot ?? null,
        cashSessionId: x.cashSessionId ?? null,
        staffUid: x.staffUid ?? '',
        createdAt: d(x.createdAt),
      };
    });
  }
}

export class FirestoreReportsRepository implements ReportsRepository {
  constructor(private db: Firestore) {}
  async income(orgId: string, fromKey: string, toKey: string): Promise<Payment[]> {
    const from = Timestamp.fromDate(new Date(`${fromKey}T00:00:00`));
    const to = Timestamp.fromDate(new Date(`${toKey}T23:59:59.999`));
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'payments'),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map((s) => toPayment(s.id, s.data()));
  }
  async attendance(orgId: string, fromKey: string, toKey: string): Promise<CheckIn[]> {
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'checkins'),
        where('dateKey', '>=', fromKey),
        where('dateKey', '<=', toKey),
        orderBy('dateKey', 'desc'),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map((s) => toCheckIn(s.id, s.data()));
  }
  async expiring(orgId: string, withinDays: number): Promise<ExpiringRow[]> {
    const today = startOfDay(new Date());
    const threshold = Timestamp.fromDate(startOfDay(new Date(today.getTime() + withinDays * 86_400_000)));
    const snap = await getDocs(
      query(
        col(this.db, orgId, 'members'),
        where('membershipEndDate', '<=', threshold),
        orderBy('membershipEndDate', 'asc'),
      ),
    );
    return snap.docs.map((s) => {
      const m = memberFromDoc(s.id, s.data());
      const end = m.membershipEndDate ?? today;
      const daysLeft = Math.round((startOfDay(end).getTime() - today.getTime()) / 86_400_000);
      return {
        memberId: m.id,
        memberName: `${m.firstName} ${m.lastName}`,
        phone: m.phone,
        planName: null,
        endDate: end,
        daysLeft,
      };
    });
  }
  async roster(orgId: string): Promise<RosterRow[]> {
    const snap = await getDocs(query(col(this.db, orgId, 'members'), orderBy('searchName', 'asc')));
    return snap.docs.map((s) => {
      const m = memberFromDoc(s.id, s.data());
      return {
        memberId: m.id,
        code: m.code,
        name: `${m.firstName} ${m.lastName}`,
        phone: m.phone,
        status: m.status,
        goal: m.goal,
        endDate: m.membershipEndDate,
        createdAt: m.createdAt,
      };
    });
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
