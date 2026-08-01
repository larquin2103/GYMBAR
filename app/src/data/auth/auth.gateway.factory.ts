import type { AuthGateway } from '@/domain/auth/session';
import { isFirebaseConfigured, getAuthInstance, getDb } from '@/shared/lib/firebase';
import { FirebaseAuthGateway } from './firebase.auth.gateway';
import { MockAuthGateway } from './mock.auth.gateway';

let instance: AuthGateway | null = null;

/** Devuelve el gateway de autenticación (Firebase si hay credenciales; mock si no). */
export function getAuthGateway(): AuthGateway {
  if (instance) return instance;
  instance = isFirebaseConfigured
    ? new FirebaseAuthGateway(getAuthInstance(), getDb())
    : new MockAuthGateway();
  return instance;
}
