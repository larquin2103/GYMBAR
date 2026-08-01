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

/** Datos editables de un plan (sin id/fechas). */
export interface PlanInput {
  name: string;
  type: PlanType;
  priceCents: number;
  currency: string;
  durationDays: number;
  allowsFreeze: boolean;
  isActive: boolean;
}

export interface PlanRepository {
  list(orgId: string): Promise<Plan[]>;
  getById(orgId: string, id: string): Promise<Plan | null>;
  create(orgId: string, input: PlanInput): Promise<Plan>;
  update(orgId: string, id: string, input: Partial<PlanInput>): Promise<void>;
}
