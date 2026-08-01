import { normalizeSearch, type MemberStatus } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';

const DEMO_ORG_ID = 'demo-org';

function make(
  firstName: string,
  lastName: string,
  status: MemberStatus,
  phone: string,
  daysToEnd: number | null,
): Member {
  const now = new Date();
  const end = daysToEnd === null ? null : new Date(now.getTime() + daysToEnd * 24 * 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    code: `M-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName,
    lastName,
    searchName: normalizeSearch(`${firstName} ${lastName}`),
    phone,
    email: null,
    photoUrl: null,
    notes: null,
    status,
    currentMembershipId: status === 'active' ? 'demo-membership' : null,
    membershipEndDate: end,
    lastCheckInAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Datos de ejemplo para el modo dev/demo (repositorio en memoria). */
export const memberSeed: Record<string, Member[]> = {
  [DEMO_ORG_ID]: [
    make('Ana', 'García', 'active', '+52 55 1234 5678', 12),
    make('Carlos', 'Martínez', 'active', '+52 55 2345 6789', 3),
    make('Lucía', 'Fernández', 'expired', '+52 55 3456 7890', -5),
    make('Miguel', 'Rodríguez', 'pending', '+52 55 4567 8901', null),
    make('Sofía', 'López', 'frozen', '+52 55 5678 9012', 20),
    make('Diego', 'Hernández', 'active', '+52 55 6789 0123', 45),
    make('Valentina', 'Torres', 'expired', '+52 55 7890 1234', -18),
    make('Mateo', 'Ramírez', 'active', '+52 55 8901 2345', 8),
  ],
};

export { DEMO_ORG_ID };
