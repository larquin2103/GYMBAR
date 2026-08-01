import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeasurementInput } from '@/domain/measurement/measurement.entity';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useMemberMeasurements(memberId: string | undefined) {
  const { organizationId } = useSession();
  const { measurements } = getOperationalData();
  return useQuery({
    queryKey: ['measurements', organizationId, memberId],
    queryFn: () => measurements.listForMember(organizationId, memberId!),
    enabled: !!memberId,
  });
}

export function useAddMeasurement(memberId: string) {
  const { organizationId } = useSession();
  const { measurements } = getOperationalData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MeasurementInput) => measurements.add(organizationId, memberId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['measurements', organizationId, memberId] }),
  });
}
