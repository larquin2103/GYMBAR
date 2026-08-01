/**
 * Medición corporal de un cliente en un momento dado. Permite ver la evolución
 * hacia su objetivo. Set de campos siguiendo prácticas comunes de gimnasios
 * (composición corporal + perímetros). Los campos opcionales se omiten si el
 * gimnasio no los toma. El IMC se calcula (peso/altura²), no se almacena.
 */
export interface Measurement {
  id: string;
  memberId: string;
  date: Date;
  // Composición corporal
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleKg: number | null;
  // Perímetros (cm)
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface MeasurementInput {
  date: Date;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  muscleKg?: number | null;
  neckCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  notes?: string | null;
}

export interface MeasurementRepository {
  /** Historial de un cliente, del más reciente al más antiguo. */
  listForMember(orgId: string, memberId: string): Promise<Measurement[]>;
  add(orgId: string, memberId: string, input: MeasurementInput): Promise<Measurement>;
}

/** Materializa una medida completa (todos los campos a null si faltan). */
export function materializeMeasurement(
  id: string,
  memberId: string,
  input: MeasurementInput,
  createdAt: Date,
): Measurement {
  return {
    id,
    memberId,
    date: input.date,
    weightKg: input.weightKg ?? null,
    heightCm: input.heightCm ?? null,
    bodyFatPct: input.bodyFatPct ?? null,
    muscleKg: input.muscleKg ?? null,
    neckCm: input.neckCm ?? null,
    chestCm: input.chestCm ?? null,
    waistCm: input.waistCm ?? null,
    hipCm: input.hipCm ?? null,
    armCm: input.armCm ?? null,
    thighCm: input.thighCm ?? null,
    calfCm: input.calfCm ?? null,
    notes: input.notes ?? null,
    createdAt,
  };
}

/** Índice de Masa Corporal (kg/m²). Null si falta peso o altura. */
export function computeBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Clasificación del IMC (OMS) para etiqueta en UI. */
export function bmiCategory(bmi: number | null): string {
  if (bmi == null) return '—';
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidad';
}
