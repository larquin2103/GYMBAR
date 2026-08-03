import type { MemberQuery } from '@/domain/member/member.repository';

/** Claves de caché de TanStack Query para clientes, namespaced por organización. */
export const memberKeys = {
  all: (orgId: string) => ['members', orgId] as const,
  list: (orgId: string, query: MemberQuery) => ['members', orgId, 'list', query] as const,
  byTrainer: (orgId: string, trainerId: string | null) =>
    ['members', orgId, 'by-trainer', trainerId ?? 'all'] as const,
  detail: (orgId: string, id: string) => ['members', orgId, 'detail', id] as const,
};
