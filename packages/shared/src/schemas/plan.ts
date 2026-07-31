import { z } from 'zod';
import { PlanType } from '../enums.js';

export const NewPlanSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(80),
  type: PlanType,
  priceCents: z.number().int().nonnegative('El precio no puede ser negativo'),
  currency: z.string().length(3, 'Código de moneda ISO-4217 (3 letras)'),
  durationDays: z.number().int().positive('La duración debe ser mayor a 0'),
  isActive: z.boolean().default(true),
  allowsFreeze: z.boolean().default(false),
});
export type NewPlan = z.infer<typeof NewPlanSchema>;

export const PlanPatchSchema = NewPlanSchema.partial();
export type PlanPatch = z.infer<typeof PlanPatchSchema>;
