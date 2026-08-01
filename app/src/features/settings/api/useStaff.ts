import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@gymbar/shared';
import type { StaffInput } from '@/domain/staff/staff.entity';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useStaff() {
  const { organizationId } = useSession();
  const { staff } = getOperationalData();
  return useQuery({
    queryKey: ['staff', organizationId],
    queryFn: () => staff.list(organizationId),
  });
}

export function useStaffMutations() {
  const { organizationId } = useSession();
  const { staff } = getOperationalData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['staff', organizationId] });

  const add = useMutation({
    mutationFn: (input: StaffInput) => staff.add(organizationId, input),
    onSuccess: invalidate,
  });
  const updateRole = useMutation({
    mutationFn: (vars: { id: string; role: Role }) =>
      staff.updateRole(organizationId, vars.id, vars.role),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => staff.remove(organizationId, id),
    onSuccess: invalidate,
  });
  return { add, updateRole, remove };
}
