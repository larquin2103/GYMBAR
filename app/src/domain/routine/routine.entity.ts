import type { MemberGoal } from '@gymbar/shared';

/** Un ejercicio dentro de un día de rutina. */
export interface RoutineExercise {
  name: string;
  sets: number;
  /** Repeticiones como texto libre: "12", "10-12", "AMRAP", "30 s". */
  reps: string;
  restSeconds: number | null;
  notes: string | null;
}

/** Un día de entrenamiento (agrupa ejercicios). */
export interface RoutineDay {
  label: string;
  exercises: RoutineExercise[];
}

export type RoutineStatus = 'active' | 'archived';

/**
 * Rutina de entrenamiento asignada a un cliente por un entrenador (docs/03).
 * Estructura anidada (días → ejercicios) inmutable desde la UI; se edita
 * reemplazando el arreglo completo.
 */
export interface Routine {
  id: string;
  memberId: string;
  memberNameSnapshot: string;
  title: string;
  goal: MemberGoal | null;
  days: RoutineDay[];
  notes: string | null;
  status: RoutineStatus;
  /** UID del entrenador/staff que la creó. */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutineInput {
  memberId: string;
  memberNameSnapshot: string;
  title: string;
  goal: MemberGoal | null;
  days: RoutineDay[];
  notes: string | null;
}

export interface RoutineRepository {
  /** Rutinas recientes de toda la organización (página de rutinas). */
  listRecent(orgId: string, max?: number): Promise<Routine[]>;
  listForMember(orgId: string, memberId: string): Promise<Routine[]>;
  getById(orgId: string, id: string): Promise<Routine | null>;
  create(orgId: string, input: RoutineInput, createdBy: string): Promise<Routine>;
  update(orgId: string, id: string, input: RoutineInput): Promise<void>;
  setStatus(orgId: string, id: string, status: RoutineStatus): Promise<void>;
}

/** Total de ejercicios en una rutina (para resúmenes). */
export function countExercises(routine: Pick<Routine, 'days'>): number {
  return routine.days.reduce((sum, d) => sum + d.exercises.length, 0);
}

/** Crea un ejercicio vacío para el formulario. */
export function emptyExercise(): RoutineExercise {
  return { name: '', sets: 3, reps: '12', restSeconds: 60, notes: null };
}

/** Crea un día vacío para el formulario. */
export function emptyDay(index: number): RoutineDay {
  return { label: `Día ${index}`, exercises: [emptyExercise()] };
}
