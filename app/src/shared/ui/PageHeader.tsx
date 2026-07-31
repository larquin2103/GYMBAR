import type { ReactNode } from 'react';

/** Encabezado consistente: título + acción primaria única a la derecha (ver docs/06). */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">{title}</h1>
        {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
