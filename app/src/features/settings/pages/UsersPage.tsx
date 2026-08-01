import { useState } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';
import type { Role } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useSession } from '@/shared/session/SessionContext';
import { useStaff, useStaffMutations } from '../api/useStaff';
import { StaffSheet, ROLE_LABELS } from '../components/StaffSheet';

const ROLES: Role[] = ['admin', 'reception', 'trainer'];

export default function UsersPage() {
  const { uid } = useSession();
  const { data: staff, isLoading } = useStaff();
  const { updateRole, remove } = useStaffMutations();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Personal del gimnasio y sus roles"
        action={
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar usuario
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Correo</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff?.map((u) => {
                const isSelf = u.id === uid;
                return (
                  <tr key={u.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-content">
                            {u.displayName}
                            {isSelf && <span className="ml-1.5 text-xs text-content-muted">(tú)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-content-muted sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as Role })}
                        className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-content disabled:opacity-60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => remove.mutate(u.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-content-muted hover:bg-state-expired/10 hover:text-state-expired"
                          aria-label="Eliminar"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(staff?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-content-muted">
                    <UserCog className="mx-auto mb-2 h-6 w-6" />
                    Sin usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <StaffSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
