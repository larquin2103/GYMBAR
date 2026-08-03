import type { MemberStatus, NewMember, MemberPatch } from '@gymbar/shared';
import type { Member } from './member.entity';

/** Página de resultados con cursor opaco para paginación eficiente. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface MemberQuery {
  /** Texto de búsqueda (nombre, normalizado). */
  search?: string;
  status?: MemberStatus;
  limit?: number;
  cursor?: string | null;
}

/**
 * Contrato del repositorio de clientes (Repository Pattern, ver docs/08).
 * Ningún componente ni hook de UI conoce Firestore; solo esta interfaz.
 */
export interface MemberRepository {
  getById(orgId: string, id: string): Promise<Member | null>;
  /** Busca por PIN de acceso (check-in de autoservicio). */
  getByAccessCode(orgId: string, accessCode: string): Promise<Member | null>;
  search(orgId: string, query: MemberQuery): Promise<Page<Member>>;
  /**
   * Clientes asignados a un entrenador (para el módulo de Medidas). Si trainerId
   * es null, devuelve todos (vista de admin/recepción). Orden por nombre.
   */
  listForTrainer(orgId: string, trainerId: string | null): Promise<Member[]>;
  create(orgId: string, input: NewMember, photo?: Blob | null): Promise<Member>;
  update(orgId: string, id: string, patch: MemberPatch): Promise<void>;
}
