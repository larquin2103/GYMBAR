import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from './Skeleton';

type Tone = 'default' | 'active' | 'expired' | 'pending';

const toneText: Record<Tone, string> = {
  default: 'text-content',
  active: 'text-state-active',
  expired: 'text-state-expired',
  pending: 'text-state-pending',
};

/** Indicador accionable del dashboard (ver docs · Dashboard). */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-content-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-content-muted" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <div className={cn('mt-2 text-metric tabular', toneText[tone])}>{value}</div>
      )}
      {hint && <p className="mt-1 text-xs text-content-muted">{hint}</p>}
    </div>
  );
}
