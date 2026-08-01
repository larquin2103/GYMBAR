import type { AuthGateway, Session } from '@/domain/auth/session';
import { DEMO_ORG_ID } from '@/data/demo/demoStore';

const STORAGE_KEY = 'gymbar-demo-session';

const DEMO_SESSION: Session = {
  uid: 'demo-admin',
  displayName: 'Administrador demo',
  email: 'demo@gymbar.app',
  organizationId: DEMO_ORG_ID,
  organizationName: 'Mi Gimnasio',
  role: 'admin',
};

/**
 * Gateway de autenticación simulado para dev/demo (sin Firebase). Permite
 * demostrar el flujo real de login/guard: arranca desconectado y cualquier
 * credencial válida por forma inicia sesión como admin demo. La sesión se
 * persiste para sobrevivir recargas.
 */
export class MockAuthGateway implements AuthGateway {
  private listeners = new Set<(s: Session | null) => void>();
  private session: Session | null = null;

  constructor() {
    try {
      this.session = sessionStorage.getItem(STORAGE_KEY) ? DEMO_SESSION : null;
    } catch {
      this.session = null;
    }
  }

  observeSession(callback: (session: Session | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.session);
    return () => this.listeners.delete(callback);
  }

  async signIn(email: string, password: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    if (!email || !password) throw new Error('Ingresa correo y contraseña.');
    this.session = { ...DEMO_SESSION, email };
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    this.emit();
  }

  async signOut(): Promise<void> {
    this.session = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l(this.session);
  }
}
