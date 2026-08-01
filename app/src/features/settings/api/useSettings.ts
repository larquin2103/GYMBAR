import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrganizationSettingsInput } from '@/domain/organization/organization.entity';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useOrgSettings() {
  const { organizationId } = useSession();
  const { organization } = getOperationalData();
  return useQuery({
    queryKey: ['org-settings', organizationId],
    queryFn: () => organization.getSettings(organizationId),
  });
}

export function useUpdateOrgSettings() {
  const { organizationId } = useSession();
  const { organization } = getOperationalData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizationSettingsInput) =>
      organization.updateSettings(organizationId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-settings', organizationId] }),
  });
}
