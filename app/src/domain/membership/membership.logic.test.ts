import { describe, expect, it } from 'vitest';
import type { Plan } from '@/domain/plan/plan.entity';
import type { Membership } from './membership.entity';
import {
  computeRenewalPeriod,
  deriveMemberStatus,
  isMembershipActive,
  addDays,
  startOfDay,
} from './membership.logic';

const today = new Date('2026-08-01T10:00:00');

const monthlyPlan: Plan = {
  id: 'p1',
  name: 'Mensual',
  type: 'monthly',
  priceCents: 70000,
  currency: 'MXN',
  durationDays: 30,
  isActive: true,
  allowsFreeze: true,
  createdAt: today,
  updatedAt: today,
};

function membership(status: Membership['status'], endOffsetDays: number): Membership {
  const endDate = addDays(startOfDay(today), endOffsetDays);
  return {
    id: 'm1',
    memberId: 'mem1',
    planId: 'p1',
    planNameSnapshot: 'Mensual',
    priceCentsSnapshot: 70000,
    currency: 'MXN',
    status,
    startDate: addDays(endDate, -30),
    endDate,
    frozenDays: 0,
    createdAt: today,
    updatedAt: today,
  };
}

describe('isMembershipActive', () => {
  it('activa y vigente → true', () => {
    expect(isMembershipActive(membership('active', 10), today)).toBe(true);
  });
  it('activa pero vencida → false', () => {
    expect(isMembershipActive(membership('active', -1), today)).toBe(false);
  });
  it('sin membresía → false', () => {
    expect(isMembershipActive(null, today)).toBe(false);
  });
});

describe('computeRenewalPeriod', () => {
  it('renovación de membresía vigente se extiende desde su vencimiento (no pierde días)', () => {
    const current = membership('active', 10); // vence en 10 días
    const { endDate } = computeRenewalPeriod(current, monthlyPlan, today);
    // nuevo fin = fin actual (+10) + 30 = +40 días desde hoy
    expect(endDate.getTime()).toBe(addDays(startOfDay(today), 40).getTime());
  });

  it('renovación de membresía vencida arranca desde hoy', () => {
    const current = membership('expired', -5);
    const { endDate } = computeRenewalPeriod(current, monthlyPlan, today);
    expect(endDate.getTime()).toBe(addDays(startOfDay(today), 30).getTime());
  });

  it('alta sin membresía previa arranca desde hoy', () => {
    const { endDate } = computeRenewalPeriod(null, monthlyPlan, today);
    expect(endDate.getTime()).toBe(addDays(startOfDay(today), 30).getTime());
  });
});

describe('deriveMemberStatus', () => {
  it('sin membresía → pending', () => {
    expect(deriveMemberStatus(null, today)).toBe('pending');
  });
  it('activa y vigente → active', () => {
    expect(deriveMemberStatus(membership('active', 5), today)).toBe('active');
  });
  it('activa pero pasada de fecha → expired', () => {
    expect(deriveMemberStatus(membership('active', -1), today)).toBe('expired');
  });
  it('congelada → frozen', () => {
    expect(deriveMemberStatus(membership('frozen', 5), today)).toBe('frozen');
  });
  it('cancelada → cancelled', () => {
    expect(deriveMemberStatus(membership('cancelled', 5), today)).toBe('cancelled');
  });
});
