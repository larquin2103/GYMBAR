import type { PlanType } from '@gymbar/shared';

/** Definición comercial de una membresía (ver docs/03). */
export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  priceCents: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  allowsFreeze: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanRepository {
  list(orgId: string): Promise<Plan[]>;
  getById(orgId: string, id: string): Promise<Plan | null>;
}
