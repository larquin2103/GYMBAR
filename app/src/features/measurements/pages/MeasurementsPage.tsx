import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, Search, Plus, LineChart as LineChartIcon, ArrowUpRight } from 'lucide-react';
import { MEMBER_GOAL_LABELS, normalizeSearch } from '@gymbar/shared';
import { memberFullName, memberInitials, type Member } from '@/domain/member/member.entity';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Field';
import { Avatar } from '@/shared/ui/Avatar';
import { StatusBadge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { cn } from '@/shared/lib/cn';
import { useSession } from '@/shared/session/SessionContext';
import { useMembersForTrainer } from '@/features/members/api/useMembers';
import { useStaff } from '@/features/settings/api/useStaff';
import { useMemberMeasurements } from '../api/useMeasurements';
import { MeasurementSheet } from '../components/MeasurementSheet';
import { MeasurementEvolution } from '../components/MeasurementEvolution';

type TrainerFilter = 'all' | 'unassigned' | string;

/**
 * Módulo de Medidas: seguimiento de la evolución corporal de los clientes.
 * El entrenador ve solo los clientes que tiene asignados; admin/recepción ven
 * a todos, con filtro por entrenador. La evolución (gráfico + tabla) se reutiliza
 * de la ficha del cliente.
 */
export default function MeasurementsPage() {
  const navigate = useNavigate();
  const { role, uid } = useSession();
  const isTrainer = role === 'trainer';

  // El entrenador solo carga sus asignados; admin/recepción cargan todos y
  // filtran en cliente (gimnasios pequeños, evita índices y consultas extra).
  const { data: allMembers, isLoading } = useMembersForTrainer(isTrainer ? uid : null);
  const { data: staff } = useStaff();
  const trainers = (staff ?? []).filter((s) => s.role === 'trainer');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TrainerFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const members = useMemo(() => {
    let list = allMembers ?? [];
    if (!isTrainer) {
      if (filter === 'unassigned') list = list.filter((m) => !m.trainerId);
      else if (filter !== 'all') list = list.filter((m) => m.trainerId === filter);
    }
    const term = normalizeSearch(search);
    if (term) list = list.filter((m) => m.searchName.includes(term) || m.code.toLowerCase().includes(term));
    return list;
  }, [allMembers, isTrainer, filter, search]);

  // Auto-selecciona el primer cliente de la lista cuando cambia.
  useEffect(() => {
    if (members.length === 0) {
      setSelectedId(null);
    } else if (!members.some((m) => m.id === selectedId)) {
      setSelectedId(members[0]!.id);
    }
  }, [members, selectedId]);

  const selected: Member | null = members.find((m) => m.id === selectedId) ?? null;
  const { data: measurements } = useMemberMeasurements(selected?.id);

  const trainerName = (id: string | null) =>
    id ? trainers.find((t) => t.id === id)?.displayName ?? 'Entrenador' : null;

  return (
    <div>
      <PageHeader
        title="Medidas"
        description={
          isTrainer
            ? 'Evolución corporal de tus clientes asignados'
            : 'Seguimiento de la evolución corporal de los clientes'
        }
      />

      {/* Filtro por entrenador (solo admin/recepción) */}
      {!isTrainer && trainers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Todos
          </FilterChip>
          {trainers.map((t) => (
            <FilterChip key={t.id} active={filter === t.id} onClick={() => setFilter(t.id)}>
              {t.displayName}
            </FilterChip>
          ))}
          <FilterChip active={filter === 'unassigned'} onClick={() => setFilter('unassigned')}>
            Sin asignar
          </FilterChip>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Lista de clientes */}
        <div className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="pl-9"
              aria-label="Buscar cliente"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Ruler}
              title={
                isTrainer ? 'Sin clientes asignados' : search ? 'Sin resultados' : 'Sin clientes'
              }
              description={
                isTrainer
                  ? 'Pide al administrador que te asigne clientes desde la ficha del cliente.'
                  : search
                    ? 'Prueba con otro nombre o código.'
                    : 'Registra clientes para empezar a seguir su evolución.'
              }
            />
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      m.id === selectedId
                        ? 'border-primary bg-primary-soft'
                        : 'border-border hover:bg-surface',
                    )}
                  >
                    <Avatar photoUrl={m.photoUrl} initials={memberInitials(m)} name={memberFullName(m)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-content">
                        {memberFullName(m)}
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-content-muted">
                        <span className="shrink-0 whitespace-nowrap">{m.code}</span>
                        {!isTrainer && m.trainerId && (
                          <span className="truncate">· {trainerName(m.trainerId)}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Evolución del cliente seleccionado */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={LineChartIcon}
                  title="Selecciona un cliente"
                  description="Elige un cliente de la lista para ver su evolución."
                />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      photoUrl={selected.photoUrl}
                      initials={memberInitials(selected)}
                      name={memberFullName(selected)}
                    />
                    <div>
                      <div className="font-semibold text-content">{memberFullName(selected)}</div>
                      <div className="text-xs text-content-muted">
                        {selected.goal ? MEMBER_GOAL_LABELS[selected.goal] : 'Sin objetivo'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/members/${selected.id}`)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Ver ficha
                    </Button>
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Registrar medida
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  {(measurements?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={LineChartIcon}
                      title="Sin medidas registradas"
                      description="Registra la primera medición para empezar a seguir su evolución."
                    />
                  ) : (
                    <MeasurementEvolution measurements={measurements ?? []} />
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {selected && (
        <MeasurementSheet open={addOpen} onClose={() => setAddOpen(false)} memberId={selected.id} />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-contrast' : 'bg-surface text-content-muted hover:text-content',
      )}
    >
      {children}
    </button>
  );
}
