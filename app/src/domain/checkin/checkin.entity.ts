import type { CheckInResult, CheckInSource } from '@gymbar/shared';

/** Registro de acceso de un cliente en un instante (alto volumen, docs/04). */
export interface CheckIn {
  id: string;
  memberId: string;
  memberNameSnapshot: string;
  result: CheckInResult;
  source: CheckInSource;
  createdAt: Date;
  dateKey: string; // 'YYYY-MM-DD'
}

export interface CheckInRepository {
  listRecentForMember(orgId: string, memberId: string, max?: number): Promise<CheckIn[]>;
  listToday(orgId: string): Promise<CheckIn[]>;
}
