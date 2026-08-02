import { useState } from 'react';
import type { Role } from '@gymbar/shared';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { isValidPin } from '@/shared/lib/pin';
import { useStaffMutations } from '../api/useStaff';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  reception: 'Recepcionista',
  trainer: 'Entrenador',
};

const ROLE_HINTS: Record<Role, string> = {
  admin: 'Acceso total, incluida configuración y usuarios.',
  reception: 'Operación y gestión (sin configuración).',
  trainer: 'Clientes, rutinas, medidas y check-in.',
};

export function StaffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { add } = useStaffMutations();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('reception');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDisplayName('');
    setEmail('');
    setRole('reception');
    setPin('');
    setError(null);
  }

  async function onSubmit() {
    setError(null);
    if (!displayName.trim()) return setError('Ingresa el nombre.');
    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setError('Correo inválido.');
    if (!isValidPin(pin)) return setError('El PIN debe tener 4 a 6 dígitos.');
    try {
      await add.mutateAsync({
        displayName: displayName.trim(),
        email: email.trim() || `${displayName.trim().toLowerCase().replace(/\s+/g, '.')}@local`,
        role,
        pin,
      });
    } catch (err) {
      return setError(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
    reset();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar usuario"
      description="Personal que inicia sesión con un PIN"
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
          <Input id="staff-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Correo (opcional)" htmlFor="staff-email">
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="PIN (4–6 dígitos)" htmlFor="staff-pin" hint="Lo usará para iniciar sesión" required>
          <Input
            id="staff-pin"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
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
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">{error}</p>
        )}

        <p className="text-xs text-content-muted">
          Los usuarios comparten la cuenta de nube del gimnasio y se distinguen por su PIN. Podrás
          cambiar de usuario sin cerrar la sesión del gimnasio.
        </p>
      </div>
    </Sheet>
  );
}
