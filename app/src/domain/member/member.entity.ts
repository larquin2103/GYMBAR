import type { MemberStatus, MemberGoal } from '@gymbar/shared';

/**
 * Entidad de dominio Cliente. Independiente de Firestore (fechas como Date, no
 * Timestamp). El mapeo desde/hacia el documento ocurre en la capa de datos.
 */
export interface Member {
  id: string;
  code: string;
  /** PIN de 4 dígitos para el check-in de autoservicio (kiosko). */
  accessCode: string;
  firstName: string;
  lastName: string;
  /** Nombre normalizado (lowercase, sin acentos) para búsqueda por prefijo. */
  searchName: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  goal: MemberGoal | null;
  /** Usuario interno (entrenador) responsable del cliente. Null = sin asignar. */
  trainerId: string | null;
  notes: string | null;
  // Campos derivados (mantenidos por Cloud Functions en producción).
  status: MemberStatus;
  currentMembershipId: string | null;
  membershipEndDate: Date | null;
  lastCheckInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function memberFullName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

export function memberInitials(member: Pick<Member, 'firstName' | 'lastName'>): string {
  const a = member.firstName.charAt(0);
  const b = member.lastName.charAt(0);
  return `${a}${b}`.toUpperCase();
}
