import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, Loader2, Laptop } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/shared/session/SessionContext';
import { useSyncStatus, type SyncState } from '@/shared/sync/useSyncStatus';
import { cn } from '@/shared/lib/cn';

const META: Record<
  SyncState,
  { label: string; tone: string; desc: string; spin?: boolean; icon: typeof Cloud }
> = {
  synced: {
    label: 'Sincronizado',
    tone: 'text-state-active',
    desc: 'Tus datos están guardados en la nube y al día en todos los dispositivos.',
    icon: Cloud,
  },
  syncing: {
    label: 'Sincronizando…',
    tone: 'text-primary',
    desc: 'Guardando cambios en la nube.',
    spin: true,
    icon: Loader2,
  },
  connecting: {
    label: 'Conectando…',
    tone: 'text-state-pending',
    desc: 'Buscando el servidor. Puedes seguir trabajando; se sincroniza al conectar.',
    spin: true,
    icon: Loader2,
  },
  offline: {
    label: 'Sin conexión',
    tone: 'text-state-pending',
    desc: 'Trabajas sin internet. Los cambios se guardan aquí y suben al reconectar.',
    icon: CloudOff,
  },
  local: {
    label: 'Modo local',
    tone: 'text-content-muted',
    desc: 'Modo demostración: los datos viven solo en este dispositivo. Conecta Firebase para sincronizar entre equipos.',
    icon: Laptop,
  },
};

function relativeTime(date: Date | null): string {
  if (!date) return 'nunca';
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'hace un momento';
  if (secs < 60) return `hace ${secs} s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

/** Indicador de nube: estado de sincronización + acción de sincronizar ahora. */
export function SyncIndicator() {
  const { organizationId, organizationName, email } = useSession();
  const status = useSyncStatus(organizationId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = META[status.state];
  const Icon = meta.icon;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function onSyncNow() {
    setJustSynced(false);
    const ok = await status.syncNow();
    // Refresca los datos de la app desde Firestore tras confirmar conexión.
    await qc.invalidateQueries();
    if (ok) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface',
          meta.tone,
        )}
        title={meta.label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon className={cn('h-3.5 w-3.5', meta.spin && 'animate-spin')} aria-hidden />
        <span className="hidden sm:inline">{meta.label}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-lg border border-border bg-bg shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className={cn('flex items-center gap-2 text-sm font-semibold', meta.tone)}>
              <Icon className={cn('h-4 w-4', meta.spin && 'animate-spin')} aria-hidden />
              {meta.label}
            </div>
            <p className="mt-1 text-xs text-content-muted">{meta.desc}</p>
          </div>

          {status.cloud ? (
            <div className="space-y-2.5 px-4 py-3 text-xs">
              <Row label="Gimnasio" value={organizationName} />
              {email && <Row label="Cuenta de nube" value={email} />}
              <Row label="Última sincronización" value={relativeTime(status.lastSyncedAt)} />
              {status.pending && (
                <div className="text-state-pending">Hay cambios pendientes de subir.</div>
              )}
              <button
                type="button"
                onClick={onSyncNow}
                disabled={status.busy}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {status.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : justSynced ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {status.busy ? 'Sincronizando…' : justSynced ? 'Al día' : 'Sincronizar ahora'}
              </button>
              <p className="text-[11px] text-content-muted">
                En otro dispositivo, inicia sesión con la misma cuenta del gimnasio para ver los
                mismos datos.
              </p>
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-content-muted">
              Sin nube conectada. Con Firebase configurado, aquí verás el estado y podrás
              sincronizar entre dispositivos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-content-muted">{label}</span>
      <span className="truncate font-medium text-content">{value}</span>
    </div>
  );
}
