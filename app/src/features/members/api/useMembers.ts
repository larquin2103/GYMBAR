import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { MemberStatus } from '@gymbar/shared';
import { getMemberRepository } from '@/data/member/member.repository.factory';
import { useSession } from '@/shared/session/SessionContext';
import { memberKeys } from './queryKeys';

const PAGE_SIZE = 20;

/** Lista paginada por cursor de clientes, con búsqueda y filtro por estado. */
export function useMembers(params: { search?: string; status?: MemberStatus }) {
  const { organizationId } = useSession();
  const repo = getMemberRepository();
  const query = { search: params.search, status: params.status, limit: PAGE_SIZE };

  return useInfiniteQuery({
    queryKey: memberKeys.list(organizationId, query),
    queryFn: ({ pageParam }) =>
      repo.search(organizationId, { ...query, cursor: pageParam as string | null }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

/**
 * Clientes asignados a un entrenador (módulo de Medidas). trainerId null =
 * todos (vista de admin/recepción).
 */
export function useMembersForTrainer(trainerId: string | null) {
  const { organizationId } = useSession();
  const repo = getMemberRepository();
  return useQuery({
    queryKey: memberKeys.byTrainer(organizationId, trainerId),
    queryFn: () => repo.listForTrainer(organizationId, trainerId),
  });
}

/** Un cliente por id. */
export function useMember(id: string | undefined) {
  const { organizationId } = useSession();
  const repo = getMemberRepository();
  return useQuery({
    queryKey: memberKeys.detail(organizationId, id ?? ''),
    queryFn: () => repo.getById(organizationId, id!),
    enabled: !!id,
  });
}
