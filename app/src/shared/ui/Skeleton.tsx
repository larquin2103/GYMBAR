import { cn } from '@/shared/lib/cn';

/** Placeholder de carga. Se usa en listas y fichas; nunca spinners a pantalla completa. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface', className)} aria-hidden />;
}
