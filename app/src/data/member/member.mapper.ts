import { Timestamp, type DocumentData } from 'firebase/firestore';
import type { MemberStatus, MemberGoal } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/** Convierte un documento Firestore en la entidad de dominio Member. */
export function memberFromDoc(id: string, data: DocumentData): Member {
  return {
    id,
    code: data.code ?? '',
    accessCode: data.accessCode ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    searchName: data.searchName ?? '',
    phone: data.phone ?? null,
    email: data.email ?? null,
    photoUrl: data.photoUrl ?? null,
    goal: (data.goal ?? null) as MemberGoal | null,
    trainerId: data.trainerId ?? null,
    notes: data.notes ?? null,
    status: (data.status ?? 'pending') as MemberStatus,
    currentMembershipId: data.currentMembershipId ?? null,
    membershipEndDate: toDate(data.membershipEndDate),
    lastCheckInAt: toDate(data.lastCheckInAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

/** Serializa una entidad Member a documento Firestore (para create). */
export function memberToDoc(member: Member): DocumentData {
  return {
    code: member.code,
    accessCode: member.accessCode,
    firstName: member.firstName,
    lastName: member.lastName,
    searchName: member.searchName,
    phone: member.phone,
    email: member.email,
    photoUrl: member.photoUrl,
    goal: member.goal,
    trainerId: member.trainerId,
    notes: member.notes,
    status: member.status,
    currentMembershipId: member.currentMembershipId,
    membershipEndDate: member.membershipEndDate
      ? Timestamp.fromDate(member.membershipEndDate)
      : null,
    lastCheckInAt: member.lastCheckInAt ? Timestamp.fromDate(member.lastCheckInAt) : null,
    createdAt: Timestamp.fromDate(member.createdAt),
    updatedAt: Timestamp.fromDate(member.updatedAt),
  };
}
