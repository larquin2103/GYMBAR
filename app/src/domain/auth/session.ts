import type { Role } from '@gymbar/shared';

/** Sesión autenticada resuelta desde Firebase Auth + custom claims. */
export interface Session {
  uid: string;
  displayName: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  role: Role;
}

/** Contrato de autenticación (gateway). Aísla Firebase Auth del resto de la app. */
export interface AuthGateway {
  /** Observa la sesión; emite null cuando no hay usuario. Devuelve unsubscribe. */
  observeSession(callback: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
