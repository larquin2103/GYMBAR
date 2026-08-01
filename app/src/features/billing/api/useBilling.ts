import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaymentMethod } from '@gymbar/shared';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function usePlans() {
  const { organizationId } = useSession();
  const { plans } = getOperationalData();
  return useQuery({
    queryKey: ['plans', organizationId],
    queryFn: () => plans.list(organizationId),
  });
}

export function useMemberMembership(memberId: string | undefined) {
  const { organizationId } = useSession();
  const { memberships } = getOperationalData();
  return useQuery({
    queryKey: ['membership', organizationId, memberId],
    queryFn: () => memberships.getCurrentForMember(organizationId, memberId!),
    enabled: !!memberId,
  });
}

export function useMemberPayments(memberId: string | undefined) {
  const { organizationId } = useSession();
  const { payments } = getOperationalData();
  return useQuery({
    queryKey: ['payments', organizationId, 'member', memberId],
    queryFn: () => payments.listForMember(organizationId, memberId!),
    enabled: !!memberId,
  });
}

export function useRecentPayments() {
  const { organizationId } = useSession();
  const { payments } = getOperationalData();
  return useQuery({
    queryKey: ['payments', organizationId, 'recent'],
    queryFn: () => payments.listRecent(organizationId),
  });
}

/** Renovar/asignar membresía: cobra y extiende vigencia (operación sensible). */
export function useRenewMembership() {
  const { organizationId } = useSession();
  const { operations } = getOperationalData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      memberId: string;
      planId: string;
      method: PaymentMethod;
      notes?: string;
    }) =>
      operations.renewMembership({
        orgId: organizationId,
        memberId: vars.memberId,
        planId: vars.planId,
        method: vars.method,
        clientRequestId: crypto.randomUUID(),
        notes: vars.notes,
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['members', organizationId] });
      qc.invalidateQueries({ queryKey: ['membership', organizationId, vars.memberId] });
      qc.invalidateQueries({ queryKey: ['payments', organizationId] });
      qc.invalidateQueries({ queryKey: ['stats', organizationId] });
      qc.invalidateQueries({ queryKey: ['cashbox', organizationId] });
    },
  });
}
