import { useEffect, useRef, useState } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useSession } from '@/shared/session/SessionContext';
import { cn } from '@/shared/lib/cn';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  reception: 'Recepción',
  trainer: 'Entrenador',
};

/** Menú de cuenta con acción de cerrar sesión. Al salir, el guard redirige a /login. */
export function UserMenu() {
  const { displayName, email, role } = useSession();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 transition-colors hover:bg-surface"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${displayName} · ${ROLE_LABEL[role] ?? role}`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {initial}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-content-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-lg border border-border bg-bg shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="truncate text-sm font-semibold text-content">{displayName}</div>
            {email && <div className="truncate text-xs text-content-muted">{email}</div>}
            <div className="mt-1 inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
              {ROLE_LABEL[role] ?? role}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-content transition-colors hover:bg-surface disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-content-muted" aria-hidden />
            {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
}
