import type { MemberRepository } from '@/domain/member/member.repository';
import { isFirebaseConfigured, getDb, getStorageInstance } from '@/shared/lib/firebase';
import { FirestoreMemberRepository } from './member.firestore.repository';
import { InMemoryMemberRepository } from './member.memory.repository';

let instance: MemberRepository | null = null;

/**
 * Devuelve la implementación del repositorio de clientes. En producción/emulador
 * usa Firestore; sin credenciales (dev/demo) usa el repo en memoria respaldado
 * por el store de demo. La UI depende solo de la interfaz, nunca de esta elección.
 */
export function getMemberRepository(): MemberRepository {
  if (instance) return instance;
  instance = isFirebaseConfigured
    ? new FirestoreMemberRepository(getDb(), getStorageInstance())
    : new InMemoryMemberRepository();
  return instance;
}
