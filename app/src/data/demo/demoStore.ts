import { normalizeSearch, type MemberGoal, type MemberStatus, type PlanType } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import type { Plan } from '@/domain/plan/plan.entity';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession, CashMovement } from '@/domain/cashbox/cashbox.entity';
import type { Measurement } from '@/domain/measurement/measurement.entity';
import type { OrganizationSettings } from '@/domain/organization/organization.entity';
import type { StaffUser } from '@/domain/staff/staff.entity';
import { addDays, startOfDay } from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';

export const DEMO_ORG_ID = 'demo-org';
const CURRENCY = 'CUP';

export interface DemoData {
  members: Member[];
  plans: Plan[];
  memberships: Membership[];
  payments: Payment[];
  checkins: CheckIn[];
  cashSessions: CashSession[];
  cashMovements: CashMovement[];
  measurements: Measurement[];
  settings: OrganizationSettings;
  staff: StaffUser[];
  receiptSeq: number;
}

function defaultSettings(): OrganizationSettings {
  return {
    name: 'Mi Gimnasio',
    currency: CURRENCY,
    phone: null,
    address: null,
    kioskBlockExpired: true,
  };
}

function seedStaff(now: Date): StaffUser[] {
  return [
    { id: 'demo-admin', displayName: 'Administrador demo', email: 'demo@gymbar.app', role: 'admin', createdAt: now },
    { id: crypto.randomUUID(), displayName: 'Recepción', email: 'recepcion@gymbar.app', role: 'reception', createdAt: now },
    { id: crypto.randomUUID(), displayName: 'Entrenador', email: 'coach@gymbar.app', role: 'trainer', createdAt: now },
  ];
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

  const people: [string, string, MemberStatus, string, number | null, MemberGoal][] = [
    ['Ana', 'García', 'active', '+53 5 234 5678', 12, 'lose_weight'],
    ['Carlos', 'Martínez', 'active', '+53 5 345 6789', 3, 'gain_muscle'],
    ['Lucía', 'Fernández', 'expired', '+53 5 456 7890', -5, 'maintain'],
    ['Miguel', 'Rodríguez', 'pending', '+53 5 567 8901', null, 'endurance'],
    ['Sofía', 'López', 'frozen', '+53 5 678 9012', 20, 'lose_weight'],
    ['Diego', 'Hernández', 'active', '+53 5 789 0123', 45, 'gain_muscle'],
    ['Valentina', 'Torres', 'expired', '+53 5 890 1234', -18, 'maintain'],
    ['Mateo', 'Ramírez', 'active', '+53 5 901 2345', 8, 'endurance'],
  ];

  for (const [firstName, lastName, status, phone, daysToEnd, goal] of people) {
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
      accessCode: String(1001 + members.length),
      firstName,
      lastName,
      searchName: normalizeSearch(`${firstName} ${lastName}`),
      phone,
      email: null,
      photoUrl: null,
      goal,
      notes: null,
      status,
      currentMembershipId,
      membershipEndDate,
      lastCheckInAt: null,
      createdAt: startOfDay(addDays(now, -60)),
      updatedAt: now,
    });
  }

  // Serie de medidas para mostrar evolución (Ana baja de peso, Diego gana masa).
  const measurements: Measurement[] = [];
  function seedSeries(member: Member | undefined, startWeight: number, deltaPerMonth: number) {
    if (!member) return;
    for (let m = 5; m >= 0; m--) {
      const date = startOfDay(addDays(now, -m * 30));
      const weightKg = Math.round((startWeight + deltaPerMonth * (5 - m)) * 10) / 10;
      const losing = deltaPerMonth < 0;
      const gaining = deltaPerMonth > 0;
      measurements.push({
        id: uid(),
        memberId: member.id,
        date,
        weightKg,
        heightCm: member.firstName === 'Ana' ? 168 : 175,
        bodyFatPct: losing ? Math.round((28 - (5 - m) * 1.2) * 10) / 10 : null,
        muscleKg: gaining ? Math.round((32 + (5 - m) * 0.8) * 10) / 10 : null,
        neckCm: null,
        chestCm: gaining ? Math.round(96 + (5 - m) * 0.6) : null,
        waistCm: losing ? Math.round(92 - (5 - m) * 1.5) : null,
        hipCm: losing ? Math.round(104 - (5 - m) * 1.0) : null,
        armCm: gaining ? Math.round(34 + (5 - m) * 0.4) : null,
        thighCm: null,
        calfCm: null,
        notes: null,
        createdAt: date,
      });
    }
  }
  seedSeries(
    members.find((m) => m.firstName === 'Ana'),
    82,
    -2.2,
  );
  seedSeries(
    members.find((m) => m.firstName === 'Diego'),
    70,
    1.4,
  );

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
    measurements,
    settings: defaultSettings(),
    staff: seedStaff(now),
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
    measurements: [],
    settings: defaultSettings(),
    staff: seedStaff(new Date()),
    receiptSeq: 1000,
  };
}

export function nextReceiptNumber(orgId: string): string {
  const data = getDemoData(orgId);
  data.receiptSeq += 1;
  return `R-${data.receiptSeq}`;
}
