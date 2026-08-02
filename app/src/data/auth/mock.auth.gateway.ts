import type { AuthGateway, GymAccount } from '@/domain/auth/session';
import { DEMO_ORG_ID } from '@/data/demo/demoStore';

const STORAGE_KEY = 'gymbar-demo-gym';

const DEMO_GYM: GymAccount = {
  orgId: DEMO_ORG_ID,
  orgName: 'Mi Gimnasio',
  email: 'demo@gymbar.app',
};

/**
 * Gateway simulado (dev/demo, sin Firebase). Reproduce el flujo real: el gimnasio
 * arranca desconectado; cualquier credencial conecta la cuenta demo. Luego se
 * elige un usuario interno con PIN (ver seedStaff). La conexión se persiste.
 */
export class MockAuthGateway implements AuthGateway {
  private listeners = new Set<(g: GymAccount | null) => void>();
  private gym: GymAccount | null = null;

  constructor() {
    try {
      this.gym = sessionStorage.getItem(STORAGE_KEY) ? DEMO_GYM : null;
    } catch {
      this.gym = null;
    }
  }

  observeGym(callback: (gym: GymAccount | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.gym);
    return () => this.listeners.delete(callback);
  }

  async signIn(email: string, password: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    if (!email || !password) throw new Error('Ingresa correo y contraseña.');
    this.connect({ ...DEMO_GYM, email });
  }

  async createGym(email: string, _password: string, gymName: string): Promise<GymAccount> {
    void _password;
    await new Promise((r) => setTimeout(r, 200));
    const gym = { orgId: DEMO_ORG_ID, orgName: gymName.trim() || 'Mi Gimnasio', email };
    this.connect(gym);
    return gym;
  }

  async signOut(): Promise<void> {
    this.gym = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this.emit();
  }

  private connect(gym: GymAccount) {
    this.gym = gym;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l(this.gym);
  }
}
