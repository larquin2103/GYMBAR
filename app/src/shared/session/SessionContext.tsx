import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthGateway, GymAccount, CurrentUser, Session } from '@/domain/auth/session';
import { getAuthGateway } from '@/data/auth/auth.gateway.factory';
import { getOperationalData } from '@/data/operational.factory';

interface AuthContextValue {
  /** Cuenta de nube del gimnasio conectada (o null si no hay). */
  gym: GymAccount | null;
  /** Usuario interno activo (elegido con PIN), o null. */
  currentUser: CurrentUser | null;
  /** Sesión efectiva: gimnasio + usuario. Null hasta completar ambos. */
  session: Session | null;
  loading: boolean;
  /** Conecta la cuenta del gimnasio existente (email + contraseña). */
  signIn: (email: string, password: string) => Promise<void>;
  /** Onboarding: crea el gimnasio y su administrador (con PIN) y lo deja activo. */
  createGym: (
    gymName: string,
    email: string,
    password: string,
    ownerName: string,
    ownerPin: string,
  ) => Promise<void>;
  /** Elige un usuario interno verificando su PIN. */
  loginUser: (staffId: string, pin: string) => Promise<boolean>;
  /** Cierra el usuario interno (sigue conectada la cuenta del gimnasio). */
  logoutUser: () => void;
  /** Desconecta la cuenta del gimnasio (y el usuario). */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'gymbar-current-user';

function readStoredUser(): CurrentUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}
function storeUser(u: CurrentUser | null) {
  try {
    if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Proveedor de autenticación de dos capas (patrón contamypime, ver docs/13):
 *  1) cuenta de nube del gimnasio (uid == orgId) para sincronizar y para las
 *     Reglas de Seguridad;
 *  2) usuario interno del personal, elegido con PIN, que aporta el rol.
 * La UI decide permisos por el rol del usuario interno (frontera real: la cuenta).
 */
export function SessionProvider({
  children,
  gateway = getAuthGateway(),
}: {
  children: ReactNode;
  gateway?: AuthGateway;
}) {
  const [gym, setGym] = useState<GymAccount | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = gateway.observeGym((next) => {
      setGym(next);
      setLoading(false);
      if (!next) {
        setCurrentUser(null);
        storeUser(null);
      }
    });
    return unsubscribe;
  }, [gateway]);

  // Al (re)conectar el gimnasio, revalida el usuario interno guardado contra el
  // directorio real: si ya no existe o está inactivo, se descarta.
  useEffect(() => {
    if (!gym) return;
    let alive = true;
    (async () => {
      const stored = readStoredUser();
      if (!stored?.id) return;
      try {
        const staff = await getOperationalData().staff.list(gym.orgId);
        const fresh = staff.find((s) => s.id === stored.id && s.active);
        if (!alive) return;
        if (fresh) {
          const safe = { id: fresh.id, displayName: fresh.displayName, role: fresh.role };
          setCurrentUser(safe);
          storeUser(safe);
        } else {
          setCurrentUser(null);
          storeUser(null);
        }
      } catch {
        // sin conexión: conserva lo guardado (revalida al reconectar)
      }
    })();
    return () => {
      alive = false;
    };
  }, [gym]);

  const setUser = useCallback((u: CurrentUser | null) => {
    setCurrentUser(u);
    storeUser(u);
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => gateway.signIn(email, password),
    [gateway],
  );

  const createGym = useCallback(
    async (gymName: string, email: string, password: string, ownerName: string, ownerPin: string) => {
      const created = await gateway.createGym(email, password, gymName);
      const owner = await getOperationalData().staff.add(created.orgId, {
        displayName: ownerName.trim() || 'Administrador',
        email,
        role: 'admin',
        pin: ownerPin,
      });
      setUser({ id: owner.id, displayName: owner.displayName, role: owner.role });
    },
    [gateway, setUser],
  );

  const loginUser = useCallback(
    async (staffId: string, pin: string): Promise<boolean> => {
      if (!gym) return false;
      const u = await getOperationalData().staff.verifyPin(gym.orgId, staffId, pin);
      if (!u) return false;
      setUser({ id: u.id, displayName: u.displayName, role: u.role });
      return true;
    },
    [gym, setUser],
  );

  const logoutUser = useCallback(() => setUser(null), [setUser]);

  const signOut = useCallback(async () => {
    setUser(null);
    await gateway.signOut();
  }, [gateway, setUser]);

  const session = useMemo<Session | null>(() => {
    if (!gym || !currentUser) return null;
    return {
      uid: currentUser.id,
      displayName: currentUser.displayName,
      email: gym.email,
      organizationId: gym.orgId,
      organizationName: gym.orgName,
      role: currentUser.role,
    };
  }, [gym, currentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      gym,
      currentUser,
      session,
      loading,
      signIn,
      createGym,
      loginUser,
      logoutUser,
      signOut,
    }),
    [gym, currentUser, session, loading, signIn, createGym, loginUser, logoutUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Acceso a la sesión y acciones de auth. */
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
