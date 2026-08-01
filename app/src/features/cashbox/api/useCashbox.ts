import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useOpenSession() {
  const { organizationId } = useSession();
  const { cashbox } = getOperationalData();
  return useQuery({
    queryKey: ['cashbox', organizationId, 'open'],
    queryFn: () => cashbox.getOpenSession(organizationId),
  });
}

export function useSessionMovements(sessionId: string | undefined) {
  const { organizationId } = useSession();
  const { cashbox } = getOperationalData();
  return useQuery({
    queryKey: ['cashbox', organizationId, 'movements', sessionId],
    queryFn: () => cashbox.listMovements(organizationId, sessionId!),
    enabled: !!sessionId,
  });
}

export function useCashMutations() {
  const { organizationId } = useSession();
  const { operations } = getOperationalData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cashbox', organizationId] });

  const open = useMutation({
    mutationFn: (vars: { openingFloatCents: number; currency: string }) =>
      operations.openCashSession({ orgId: organizationId, ...vars }),
    onSuccess: invalidate,
  });
  const addMovement = useMutation({
    mutationFn: (vars: { type: 'income' | 'expense'; amountCents: number; reason: string }) =>
      operations.addCashMovement({ orgId: organizationId, ...vars }),
    onSuccess: invalidate,
  });
  const close = useMutation({
    mutationFn: (vars: { countedCents: number }) =>
      operations.closeCashSession({ orgId: organizationId, ...vars }),
    onSuccess: invalidate,
  });
  return { open, addMovement, close };
}
