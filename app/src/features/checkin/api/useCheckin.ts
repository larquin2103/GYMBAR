import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckInSource } from '@gymbar/shared';
import { getOperationalData } from '@/data/operational.factory';
import { getMemberRepository } from '@/data/member/member.repository.factory';
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

/**
 * Check-in de autoservicio (kiosko): busca al cliente por su PIN de 4 dígitos y
 * registra su entrada. Devuelve el cliente y el resultado para mostrarlo.
 */
export function useKioskCheckIn() {
  const { organizationId } = useSession();
  const { operations } = getOperationalData();
  const memberRepo = getMemberRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accessCode: string) => {
      const member = await memberRepo.getByAccessCode(organizationId, accessCode);
      if (!member) throw new Error('Código no encontrado');
      await operations.registerCheckIn({
        orgId: organizationId,
        memberId: member.id,
        source: 'kiosk',
      });
      return member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins', organizationId] });
      qc.invalidateQueries({ queryKey: ['stats', organizationId] });
    },
  });
}
