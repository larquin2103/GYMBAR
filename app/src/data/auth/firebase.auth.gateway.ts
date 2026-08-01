import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { Role } from '@gymbar/shared';
import type { AuthGateway, Session } from '@/domain/auth/session';

/**
 * Gateway de autenticación real sobre Firebase Auth. La organización y el rol se
 * leen de los custom claims del token (asignados solo por Cloud Functions, ver
 * docs/05). El nombre de la organización se resuelve desde su documento.
 */
export class FirebaseAuthGateway implements AuthGateway {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore,
  ) {}

  observeSession(callback: (session: Session | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      const token = await user.getIdTokenResult();
      const orgId = token.claims.orgId as string | undefined;
      const roleClaim = Role.safeParse(token.claims.role);
      if (!orgId || !roleClaim.success) {
        // Usuario autenticado sin claims válidos: sesión incompleta.
        callback(null);
        return;
      }
      let organizationName = 'Mi Gimnasio';
      try {
        const orgSnap = await getDoc(doc(this.db, 'organizations', orgId));
        organizationName = (orgSnap.data()?.name as string) ?? organizationName;
      } catch {
        // sin conexión: usa el nombre por defecto
      }
      callback({
        uid: user.uid,
        displayName: user.displayName ?? user.email ?? 'Usuario',
        email: user.email,
        organizationId: orgId,
        organizationName,
        role: roleClaim.data,
      });
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }
}
