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

/** Personal en el store demo: incluye el PIN (en claro; solo memoria de demo). */
export interface DemoStaff extends StaffUser {
  pin: string;
}
import type { Routine } from '@/domain/routine/routine.entity';
import type { Product, StockMovement, Sale } from '@/domain/product/product.entity';
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
  routines: Routine[];
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  settings: OrganizationSettings;
  staff: DemoStaff[];
  receiptSeq: number;
}

function defaultSettings(): OrganizationSettings {
  return {
    name: 'Mi Gimnasio',
    currency: CURRENCY,
    phone: null,
    address: null,
    logoUrl: null,
    kioskBlockExpired: true,
  };
}

function seedStaff(now: Date): DemoStaff[] {
  return [
    { id: 'demo-admin', displayName: 'Administrador demo', email: 'demo@gymbar.app', role: 'admin', active: true, pin: '1234', createdAt: now },
    { id: crypto.randomUUID(), displayName: 'Recepción', email: 'recepcion@gymbar.app', role: 'reception', active: true, pin: '2345', createdAt: now },
    { id: 'demo-trainer', displayName: 'Entrenador', email: 'coach@gymbar.app', role: 'trainer', active: true, pin: '3456', createdAt: now },
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

  // El 7.º campo es el entrenador asignado (id de staff). 'demo-trainer' deja
  // ver la vista de "mis clientes" al iniciar sesión como Entrenador (PIN 3456).
  const people: [string, string, MemberStatus, string, number | null, MemberGoal, string | null][] =
    [
      ['Ana', 'García', 'active', '+53 5 234 5678', 12, 'lose_weight', 'demo-trainer'],
      ['Carlos', 'Martínez', 'active', '+53 5 345 6789', 3, 'gain_muscle', null],
      ['Lucía', 'Fernández', 'expired', '+53 5 456 7890', -5, 'maintain', null],
      ['Miguel', 'Rodríguez', 'pending', '+53 5 567 8901', null, 'endurance', null],
      ['Sofía', 'López', 'frozen', '+53 5 678 9012', 20, 'lose_weight', 'demo-trainer'],
      ['Diego', 'Hernández', 'active', '+53 5 789 0123', 45, 'gain_muscle', 'demo-trainer'],
      ['Valentina', 'Torres', 'expired', '+53 5 890 1234', -18, 'maintain', null],
      ['Mateo', 'Ramírez', 'active', '+53 5 901 2345', 8, 'endurance', 'demo-trainer'],
    ];

  for (const [firstName, lastName, status, phone, daysToEnd, goal, trainerId] of people) {
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
      trainerId,
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

  // Rutinas de ejemplo asignadas por el entrenador.
  const routines: Routine[] = [];
  const ana = members.find((m) => m.firstName === 'Ana');
  const diego = members.find((m) => m.firstName === 'Diego');
  if (ana) {
    routines.push({
      id: uid(),
      memberId: ana.id,
      memberNameSnapshot: `${ana.firstName} ${ana.lastName}`,
      title: 'Quema de grasa · 3 días',
      goal: 'lose_weight',
      status: 'active',
      createdBy: 'seed',
      createdAt: startOfDay(addDays(now, -20)),
      updatedAt: startOfDay(addDays(now, -20)),
      notes: 'Cardio moderado al finalizar cada sesión (20 min).',
      days: [
        {
          label: 'Día 1 — Tren inferior',
          exercises: [
            { name: 'Sentadilla goblet', sets: 4, reps: '12', restSeconds: 60, notes: null },
            { name: 'Peso muerto rumano', sets: 3, reps: '12', restSeconds: 90, notes: null },
            { name: 'Zancadas', sets: 3, reps: '10 c/pierna', restSeconds: 60, notes: null },
            { name: 'Elevación de gemelos', sets: 4, reps: '15', restSeconds: 45, notes: null },
          ],
        },
        {
          label: 'Día 2 — Tren superior',
          exercises: [
            { name: 'Press de banca con mancuernas', sets: 4, reps: '10-12', restSeconds: 75, notes: null },
            { name: 'Remo con barra', sets: 4, reps: '10-12', restSeconds: 75, notes: null },
            { name: 'Press militar', sets: 3, reps: '12', restSeconds: 60, notes: null },
          ],
        },
        {
          label: 'Día 3 — Full body + core',
          exercises: [
            { name: 'Prensa de piernas', sets: 3, reps: '15', restSeconds: 60, notes: null },
            { name: 'Jalón al pecho', sets: 3, reps: '12', restSeconds: 60, notes: null },
            { name: 'Plancha', sets: 3, reps: '45 s', restSeconds: 45, notes: null },
          ],
        },
      ],
    });
  }
  if (diego) {
    routines.push({
      id: uid(),
      memberId: diego.id,
      memberNameSnapshot: `${diego.firstName} ${diego.lastName}`,
      title: 'Hipertrofia · Empuje/Tirón/Pierna',
      goal: 'gain_muscle',
      status: 'active',
      createdBy: 'seed',
      createdAt: startOfDay(addDays(now, -10)),
      updatedAt: startOfDay(addDays(now, -10)),
      notes: 'Progresar carga cuando complete todas las series al máximo de reps.',
      days: [
        {
          label: 'Empuje',
          exercises: [
            { name: 'Press de banca', sets: 4, reps: '8-10', restSeconds: 120, notes: null },
            { name: 'Press inclinado con mancuernas', sets: 4, reps: '10', restSeconds: 90, notes: null },
            { name: 'Fondos', sets: 3, reps: 'AMRAP', restSeconds: 90, notes: null },
            { name: 'Extensión de tríceps en polea', sets: 3, reps: '12', restSeconds: 60, notes: null },
          ],
        },
        {
          label: 'Tirón',
          exercises: [
            { name: 'Dominadas', sets: 4, reps: '8', restSeconds: 120, notes: null },
            { name: 'Remo con barra', sets: 4, reps: '10', restSeconds: 90, notes: null },
            { name: 'Curl de bíceps', sets: 3, reps: '12', restSeconds: 60, notes: null },
          ],
        },
        {
          label: 'Pierna',
          exercises: [
            { name: 'Sentadilla', sets: 4, reps: '8', restSeconds: 150, notes: null },
            { name: 'Peso muerto rumano', sets: 3, reps: '10', restSeconds: 120, notes: null },
            { name: 'Prensa', sets: 3, reps: '12', restSeconds: 90, notes: null },
          ],
        },
      ],
    });
  }

  // Catálogo de productos del punto de venta.
  const products: Product[] = [
    product('Agua mineral 500ml', 'BEB-001', 'Bebidas', 8000, 5000, 48, 12),
    product('Bebida isotónica', 'BEB-002', 'Bebidas', 15000, 9000, 30, 8),
    product('Proteína whey (dosis)', 'SUP-001', 'Suplementos', 35000, 22000, 20, 6),
    product('Barra energética', 'SUP-002', 'Suplementos', 12000, 7000, 5, 10),
    product('Camiseta GYMBAR', 'MER-001', 'Merchandising', 90000, 55000, 15, 5),
    product('Toalla de gimnasio', 'MER-002', 'Merchandising', 45000, 28000, 3, 6),
    product('Guantes de entrenamiento', 'ACC-001', 'Accesorios', 60000, 38000, 10, 4),
  ];

  function product(
    name: string,
    sku: string,
    category: string,
    priceCents: number,
    costCents: number,
    stock: number,
    lowStockThreshold: number,
  ): Product {
    return {
      id: uid(),
      name,
      sku,
      category,
      priceCents,
      costCents,
      currency: CURRENCY,
      stock,
      lowStockThreshold,
      isActive: true,
      createdAt: startOfDay(addDays(now, -40)),
      updatedAt: now,
    };
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
    measurements,
    routines,
    products,
    stockMovements: [],
    sales: [],
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
    routines: [],
    products: [],
    stockMovements: [],
    sales: [],
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
