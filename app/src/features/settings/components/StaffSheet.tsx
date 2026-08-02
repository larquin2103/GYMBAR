import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
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

interface Done {
  displayName: string;
  email: string;
  role: Role;
  inviteLink: string | null;
}

export function StaffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { add } = useStaffMutations();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('reception');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setDisplayName('');
    setEmail('');
    setRole('reception');
    setError(null);
    setDone(null);
    setCopied(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function onSubmit() {
    setError(null);
    if (!displayName.trim()) return setError('Ingresa el nombre.');
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setError('Correo inválido.');
    try {
      const result = await add.mutateAsync({
        displayName: displayName.trim(),
        email: email.trim(),
        role,
      });
      setDone({
        displayName: result.displayName,
        email: result.email,
        role: result.role,
        inviteLink: result.inviteLink ?? null,
      });
    } catch (err) {
      return setError(err instanceof Error ? err.message : 'No se pudo agregar.');
    }
  }

  async function copyLink() {
    if (!done?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(done.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Vista de confirmación tras el alta.
  if (done) {
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Usuario agregado"
        description={`${done.displayName} · ${done.email}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={reset}>
              Agregar otro
            </Button>
            <Button type="button" onClick={close}>
              Listo
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-state-active/10 px-3 py-2.5 text-sm text-state-active">
            <Check className="h-4 w-4 shrink-0" />
            Registrado en el directorio del personal.
          </div>

          {done.inviteLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-content">
                <Link2 className="h-4 w-4 text-content-muted" />
                Enlace para definir contraseña
              </div>
              <p className="text-xs text-content-muted">
                Compártelo con la persona para que establezca su contraseña e ingrese.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={done.inviteLink} className="text-xs" />
                <Button variant="secondary" size="sm" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border p-3 text-sm text-content-muted">
              Para darle acceso real (cuenta y contraseña), ejecuta en tu PC:
              <pre className="mt-2 overflow-x-auto rounded bg-surface px-2 py-1.5 text-xs text-content">
                node scripts/set-staff-role.mjs &lt;orgId&gt; {done.email} &lt;password&gt; {done.role}
              </pre>
              <span className="mt-1 block text-xs">Detalles en docs/13.</span>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Agregar usuario"
      description="Registra a un integrante del personal"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={close}>
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
          Esto registra a la persona en el directorio. Para darle acceso real (cuenta y
          contraseña) ejecuta el script <span className="tabular">set-staff-role.mjs</span> con su
          correo y rol. Ver docs/13.
        </p>
      </div>
    </Sheet>
  );
}
