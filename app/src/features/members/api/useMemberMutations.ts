import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MemberPatch, NewMember } from '@gymbar/shared';
import { getMemberRepository } from '@/data/member/member.repository.factory';
import { useSession } from '@/shared/session/SessionContext';
import { memberKeys } from './queryKeys';

/** Crea un cliente e invalida la lista para reflejarlo. */
export function useCreateMember() {
  const { organizationId } = useSession();
  const repo = getMemberRepository();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { input: NewMember; photo?: Blob | null }) =>
      repo.create(organizationId, vars.input, vars.photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.all(organizationId) });
    },
  });
}

/** Actualiza un cliente e invalida su ficha y la lista. */
export function useUpdateMember() {
  const { organizationId } = useSession();
  const repo = getMemberRepository();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string; patch: MemberPatch }) =>
      repo.update(organizationId, vars.id, vars.patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: memberKeys.detail(organizationId, vars.id) });
      qc.invalidateQueries({ queryKey: memberKeys.all(organizationId) });
    },
  });
}
