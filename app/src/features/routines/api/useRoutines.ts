import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoutineInput, RoutineStatus } from '@/domain/routine/routine.entity';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useRecentRoutines() {
  const { organizationId } = useSession();
  const { routines } = getOperationalData();
  return useQuery({
    queryKey: ['routines', organizationId],
    queryFn: () => routines.listRecent(organizationId),
  });
}

export function useMemberRoutines(memberId: string | undefined) {
  const { organizationId } = useSession();
  const { routines } = getOperationalData();
  return useQuery({
    queryKey: ['routines', organizationId, 'member', memberId],
    queryFn: () => routines.listForMember(organizationId, memberId!),
    enabled: !!memberId,
  });
}

function useInvalidateRoutines() {
  const { organizationId } = useSession();
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['routines', organizationId] });
}

export function useCreateRoutine() {
  const { organizationId, uid } = useSession();
  const { routines } = getOperationalData();
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: (input: RoutineInput) => routines.create(organizationId, input, uid),
    onSuccess: invalidate,
  });
}

export function useUpdateRoutine() {
  const { organizationId } = useSession();
  const { routines } = getOperationalData();
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoutineInput }) =>
      routines.update(organizationId, id, input),
    onSuccess: invalidate,
  });
}

export function useSetRoutineStatus() {
  const { organizationId } = useSession();
  const { routines } = getOperationalData();
  const invalidate = useInvalidateRoutines();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoutineStatus }) =>
      routines.setStatus(organizationId, id, status),
    onSuccess: invalidate,
  });
}
