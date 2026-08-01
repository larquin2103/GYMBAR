/**
 * Medición corporal de un cliente en un momento dado. Permite ver la evolución
 * hacia su objetivo (perder peso, ganar masa, etc.). Los campos opcionales se
 * omiten si el gimnasio no los toma.
 */
export interface Measurement {
  id: string;
  memberId: string;
  date: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface MeasurementInput {
  date: Date;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  muscleKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  notes?: string | null;
}

export interface MeasurementRepository {
  /** Historial de un cliente, del más reciente al más antiguo. */
  listForMember(orgId: string, memberId: string): Promise<Measurement[]>;
  add(orgId: string, memberId: string, input: MeasurementInput): Promise<Measurement>;
}
