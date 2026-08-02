import type { Role } from '@gymbar/shared';

/**
 * Cuenta de nube del gimnasio (una por negocio). El uid de esta cuenta ES el
 * organizationId: todos los datos cuelgan de /organizations/{uid}. Se usa para
 * sincronizar entre dispositivos y para las Reglas de Seguridad (uid == orgId).
 * Ver docs/13 y el patrón de contamypime.
 */
export interface GymAccount {
  orgId: string;
  orgName: string;
  email: string | null;
}

/** Usuario interno del gimnasio (personal), seleccionado con PIN tras conectar. */
export interface CurrentUser {
  id: string;
  displayName: string;
  role: Role;
}

/** Sesión efectiva: cuenta del gimnasio + usuario interno activo. */
export interface Session {
  /** Id del usuario interno activo (personal). */
  uid: string;
  displayName: string;
  /** Correo de la cuenta del gimnasio. */
  email: string | null;
  organizationId: string;
  organizationName: string;
  role: Role;
}

/**
 * Gateway de la cuenta del gimnasio (capa de nube). Aísla Firebase Auth. No
 * maneja roles: el rol lo aporta el usuario interno (PIN), no un custom claim.
 */
export interface AuthGateway {
  /** Observa la conexión del gimnasio; emite null si no hay cuenta activa. */
  observeGym(callback: (gym: GymAccount | null) => void): () => void;
  /** Inicia sesión con la cuenta del gimnasio existente. */
  signIn(email: string, password: string): Promise<void>;
  /** Crea la cuenta del gimnasio (uid = orgId) y su organización; la devuelve. */
  createGym(email: string, password: string, gymName: string): Promise<GymAccount>;
  signOut(): Promise<void>;
}
