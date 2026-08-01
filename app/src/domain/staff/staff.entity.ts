import type { Role } from '@gymbar/shared';

/** Usuario del sistema (personal del gimnasio). */
export interface StaffUser {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface StaffInput {
  displayName: string;
  email: string;
  role: Role;
}

export interface StaffRepository {
  list(orgId: string): Promise<StaffUser[]>;
  add(orgId: string, input: StaffInput): Promise<StaffUser>;
  updateRole(orgId: string, id: string, role: Role): Promise<void>;
  remove(orgId: string, id: string): Promise<void>;
}
