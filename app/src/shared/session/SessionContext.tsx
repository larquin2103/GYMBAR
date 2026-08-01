import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthGateway, Session } from '@/domain/auth/session';
import { getAuthGateway } from '@/data/auth/auth.gateway.factory';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Proveedor de autenticación. Se suscribe al gateway (Firebase o mock) y expone
 * la sesión y las acciones de login/logout. El gateway resuelve organizationId y
 * rol desde los custom claims; la UI nunca decide permisos por su cuenta.
 */
export function SessionProvider({
  children,
  gateway = getAuthGateway(),
}: {
  children: ReactNode;
  gateway?: AuthGateway;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = gateway.observeSession((next) => {
      setSession(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [gateway]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: (email, password) => gateway.signIn(email, password),
      signOut: () => gateway.signOut(),
    }),
    [session, loading, gateway],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Acceso a la sesión y acciones de auth (puede ser null si no hay sesión). */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <SessionProvider>');
  return ctx;
}

/** Sesión garantizada (para usar dentro de rutas protegidas). */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useSession requiere una sesión activa');
  return session;
}
