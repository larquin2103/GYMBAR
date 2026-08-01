import { useMemo, useState } from 'react';
import { Plus, Dumbbell, Pencil, Archive, RotateCcw, ChevronDown } from 'lucide-react';
import { MEMBER_GOAL_LABELS } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';
import { countExercises, type Routine } from '@/domain/routine/routine.entity';
import { useRecentRoutines, useSetRoutineStatus } from '../api/useRoutines';
import { RoutineSheet } from '../components/RoutineSheet';

export default function RoutinesPage() {
  const { data: routines, isLoading } = useRecentRoutines();
  const setStatus = useSetRoutineStatus();
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = useMemo(
    () => (routines ?? []).filter((r) => r.status === filter),
    [routines, filter],
  );

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(r: Routine) {
    setEditing(r);
    setSheetOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Rutinas"
        description="Planes de entrenamiento asignados por el entrenador"
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nueva rutina
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {(['active', 'archived'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary text-primary-contrast'
                : 'bg-surface text-content-muted hover:text-content',
            )}
          >
            {f === 'active' ? 'Activas' : 'Archivadas'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={filter === 'active' ? 'Sin rutinas activas' : 'Sin rutinas archivadas'}
          description={
            filter === 'active'
              ? 'Crea la primera rutina y asígnala a un cliente.'
              : 'Las rutinas que archives aparecerán aquí.'
          }
          action={
            filter === 'active' ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nueva rutina
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const isOpen = expanded === r.id;
            return (
              <Card key={r.id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <Dumbbell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-content">{r.title}</span>
                          {r.goal && <Badge>{MEMBER_GOAL_LABELS[r.goal]}</Badge>}
                        </div>
                        <div className="mt-0.5 text-sm text-content-muted">
                          {r.memberNameSnapshot} · {r.days.length} día
                          {r.days.length !== 1 ? 's' : ''} · {countExercises(r)} ejercicios
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          'ml-auto mt-1 h-4 w-4 shrink-0 text-content-muted transition-transform',
                          isOpen && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                      {r.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatus.mutate({ id: r.id, status: 'archived' })}
                        >
                          <Archive className="h-4 w-4" /> Archivar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatus.mutate({ id: r.id, status: 'active' })}
                        >
                          <RotateCcw className="h-4 w-4" /> Restaurar
                        </Button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                      {r.days.map((day, di) => (
                        <div key={di} className="rounded-lg bg-surface/50 p-3">
                          <div className="mb-2 text-sm font-semibold text-content">{day.label}</div>
                          <ul className="space-y-1.5">
                            {day.exercises.map((ex, ei) => (
                              <li key={ei} className="text-sm">
                                <span className="text-content">{ex.name}</span>
                                <span className="text-content-muted">
                                  {' '}
                                  · {ex.sets}×{ex.reps}
                                  {ex.restSeconds ? ` · ${ex.restSeconds}s` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {r.notes && (
                        <div className="rounded-lg border border-dashed border-border p-3 text-sm text-content-muted sm:col-span-2 lg:col-span-3">
                          {r.notes}
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <RoutineSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        routine={editing}
      />
    </div>
  );
}
