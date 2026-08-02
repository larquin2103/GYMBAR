import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowLeft, ShieldCheck } from 'lucide-react';
import type { Role } from '@gymbar/shared';
import type { StaffUser } from '@/domain/staff/staff.entity';
import { useAuth } from '@/shared/session/SessionContext';
import { getOperationalData } from '@/data/operational.factory';
import { isFirebaseConfigured } from '@/shared/lib/firebase';
import { isValidPin } from '@/shared/lib/pin';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  reception: 'Recepción',
  trainer: 'Entrenador',
};

function Logo() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-contrast">
        <Dumbbell className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold text-content">GYMBAR</h1>
    </div>
  );
}

export default function LoginPage() {
  const { gym, session } = useAuth();
  if (session) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-full items-center justify-center bg-surface/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo />
        {gym ? <UserStage /> : <GymStage />}
      </div>
    </div>
  );
}

/** Etapa 1: conectar o crear la cuenta del gimnasio. */
function GymStage() {
  const { signIn, createGym } = useAuth();
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState(isFirebaseConfigured ? '' : 'demo@gymbar.app');
  const [password, setPassword] = useState(isFirebaseConfigured ? '' : 'demo');
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        if (!gymName.trim()) throw new Error('Ponle nombre a tu gimnasio.');
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new Error('Correo inválido.');
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (!isValidPin(ownerPin)) throw new Error('El PIN debe tener 4 a 6 dígitos.');
        await createGym(gymName, email.trim(), password, ownerName, ownerPin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg p-6 shadow-card">
      <div className="mb-4 flex rounded-md bg-surface p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={cn(
            'flex-1 rounded px-3 py-1.5 font-medium transition-colors',
            mode === 'signin' ? 'bg-bg text-content shadow-sm' : 'text-content-muted',
          )}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={cn(
            'flex-1 rounded px-3 py-1.5 font-medium transition-colors',
            mode === 'create' ? 'bg-bg text-content shadow-sm' : 'text-content-muted',
          )}
        >
          Crear gimnasio
        </button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {mode === 'create' && (
          <Field label="Nombre del gimnasio" htmlFor="gymName" required>
            <Input id="gymName" value={gymName} onChange={(e) => setGymName(e.target.value)} />
          </Field>
        )}
        <Field label="Correo de la cuenta" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Contraseña" htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {mode === 'create' && (
          <>
            <Field label="Tu nombre (administrador)" htmlFor="ownerName" required>
              <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </Field>
            <Field label="Tu PIN (4–6 dígitos)" htmlFor="ownerPin" hint="Lo usarás para entrar cada vez" required>
              <Input
                id="ownerPin"
                inputMode="numeric"
                maxLength={6}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </>
        )}

        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">{error}</p>
        )}

        <Button type="submit" className="w-full" loading={busy}>
          {mode === 'signin' ? 'Entrar' : 'Crear gimnasio'}
        </Button>
      </form>

      {!isFirebaseConfigured && (
        <p className="mt-3 text-center text-xs text-content-muted">
          Modo demo: cualquier correo/contraseña conecta. PIN del admin: <b>1234</b>.
        </p>
      )}
    </div>
  );
}

/** Etapa 2: elegir usuario interno y validar PIN. */
function UserStage() {
  const { gym, loginUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!gym) return;
    let alive = true;
    getOperationalData()
      .staff.list(gym.orgId)
      .then((list) => {
        if (alive) setStaff(list.filter((s) => s.active));
      })
      .catch(() => alive && setStaff([]));
    return () => {
      alive = false;
    };
  }, [gym]);

  async function submitPin() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await loginUser(selected.id, pin);
      if (ok) navigate('/', { replace: true });
      else setError('PIN incorrecto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-content">{gym?.orgName}</div>
          <div className="text-xs text-content-muted">Elige tu usuario</div>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content"
        >
          Cambiar cuenta
        </button>
      </div>

      {selected ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setPin('');
              setError(null);
            }}
            className="mb-3 inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
          >
            <ArrowLeft className="h-4 w-4" /> {selected.displayName}
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPin();
            }}
            className="space-y-3"
          >
            <Field label="PIN" htmlFor="pin" required>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            {error && (
              <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={busy}>
              Entrar
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          {staff === null ? (
            <div className="text-sm text-content-muted">Cargando…</div>
          ) : staff.length === 0 ? (
            <div className="rounded-md border border-border p-3 text-sm text-content-muted">
              No hay usuarios. Vuelve a “Cambiar cuenta” y crea el gimnasio, o pide al admin que te
              registre.
            </div>
          ) : (
            staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-surface"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  {s.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-content">
                    {s.displayName}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-content-muted">
                    <ShieldCheck className="h-3 w-3" /> {ROLE_LABEL[s.role]}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
