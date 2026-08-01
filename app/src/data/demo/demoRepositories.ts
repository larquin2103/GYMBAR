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
import type { StaffUser, StaffInput, StaffRepository } from '@/domain/staff/staff.entity';
import type { Role } from '@gymbar/shared';
import type { DashboardStats, StatsRepository } from '@/domain/stats/stats';
import {
  isMembershipActive,
  startOfDay,
  addDays,
  daysUntilExpiry,
} from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';
import { getDemoData } from './demoStore';

const byNewest = <T extends { createdAt: Date }>(a: T, b: T) =>
  b.createdAt.getTime() - a.createdAt.getTime();

export class InMemoryPlanRepository implements PlanRepository {
  async list(orgId: string): Promise<Plan[]> {
    // Devuelve todos; la UI de cobro filtra por isActive.
    return getDemoData(orgId)
      .plans.slice()
      .sort((a, b) => a.priceCents - b.priceCents);
  }
  async getById(orgId: string, id: string): Promise<Plan | null> {
    return getDemoData(orgId).plans.find((p) => p.id === id) ?? null;
  }
  async create(orgId: string, input: PlanInput): Promise<Plan> {
    const now = new Date();
    const plan: Plan = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
    getDemoData(orgId).plans.push(plan);
    return plan;
  }
  async update(orgId: string, id: string, input: Partial<PlanInput>): Promise<void> {
    const plans = getDemoData(orgId).plans;
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Plan no encontrado');
    plans[idx] = { ...plans[idx]!, ...input, updatedAt: new Date() };
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  async getCurrentForMember(orgId: string, memberId: string): Promise<Membership | null> {
    const member = getDemoData(orgId).members.find((m) => m.id === memberId);
    if (!member?.currentMembershipId) return null;
    return getDemoData(orgId).memberships.find((m) => m.id === member.currentMembershipId) ?? null;
  }
  async listForMember(orgId: string, memberId: string): Promise<Membership[]> {
    return getDemoData(orgId)
      .memberships.filter((m) => m.memberId === memberId)
      .sort(byNewest);
  }
}

export class InMemoryPaymentRepository implements PaymentRepository {
  async listRecent(orgId: string, max = 50): Promise<Payment[]> {
    return getDemoData(orgId).payments.slice().sort(byNewest).slice(0, max);
  }
  async listForMember(orgId: string, memberId: string, max = 20): Promise<Payment[]> {
    return getDemoData(orgId)
      .payments.filter((p) => p.memberId === memberId)
      .sort(byNewest)
      .slice(0, max);
  }
  async listForSession(orgId: string, sessionId: string): Promise<Payment[]> {
    return getDemoData(orgId)
      .payments.filter((p) => p.cashSessionId === sessionId)
      .sort(byNewest);
  }
}

export class InMemoryCheckInRepository implements CheckInRepository {
  async listRecentForMember(orgId: string, memberId: string, max = 10): Promise<CheckIn[]> {
    return getDemoData(orgId)
      .checkins.filter((c) => c.memberId === memberId)
      .sort(byNewest)
      .slice(0, max);
  }
  async listToday(orgId: string): Promise<CheckIn[]> {
    const key = dateKeyOf(new Date());
    return getDemoData(orgId)
      .checkins.filter((c) => c.dateKey === key)
      .sort(byNewest);
  }
}

export class InMemoryCashboxRepository implements CashboxRepository {
  async getOpenSession(orgId: string): Promise<CashSession | null> {
    return getDemoData(orgId).cashSessions.find((s) => s.status === 'open') ?? null;
  }
  async listMovements(orgId: string, sessionId: string): Promise<CashMovement[]> {
    return getDemoData(orgId)
      .cashMovements.filter((mv) => mv.sessionId === sessionId)
      .sort(byNewest);
  }
  async listRecentSessions(orgId: string, max = 10): Promise<CashSession[]> {
    return getDemoData(orgId)
      .cashSessions.slice()
      .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())
      .slice(0, max);
  }
}

export class InMemoryStatsRepository implements StatsRepository {
  async getDashboard(orgId: string): Promise<DashboardStats> {
    const data = getDemoData(orgId);
    const today = new Date();
    const todayKey = dateKeyOf(today);
    const monthPrefix = todayKey.slice(0, 7);

    const active = data.members.filter((m) => m.status === 'active').length;
    const expired = data.members.filter((m) => m.status === 'expired').length;
    const checkinsToday = data.checkins.filter((c) => c.dateKey === todayKey).length;

    const incomeToday = data.payments
      .filter((p) => dateKeyOf(p.createdAt) === todayKey)
      .reduce((s, p) => s + p.amountCents, 0);
    const incomeMonth = data.payments
      .filter((p) => dateKeyOf(p.createdAt).startsWith(monthPrefix))
      .reduce((s, p) => s + p.amountCents, 0);

    // Renovaciones por vencer: activas que vencen en <= 7 días.
    const pendingRenewals = data.memberships.filter((m) => {
      if (!isMembershipActive(m, today)) return false;
      const d = daysUntilExpiry(m, today);
      return d !== null && d <= 7;
    }).length;

    // Asistencia semanal (lun→dom) de la semana en curso.
    const weekly = new Array(7).fill(0);
    for (let i = 0; i < 7; i++) {
      const key = dateKeyOf(startOfDay(addDays(today, -i)));
      const dow = (startOfDay(addDays(today, -i)).getDay() + 6) % 7; // lun=0
      weekly[dow] = data.checkins.filter((c) => c.dateKey === key).length;
    }

    return {
      activeMembers: active,
      expiredMembers: expired,
      checkinsToday,
      incomeTodayCents: incomeToday,
      incomeMonthCents: incomeMonth,
      pendingRenewals,
      currency: data.plans[0]?.currency ?? 'CUP',
      weeklyAttendance: weekly,
    };
  }
}

export class InMemoryMeasurementRepository implements MeasurementRepository {
  async listForMember(orgId: string, memberId: string): Promise<Measurement[]> {
    return getDemoData(orgId)
      .measurements.filter((m) => m.memberId === memberId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  async add(orgId: string, memberId: string, input: MeasurementInput): Promise<Measurement> {
    const measurement = materializeMeasurement(crypto.randomUUID(), memberId, input, new Date());
    getDemoData(orgId).measurements.push(measurement);
    return measurement;
  }
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  async getSettings(orgId: string): Promise<OrganizationSettings> {
    return getDemoData(orgId).settings;
  }
  async updateSettings(orgId: string, input: OrganizationSettingsInput): Promise<void> {
    const data = getDemoData(orgId);
    data.settings = { ...data.settings, ...input };
  }
}

export class InMemoryStaffRepository implements StaffRepository {
  async list(orgId: string): Promise<StaffUser[]> {
    return getDemoData(orgId).staff.slice();
  }
  async add(orgId: string, input: StaffInput): Promise<StaffUser> {
    const staff = getDemoData(orgId).staff;
    if (staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('Ya existe un usuario con ese correo');
    }
    const user: StaffUser = { id: crypto.randomUUID(), ...input, createdAt: new Date() };
    staff.push(user);
    return user;
  }
  async updateRole(orgId: string, id: string, role: Role): Promise<void> {
    const user = getDemoData(orgId).staff.find((s) => s.id === id);
    if (user) user.role = role;
  }
  async remove(orgId: string, id: string): Promise<void> {
    const data = getDemoData(orgId);
    if (id === 'demo-admin') throw new Error('No puedes eliminar al administrador principal');
    data.staff = data.staff.filter((s) => s.id !== id);
  }
}

// Instancias singleton reutilizables por la factory.
export const demoPlanRepo = new InMemoryPlanRepository();
export const demoMembershipRepo = new InMemoryMembershipRepository();
export const demoPaymentRepo = new InMemoryPaymentRepository();
export const demoCheckInRepo = new InMemoryCheckInRepository();
export const demoCashboxRepo = new InMemoryCashboxRepository();
export const demoStatsRepo = new InMemoryStatsRepository();
export const demoMeasurementRepo = new InMemoryMeasurementRepository();
export const demoOrganizationRepo = new InMemoryOrganizationRepository();
export const demoStaffRepo = new InMemoryStaffRepository();
