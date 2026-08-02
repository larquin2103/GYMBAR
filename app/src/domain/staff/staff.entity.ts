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

/** Resultado del alta. En modo real incluye el enlace para fijar contraseña. */
export interface AddStaffResult extends StaffUser {
  /** Enlace para que el nuevo usuario establezca su contraseña (o null). */
  inviteLink?: string | null;
}

export interface StaffRepository {
  list(orgId: string): Promise<StaffUser[]>;
  add(orgId: string, input: StaffInput): Promise<AddStaffResult>;
  updateRole(orgId: string, id: string, role: Role): Promise<void>;
  remove(orgId: string, id: string): Promise<void>;
}
