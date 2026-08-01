import type { MembershipStatus } from '@gymbar/shared';

/** Instancia de un plan asignada a un cliente, con vigencia (ver docs/03). */
export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  planNameSnapshot: string;
  priceCentsSnapshot: number;
  currency: string;
  status: MembershipStatus;
  startDate: Date;
  endDate: Date;
  frozenDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipRepository {
  getCurrentForMember(orgId: string, memberId: string): Promise<Membership | null>;
  listForMember(orgId: string, memberId: string): Promise<Membership[]>;
}
