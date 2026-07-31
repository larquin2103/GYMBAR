import { createContext, useContext, type ReactNode } from 'react';
import type { Role } from '@gymbar/shared';

export interface Session {
  uid: string;
  displayName: string;
  organizationName: string;
  role: Role;
}

const SessionContext = createContext<Session | null>(null);

/**
 * Placeholder de sesión para la Fase 0. En la Fase 1 se reemplaza por el estado
 * real de Firebase Auth + custom claims (organizationId + role), sin cambiar la
 * API que consumen los componentes.
 */
const PLACEHOLDER_SESSION: Session = {
  uid: 'demo-uid',
  displayName: 'Equipo demo',
  organizationName: 'Mi Gimnasio',
  role: 'admin',
};

export function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionContext.Provider value={PLACEHOLDER_SESSION}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
