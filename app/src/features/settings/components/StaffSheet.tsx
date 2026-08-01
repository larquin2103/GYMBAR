import { useState } from 'react';
import type { Role } from '@gymbar/shared';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useStaffMutations } from '../api/useStaff';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  reception: 'Recepcionista',
  trainer: 'Entrenador',
};

const ROLE_HINTS: Record<Role, string> = {
  admin: 'Acceso total, incluida configuración y usuarios.',
  reception: 'Operación y gestión (sin configuración ni anular pagos).',
  trainer: 'Clientes asignados, rutinas, medidas y check-in.',
};

export function StaffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { add } = useStaffMutations();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('reception');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!displayName.trim()) return setError('Ingresa el nombre.');
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setError('Correo inválido.');
    try {
      await add.mutateAsync({ displayName: displayName.trim(), email: email.trim(), role });
    } catch (err) {
      return setError(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
    setDisplayName('');
    setEmail('');
    setRole('reception');
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar usuario"
      description="Registra a un integrante del personal"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={add.isPending}>
            Agregar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nombre" htmlFor="staff-name" required>
          <Input
            id="staff-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="Correo" htmlFor="staff-email" required>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div>
          <div className="mb-2 text-sm font-medium text-content">Rol</div>
          <div className="space-y-2">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors',
                  role === r ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/40',
                )}
              >
                <div>
                  <div className="text-sm font-medium text-content">{ROLE_LABELS[r]}</div>
                  <div className="text-xs text-content-muted">{ROLE_HINTS[r]}</div>
                </div>
                {role === r && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
            {error}
          </p>
        )}

        <p className="text-xs text-content-muted">
          En producción, al agregar un usuario se le envía una invitación y una Cloud Function le
          asigna su rol (custom claims). Ver docs/05.
        </p>
      </div>
    </Sheet>
  );
}
