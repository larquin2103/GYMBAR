import { normalizeSearch, type MemberStatus, type PlanType } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import type { Plan } from '@/domain/plan/plan.entity';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession, CashMovement } from '@/domain/cashbox/cashbox.entity';
import { addDays, startOfDay } from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';

export const DEMO_ORG_ID = 'demo-org';
const CURRENCY = 'MXN';

export interface DemoData {
  members: Member[];
  plans: Plan[];
  memberships: Membership[];
  payments: Payment[];
  checkins: CheckIn[];
  cashSessions: CashSession[];
  cashMovements: CashMovement[];
  receiptSeq: number;
}

function uid(): string {
  return crypto.randomUUID();
}

function buildSeed(): DemoData {
  const now = new Date();
  const plans: Plan[] = [
    plan('Diario', 'daily', 5000, 1),
    plan('Semanal', 'weekly', 25000, 7),
    plan('Quincenal', 'biweekly', 40000, 15),
    plan('Mensual', 'monthly', 70000, 30),
    plan('Anual', 'annual', 700000, 365),
  ];

  function plan(name: string, type: PlanType, priceCents: number, durationDays: number): Plan {
    return {
      id: uid(),
      name,
      type,
      priceCents,
      currency: CURRENCY,
      durationDays,
      isActive: true,
      allowsFreeze: type === 'monthly' || type === 'annual',
      createdAt: now,
      updatedAt: now,
    };
  }

  const monthly = plans[3]!;
  const members: Member[] = [];
  const memberships: Membership[] = [];
  const payments: Payment[] = [];
  const checkins: CheckIn[] = [];

  const people: [string, string, MemberStatus, string, number | null][] = [
    ['Ana', 'García', 'active', '+52 55 1234 5678', 12],
    ['Carlos', 'Martínez', 'active', '+52 55 2345 6789', 3],
    ['Lucía', 'Fernández', 'expired', '+52 55 3456 7890', -5],
    ['Miguel', 'Rodríguez', 'pending', '+52 55 4567 8901', null],
    ['Sofía', 'López', 'frozen', '+52 55 5678 9012', 20],
    ['Diego', 'Hernández', 'active', '+52 55 6789 0123', 45],
    ['Valentina', 'Torres', 'expired', '+52 55 7890 1234', -18],
    ['Mateo', 'Ramírez', 'active', '+52 55 8901 2345', 8],
  ];

  for (const [firstName, lastName, status, phone, daysToEnd] of people) {
    const memberId = uid();
    let currentMembershipId: string | null = null;
    let membershipEndDate: Date | null = null;

    if (daysToEnd !== null && status !== 'pending') {
      const end = startOfDay(addDays(now, daysToEnd));
      const start = addDays(end, -monthly.durationDays);
      const membershipId = uid();
      memberships.push({
        id: membershipId,
        memberId,
        planId: monthly.id,
        planNameSnapshot: monthly.name,
        priceCentsSnapshot: monthly.priceCents,
        currency: CURRENCY,
        status: status === 'frozen' ? 'frozen' : status === 'expired' ? 'expired' : 'active',
        startDate: start,
        endDate: end,
        frozenDays: 0,
        createdAt: start,
        updatedAt: now,
      });
      currentMembershipId = membershipId;
      membershipEndDate = end;
      payments.push({
        id: uid(),
        memberId,
        memberNameSnapshot: `${firstName} ${lastName}`,
        membershipId,
        amountCents: monthly.priceCents,
        currency: CURRENCY,
        method: 'cash',
        cashSessionId: null,
        staffUid: 'seed',
        notes: null,
        receiptNumber: `R-${1000 + payments.length}`,
        createdAt: start,
      });
    }

    members.push({
      id: memberId,
      code: `M-${1000 + members.length}`,
      firstName,
      lastName,
      searchName: normalizeSearch(`${firstName} ${lastName}`),
      phone,
      email: null,
      photoUrl: null,
      notes: null,
      status,
      currentMembershipId,
      membershipEndDate,
      lastCheckInAt: null,
      createdAt: startOfDay(addDays(now, -60)),
      updatedAt: now,
    });
  }

  // Asistencias repartidas en la semana (para el gráfico del dashboard).
  const activeMembers = members.filter((m) => m.status === 'active');
  for (let d = 0; d < 7; d++) {
    const day = startOfDay(addDays(now, -d));
    const count = [3, 5, 4, 6, 7, 4, 2][d] ?? 2;
    for (let i = 0; i < count; i++) {
      const m = activeMembers[i % activeMembers.length]!;
      checkins.push({
        id: uid(),
        memberId: m.id,
        memberNameSnapshot: `${m.firstName} ${m.lastName}`,
        result: 'allowed',
        source: 'search',
        createdAt: new Date(day.getTime() + i * 3600_000),
        dateKey: dateKeyOf(day),
      });
    }
  }

  return {
    members,
    plans,
    memberships,
    payments,
    checkins,
    cashSessions: [],
    cashMovements: [],
    receiptSeq: 2000,
  };
}

const stores = new Map<string, DemoData>();

/** Devuelve (creando si hace falta) los datos de demo de una organización. */
export function getDemoData(orgId: string): DemoData {
  let data = stores.get(orgId);
  if (!data) {
    data = orgId === DEMO_ORG_ID ? buildSeed() : emptyData();
    stores.set(orgId, data);
  }
  return data;
}

function emptyData(): DemoData {
  return {
    members: [],
    plans: [],
    memberships: [],
    payments: [],
    checkins: [],
    cashSessions: [],
    cashMovements: [],
    receiptSeq: 1000,
  };
}

export function nextReceiptNumber(orgId: string): string {
  const data = getDemoData(orgId);
  data.receiptSeq += 1;
  return `R-${data.receiptSeq}`;
}
