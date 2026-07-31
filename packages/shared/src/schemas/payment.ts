import { z } from 'zod';
import { PaymentMethod } from '../enums.js';

/**
 * Entrada para registrar un pago. Incluye clientRequestId para idempotencia:
 * un reintento por red inestable no debe generar un cobro duplicado (ver doc 09).
 * El pago es inmutable una vez creado; las correcciones son anulaciones (Cloud Function).
 */
export const NewPaymentSchema = z.object({
  memberId: z.string().min(1),
  membershipId: z.string().min(1).nullable().optional(),
  amountCents: z.number().int().positive('El monto debe ser mayor a 0'),
  currency: z.string().length(3),
  method: PaymentMethod,
  notes: z.string().max(500).optional(),
  /** Token idempotente generado por el cliente (UUID). */
  clientRequestId: z.string().uuid(),
});
export type NewPayment = z.infer<typeof NewPaymentSchema>;
