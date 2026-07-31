import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Empty state útil: explica qué es y ofrece la acción para empezar (ver docs/07). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-content-muted">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-content">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
