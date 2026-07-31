import { NavLink } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { NAV_GROUPS, NAV_ITEMS } from '@/config/navigation';
import { useSession } from '@/shared/session/SessionContext';
import { cn } from '@/shared/lib/cn';

const GROUP_LABELS: Record<string, string> = {
  operación: 'Operación',
  gestión: 'Gestión',
  sistema: 'Sistema',
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, organizationName } = useSession();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface/40">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-contrast">
          <Dumbbell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-content">{organizationName}</div>
          <div className="text-xs text-content-muted">GYMBAR</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <div className="px-2 pb-1.5 pt-3 text-xs font-medium uppercase tracking-wide text-content-muted">
                {GROUP_LABELS[group]}
              </div>
              <ul className="space-y-0.5">
                {groupItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-soft text-primary'
                            : 'text-content-muted hover:bg-surface hover:text-content',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
