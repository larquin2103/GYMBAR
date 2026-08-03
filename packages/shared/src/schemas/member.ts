import { z } from 'zod';
import { MemberStatus, MemberGoal } from '../enums.js';

/** Normaliza texto para búsqueda: minúsculas, sin acentos, sin espacios extra. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Entrada para crear un cliente. Solo nombre y teléfono son obligatorios. */
export const NewMemberSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido').max(80),
  lastName: z.string().min(1, 'Apellido requerido').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{6,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  goal: MemberGoal.optional(),
  /** PIN de 4 dígitos elegido por el cliente. Vacío = se genera automáticamente. */
  accessCode: z
    .string()
    .regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos')
    .optional()
    .or(z.literal('')),
  /** Id del usuario interno (entrenador) al que se asigna el cliente. '' = sin asignar. */
  trainerId: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});
export type NewMember = z.infer<typeof NewMemberSchema>;

/** Parche parcial para actualizar un cliente. */
export const MemberPatchSchema = NewMemberSchema.partial();
export type MemberPatch = z.infer<typeof MemberPatchSchema>;

/** Estado agregado del cliente (derivado; mantenido por Cloud Functions). */
export const MemberStatusSchema = MemberStatus;
