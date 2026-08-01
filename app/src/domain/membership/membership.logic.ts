import type { MemberStatus } from '@gymbar/shared';
import type { Plan } from '@/domain/plan/plan.entity';
import type { Membership } from './membership.entity';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normaliza una fecha a medianoche (compara por día, no por hora). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** ¿La membresía está vigente en la fecha dada? (activa y sin vencer). */
export function isMembershipActive(m: Membership | null, today: Date = new Date()): boolean {
  if (!m) return false;
  if (m.status !== 'active') return false;
  return startOfDay(m.endDate).getTime() >= startOfDay(today).getTime();
}

/**
 * Calcula el período de una renovación/alta. Regla de negocio de gimnasio:
 * si la membresía aún está vigente, se extiende desde su vencimiento; si venció
 * o no existe, arranca hoy. Así el cliente que renueva antes no pierde días.
 */
export function computeRenewalPeriod(
  current: Membership | null,
  plan: Plan,
  today: Date = new Date(),
): { startDate: Date; endDate: Date } {
  // La compra ocurre hoy; el período se extiende desde el vencimiento vigente
  // (si sigue activa) o desde hoy (si venció o no existe).
  const base = isMembershipActive(current, today)
    ? startOfDay(current!.endDate)
    : startOfDay(today);
  return { startDate: startOfDay(today), endDate: addDays(base, plan.durationDays) };
}

/**
 * Deriva el estado agregado del cliente a partir de su membresía vigente.
 * Fuente de verdad para el campo cacheado member.status (ver docs/04).
 */
export function deriveMemberStatus(
  current: Membership | null,
  today: Date = new Date(),
): MemberStatus {
  if (!current) return 'pending';
  switch (current.status) {
    case 'frozen':
      return 'frozen';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    case 'active':
    case 'expired':
      return startOfDay(current.endDate).getTime() >= startOfDay(today).getTime()
        ? 'active'
        : 'expired';
    default:
      return 'pending';
  }
}

/** Días restantes hasta el vencimiento (negativo si ya venció). */
export function daysUntilExpiry(m: Membership | null, today: Date = new Date()): number | null {
  if (!m) return null;
  return Math.round((startOfDay(m.endDate).getTime() - startOfDay(today).getTime()) / MS_PER_DAY);
}
