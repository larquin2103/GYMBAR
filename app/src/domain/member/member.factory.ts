import { normalizeSearch, type NewMember } from '@gymbar/shared';
import type { Member } from './member.entity';

/** Genera un código corto legible para el cliente (búsqueda rápida / QR). */
export function generateMemberCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `M-${n}`;
}

/** Genera un PIN de 4 dígitos para el check-in de autoservicio. */
export function generateAccessCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Construye una entidad Member nueva a partir de la entrada validada. Lógica de
 * dominio pura: normaliza búsqueda, fija estado inicial y timestamps. No toca
 * Firestore. Un cliente sin membresía arranca en estado 'pending'.
 */
export function buildNewMember(params: {
  id: string;
  code: string;
  accessCode: string;
  input: NewMember;
  photoUrl?: string | null;
  now?: Date;
}): Member {
  const { id, code, accessCode, input, photoUrl = null } = params;
  const now = params.now ?? new Date();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  return {
    id,
    code,
    accessCode,
    firstName,
    lastName,
    searchName: normalizeSearch(`${firstName} ${lastName}`),
    phone: input.phone ? input.phone.trim() : null,
    email: input.email ? input.email.trim() : null,
    photoUrl,
    goal: input.goal ?? null,
    trainerId: input.trainerId?.trim() || null,
    notes: input.notes?.trim() || null,
    status: 'pending',
    currentMembershipId: null,
    membershipEndDate: null,
    lastCheckInAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
