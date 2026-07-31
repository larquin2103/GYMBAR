import { z } from 'zod';

/**
 * Entrada para crear/asignar una membresía a un cliente. Las fechas y el estado
 * definitivos los fija el servidor (Cloud Function) a partir del plan; el cliente
 * solo propone member + plan.
 */
export const NewMembershipSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  /** Fecha de inicio ISO (YYYY-MM-DD). Por defecto hoy en el servidor. */
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
    .optional(),
});
export type NewMembership = z.infer<typeof NewMembershipSchema>;

/** Solicitud de congelamiento por N días (extiende endDate al descongelar). */
export const FreezeMembershipSchema = z.object({
  membershipId: z.string().min(1),
  days: z.number().int().positive().max(365),
});
export type FreezeMembership = z.infer<typeof FreezeMembershipSchema>;
