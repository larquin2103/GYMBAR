import { useMemo, useState } from 'react';
import { Plus, Trash2, X, GripVertical, Search } from 'lucide-react';
import { MEMBER_GOAL_LABELS, MemberGoal, type MemberGoal as MemberGoalType } from '@gymbar/shared';
import {
  emptyDay,
  emptyExercise,
  type Routine,
  type RoutineDay,
  type RoutineExercise,
  type RoutineInput,
} from '@/domain/routine/routine.entity';
import { memberFullName } from '@/domain/member/member.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useMembers } from '@/features/members/api/useMembers';
import { useCreateRoutine, useUpdateRoutine } from '../api/useRoutines';

interface Preset {
  memberId: string;
  memberName: string;
}

export function RoutineSheet({
  open,
  onClose,
  routine,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  /** Rutina existente para editar; ausente = creación. */
  routine?: Routine | null;
  /** Cliente fijado (al abrir desde su ficha). */
  preset?: Preset;
}) {
  const create = useCreateRoutine();
  const update = useUpdateRoutine();
  const editing = !!routine;

  const [memberId, setMemberId] = useState(routine?.memberId ?? preset?.memberId ?? '');
  const [memberName, setMemberName] = useState(
    routine?.memberNameSnapshot ?? preset?.memberName ?? '',
  );
  const lockedMember = !!preset || editing;

  const [title, setTitle] = useState(routine?.title ?? '');
  const [goal, setGoal] = useState<string>(routine?.goal ?? '');
  const [notes, setNotes] = useState(routine?.notes ?? '');
  const [days, setDays] = useState<RoutineDay[]>(
    routine?.days?.length ? structuredClone(routine.days) : [emptyDay(1)],
  );
  const [error, setError] = useState<string | null>(null);

  // --- Selector de cliente (solo en creación sin preset) ---
  const [search, setSearch] = useState('');
  const membersQuery = useMembers({ search: search.trim() || undefined });
  const results = useMemo(
    () => (membersQuery.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 6),
    [membersQuery.data],
  );

  function updateDay(i: number, patch: Partial<RoutineDay>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function updateExercise(di: number, ei: number, patch: Partial<RoutineExercise>) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === di
          ? { ...d, exercises: d.exercises.map((x, xi) => (xi === ei ? { ...x, ...patch } : x)) }
          : d,
      ),
    );
  }
  function addExercise(di: number) {
    setDays((prev) =>
      prev.map((d, idx) => (idx === di ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d)),
    );
  }
  function removeExercise(di: number, ei: number) {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === di ? { ...d, exercises: d.exercises.filter((_, xi) => xi !== ei) } : d,
      ),
    );
  }
  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  }
  function removeDay(di: number) {
    setDays((prev) => prev.filter((_, idx) => idx !== di));
  }

  async function onSubmit() {
    setError(null);
    if (!memberId) return setError('Selecciona un cliente.');
    if (!title.trim()) return setError('Ponle un título a la rutina.');
    // Limpia ejercicios sin nombre y días vacíos.
    const cleanDays: RoutineDay[] = days
      .map((d) => ({
        label: d.label.trim() || 'Día',
        exercises: d.exercises
          .filter((x) => x.name.trim())
          .map((x) => ({
            name: x.name.trim(),
            sets: Math.max(1, Math.round(x.sets) || 1),
            reps: x.reps.trim() || '—',
            restSeconds: x.restSeconds != null && x.restSeconds > 0 ? Math.round(x.restSeconds) : null,
            notes: x.notes?.trim() || null,
          })),
      }))
      .filter((d) => d.exercises.length > 0);
    if (cleanDays.length === 0) return setError('Agrega al menos un ejercicio.');

    const input: RoutineInput = {
      memberId,
      memberNameSnapshot: memberName,
      title: title.trim(),
      goal: (goal || null) as MemberGoalType | null,
      days: cleanDays,
      notes: notes.trim() || null,
    };
    if (editing && routine) {
      await update.mutateAsync({ id: routine.id, input });
    } else {
      await create.mutateAsync(input);
    }
    onClose();
  }

  const totalExercises = days.reduce((s, d) => s + d.exercises.filter((x) => x.name.trim()).length, 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Editar rutina' : 'Nueva rutina'}
      description="Plan de entrenamiento asignado al cliente"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-content-muted">
            {days.length} día{days.length !== 1 ? 's' : ''} · {totalExercises} ejercicios
          </span>
          <Button onClick={onSubmit} loading={create.isPending || update.isPending}>
            {editing ? 'Guardar cambios' : 'Crear rutina'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cliente */}
        {lockedMember ? (
          <Field label="Cliente" htmlFor="r-member">
            <div className="flex h-10 items-center rounded-md border border-border bg-surface/50 px-3 text-sm text-content">
              {memberName || '—'}
            </div>
          </Field>
        ) : (
          <Field label="Cliente" htmlFor="r-member" required>
            {memberId ? (
              <div className="flex h-10 items-center justify-between rounded-md border border-border bg-surface/50 px-3 text-sm">
                <span className="font-medium text-content">{memberName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMemberId('');
                    setMemberName('');
                  }}
                  className="text-content-muted hover:text-content"
                  aria-label="Cambiar cliente"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-content-muted" />
                <Input
                  id="r-member"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente por nombre…"
                  className="pl-9"
                  autoComplete="off"
                />
                {search.trim() && results.length > 0 && (
                  <ul className="mt-1 overflow-hidden rounded-md border border-border bg-bg shadow-sm">
                    {results.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMemberId(m.id);
                            setMemberName(memberFullName(m));
                            setSearch('');
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                        >
                          <span className="text-content">{memberFullName(m)}</span>
                          <span className="text-xs text-content-muted">{m.code}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        )}

        <Field label="Título" htmlFor="r-title" required>
          <Input
            id="r-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Hipertrofia · 4 días"
          />
        </Field>

        <Field label="Objetivo" htmlFor="r-goal">
          <select
            id="r-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-content"
          >
            <option value="">Sin definir</option>
            {MemberGoal.options.map((g) => (
              <option key={g} value={g}>
                {MEMBER_GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </Field>

        {/* Días y ejercicios */}
        <div className="space-y-4">
          {days.map((day, di) => (
            <div key={di} className="rounded-lg border border-border p-3">
              <div className="mb-3 flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                <Input
                  value={day.label}
                  onChange={(e) => updateDay(di, { label: e.target.value })}
                  placeholder={`Día ${di + 1}`}
                  className="h-9 font-medium"
                />
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(di)}
                    className="shrink-0 text-content-muted hover:text-state-expired"
                    aria-label="Eliminar día"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {day.exercises.map((ex, ei) => (
                  <div key={ei} className="rounded-md bg-surface/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={ex.name}
                        onChange={(e) => updateExercise(di, ei, { name: e.target.value })}
                        placeholder="Ejercicio"
                        className="h-9"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(di, ei)}
                        className="shrink-0 text-content-muted hover:text-state-expired"
                        aria-label="Eliminar ejercicio"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <NumMini
                        label="Series"
                        value={ex.sets}
                        onChange={(v) => updateExercise(di, ei, { sets: v })}
                      />
                      <TextMini
                        label="Reps"
                        value={ex.reps}
                        onChange={(v) => updateExercise(di, ei, { reps: v })}
                      />
                      <NumMini
                        label="Descanso (s)"
                        value={ex.restSeconds ?? 0}
                        onChange={(v) => updateExercise(di, ei, { restSeconds: v })}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addExercise(di)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir ejercicio
                </button>
              </div>
            </div>
          ))}

          <Button variant="secondary" size="sm" onClick={addDay} className="w-full">
            <Plus className="h-4 w-4" /> Añadir día
          </Button>
        </div>

        <Field label="Notas" htmlFor="r-notes">
          <Textarea
            id="r-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones generales, cardio, progresión…"
          />
        </Field>

        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function NumMini({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={cn('block')}>
      <span className="mb-1 block text-[11px] text-content-muted">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={String(value)}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="h-9"
      />
    </label>
  );
}

function TextMini({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-content-muted">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </label>
  );
}
