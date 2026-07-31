import type { LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';

/**
 * Página de módulo aún no implementado. Deja la ruta y el layout listos para que
 * la fase correspondiente solo reemplace el cuerpo (ver docs/12).
 */
export function PlaceholderPage({
  title,
  description,
  icon,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} action={<Badge>{phase}</Badge>} />
      <EmptyState
        icon={icon}
        title="Módulo en construcción"
        description={`Este módulo se implementa en la ${phase}. La navegación y el layout ya están listos.`}
      />
    </div>
  );
}
