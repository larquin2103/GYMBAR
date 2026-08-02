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
import type { Payment as PaymentType } from '@/domain/payment/payment.entity';
import type { CheckIn as CheckInType } from '@/domain/checkin/checkin.entity';
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
  async listRange(orgId: string, fromKey: string, toKey: string): Promise<CheckIn[]> {
    return getDemoData(orgId)
      .checkins.filter((c) => c.dateKey >= fromKey && c.dateKey <= toKey)
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
  async add(orgId: string, input: StaffInput): Promise<AddStaffResult> {
    const staff = getDemoData(orgId).staff;
    if (staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('Ya existe un usuario con ese correo');
    }
    const user: StaffUser = { id: crypto.randomUUID(), ...input, createdAt: new Date() };
    staff.push(user);
    // En demo no hay Auth real: no se genera enlace de invitación.
    return { ...user, inviteLink: null };
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

export class InMemoryReportsRepository implements ReportsRepository {
  async income(orgId: string, fromKey: string, toKey: string): Promise<PaymentType[]> {
    return getDemoData(orgId)
      .payments.filter((p) => {
        const key = dateKeyOf(p.createdAt);
        return key >= fromKey && key <= toKey;
      })
      .sort(byNewest);
  }
  async attendance(orgId: string, fromKey: string, toKey: string): Promise<CheckInType[]> {
    return getDemoData(orgId)
      .checkins.filter((c) => c.dateKey >= fromKey && c.dateKey <= toKey)
      .sort(byNewest);
  }
  async expiring(orgId: string, withinDays: number): Promise<ExpiringRow[]> {
    const data = getDemoData(orgId);
    const today = startOfDay(new Date());
    return data.members
      .filter((m) => m.membershipEndDate != null)
      .map((m) => {
        const end = startOfDay(m.membershipEndDate!);
        const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);
        const membership = data.memberships.find((x) => x.id === m.currentMembershipId);
        return {
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`,
          phone: m.phone,
          planName: membership?.planNameSnapshot ?? null,
          endDate: m.membershipEndDate!,
          daysLeft,
        };
      })
      .filter((r) => r.daysLeft <= withinDays)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }
  async roster(orgId: string): Promise<RosterRow[]> {
    return getDemoData(orgId)
      .members.slice()
      .sort((a, b) => a.searchName.localeCompare(b.searchName))
      .map((m) => ({
        memberId: m.id,
        code: m.code,
        name: `${m.firstName} ${m.lastName}`,
        phone: m.phone,
        status: m.status,
        goal: m.goal,
        endDate: m.membershipEndDate,
        createdAt: m.createdAt,
      }));
  }
}

export class InMemoryRoutineRepository implements RoutineRepository {
  async listRecent(orgId: string, max = 50): Promise<Routine[]> {
    return getDemoData(orgId)
      .routines.slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, max);
  }
  async listForMember(orgId: string, memberId: string): Promise<Routine[]> {
    return getDemoData(orgId)
      .routines.filter((r) => r.memberId === memberId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async getById(orgId: string, id: string): Promise<Routine | null> {
    return getDemoData(orgId).routines.find((r) => r.id === id) ?? null;
  }
  async create(orgId: string, input: RoutineInput, createdBy: string): Promise<Routine> {
    const now = new Date();
    const routine: Routine = {
      id: crypto.randomUUID(),
      ...input,
      status: 'active',
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    getDemoData(orgId).routines.push(routine);
    return routine;
  }
  async update(orgId: string, id: string, input: RoutineInput): Promise<void> {
    const routines = getDemoData(orgId).routines;
    const idx = routines.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Rutina no encontrada');
    routines[idx] = { ...routines[idx]!, ...input, updatedAt: new Date() };
  }
  async setStatus(orgId: string, id: string, status: RoutineStatus): Promise<void> {
    const routine = getDemoData(orgId).routines.find((r) => r.id === id);
    if (routine) {
      routine.status = status;
      routine.updatedAt = new Date();
    }
  }
}

export class InMemoryProductRepository implements ProductRepository {
  async list(orgId: string): Promise<Product[]> {
    return getDemoData(orgId)
      .products.slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async getById(orgId: string, id: string): Promise<Product | null> {
    return getDemoData(orgId).products.find((p) => p.id === id) ?? null;
  }
  async create(orgId: string, input: ProductInput): Promise<Product> {
    const now = new Date();
    const product: Product = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
    getDemoData(orgId).products.push(product);
    return product;
  }
  async update(orgId: string, id: string, input: Partial<ProductInput>): Promise<void> {
    const products = getDemoData(orgId).products;
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');
    products[idx] = { ...products[idx]!, ...input, updatedAt: new Date() };
  }
}

export class InMemoryInventoryRepository implements InventoryRepository {
  async listMovements(orgId: string, max = 100): Promise<StockMovement[]> {
    return getDemoData(orgId).stockMovements.slice().sort(byNewest).slice(0, max);
  }
  async adjustStock(orgId: string, input: AdjustStockInput): Promise<void> {
    const data = getDemoData(orgId);
    const product = data.products.find((p) => p.id === input.productId);
    if (!product) throw new Error('Producto no encontrado');
    const nextStock = product.stock + input.delta;
    if (nextStock < 0) throw new Error('El ajuste dejaría el stock en negativo');
    product.stock = nextStock;
    product.updatedAt = new Date();
    data.stockMovements.push({
      id: crypto.randomUUID(),
      productId: product.id,
      productNameSnapshot: product.name,
      type: input.type,
      quantityDelta: input.delta,
      stockAfter: nextStock,
      reason: input.reason,
      saleId: null,
      staffUid: input.staffUid,
      createdAt: new Date(),
    });
  }
  async listRecentSales(orgId: string, max = 50): Promise<Sale[]> {
    return getDemoData(orgId).sales.slice().sort(byNewest).slice(0, max);
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
export const demoReportsRepo = new InMemoryReportsRepository();
export const demoRoutineRepo = new InMemoryRoutineRepository();
export const demoProductRepo = new InMemoryProductRepository();
export const demoInventoryRepo = new InMemoryInventoryRepository();
