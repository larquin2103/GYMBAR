import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckInSource } from '@gymbar/shared';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useTodayCheckins() {
  const { organizationId } = useSession();
  const { checkins } = getOperationalData();
  return useQuery({
    queryKey: ['checkins', organizationId, 'today'],
    queryFn: () => checkins.listToday(organizationId),
  });
}

export function useMemberCheckins(memberId: string | undefined) {
  const { organizationId } = useSession();
  const { checkins } = getOperationalData();
  return useQuery({
    queryKey: ['checkins', organizationId, 'member', memberId],
    queryFn: () => checkins.listRecentForMember(organizationId, memberId!),
    enabled: !!memberId,
  });
}

export function useRegisterCheckIn() {
  const { organizationId } = useSession();
  const { operations } = getOperationalData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { memberId: string; source: CheckInSource }) =>
      operations.registerCheckIn({ orgId: organizationId, ...vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins', organizationId] });
      qc.invalidateQueries({ queryKey: ['stats', organizationId] });
    },
  });
}
