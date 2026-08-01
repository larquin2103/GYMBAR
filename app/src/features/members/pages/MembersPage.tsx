import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import type { MemberStatus } from '@gymbar/shared';
import { memberFullName, memberInitials } from '@/domain/member/member.entity';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { StatusBadge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useMembers } from '../api/useMembers';
import { MemberSheet } from '../components/MemberSheet';

const STATUS_FILTERS: { label: string; value: MemberStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Vencidos', value: 'expired' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Congelados', value: 'frozen' },
];

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MembersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 250);
  const [status, setStatus] = useState<MemberStatus | 'all'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Abre el alta desde el atajo de la PWA (?new=1).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSheetOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMembers({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  });

  const members = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Busca, registra y gestiona a los clientes del gimnasio"
        action={
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <Input
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="pl-9"
            aria-label="Buscar clientes"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                status === f.value
                  ? 'bg-primary text-primary-contrast'
                  : 'bg-surface text-content-muted hover:text-content',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Sin resultados' : 'Aún no hay clientes'}
          description={
            search
              ? 'Prueba con otro nombre o código.'
              : 'Registra al primer cliente para empezar a operar.'
          }
          action={
            !search && (
              <Button onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4" />
                Registrar el primero
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Teléfono</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Vence</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/members/${m.id}`)}
                  className="cursor-pointer transition-colors hover:bg-surface/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        photoUrl={m.photoUrl}
                        initials={memberInitials(m)}
                        name={memberFullName(m)}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-content">{memberFullName(m)}</div>
                        <div className="text-xs text-content-muted">{m.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-content-muted sm:table-cell tabular">
                    {m.phone ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-content-muted md:table-cell tabular">
                    {formatDate(m.membershipEndDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Cargar más
          </Button>
        </div>
      )}

      <MemberSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
