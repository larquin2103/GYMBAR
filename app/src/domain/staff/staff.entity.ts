import type { Role } from '@gymbar/shared';

/**
 * Usuario interno del gimnasio (personal). Inicia sesión con un PIN dentro de la
 * app; el rol define qué puede ver/hacer. No es una cuenta de Firebase: todos
 * comparten la cuenta de nube del gimnasio (ver docs/13, patrón contamypime).
 */
export interface StaffUser {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export interface StaffInput {
  displayName: string;
  email: string;
  role: Role;
  /** PIN de acceso (4–6 dígitos). Solo al crear o al cambiarlo. */
  pin?: string;
}

export interface StaffPatch {
  displayName?: string;
  email?: string;
  role?: Role;
  active?: boolean;
  pin?: string;
}

export interface StaffRepository {
  list(orgId: string): Promise<StaffUser[]>;
  add(orgId: string, input: StaffInput): Promise<StaffUser>;
  update(orgId: string, id: string, patch: StaffPatch): Promise<void>;
  remove(orgId: string, id: string): Promise<void>;
  /** Verifica el PIN de un usuario; devuelve el usuario si es correcto. */
  verifyPin(orgId: string, id: string, pin: string): Promise<StaffUser | null>;
}
