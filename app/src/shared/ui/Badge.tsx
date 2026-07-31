import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { MemberStatus } from '@gymbar/shared';

/** Mapa canónico estado → estilo (ver docs/07). Único lugar donde vive. */
const STATE_STYLES: Record<MemberStatus, string> = {
  active: 'bg-state-active/12 text-state-active',
  expired: 'bg-state-expired/12 text-state-expired',
  pending: 'bg-state-pending/12 text-state-pending',
  frozen: 'bg-state-frozen/12 text-state-frozen',
  cancelled: 'bg-state-cancel/15 text-state-cancel',
};

const STATE_LABELS: Record<MemberStatus, string> = {
  active: 'Activo',
  expired: 'Vencido',
  pending: 'Pendiente',
  frozen: 'Congelado',
  cancelled: 'Cancelado',
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATE_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATE_LABELS[status]}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-content-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
