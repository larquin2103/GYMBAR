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
  search(orgId: string, query: MemberQuery): Promise<Page<Member>>;
  create(orgId: string, input: NewMember, photo?: Blob | null): Promise<Member>;
  update(orgId: string, id: string, patch: MemberPatch): Promise<void>;
}
