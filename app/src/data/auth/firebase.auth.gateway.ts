import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { AuthGateway, GymAccount } from '@/domain/auth/session';

/**
 * Gateway de la cuenta de nube del gimnasio. Modelo: una cuenta de Firebase por
 * gimnasio; el uid ES el organizationId (ver docs/13, patrón contamypime). No hay
 * custom claims: el rol lo aporta el usuario interno (PIN). Las Reglas solo
 * comprueban uid == orgId.
 */
export class FirebaseAuthGateway implements AuthGateway {
  constructor(
    private readonly auth: Auth,
    private readonly db: Firestore,
  ) {}

  observeGym(callback: (gym: GymAccount | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      const orgId = user.uid;
      let orgName = 'Mi Gimnasio';
      try {
        const snap = await getDoc(doc(this.db, 'organizations', orgId));
        orgName = (snap.data()?.name as string) ?? orgName;
      } catch {
        // sin conexión: usa el nombre por defecto (settings lo corrige luego)
      }
      callback({ orgId, orgName, email: user.email });
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async createGym(email: string, password: string, gymName: string): Promise<GymAccount> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const orgId = cred.user.uid;
    await setDoc(doc(this.db, 'organizations', orgId), {
      name: gymName.trim() || 'Mi Gimnasio',
      currency: 'CUP',
      ownerUid: orgId,
      kioskBlockExpired: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { orgId, orgName: gymName.trim() || 'Mi Gimnasio', email: cred.user.email };
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }
}
