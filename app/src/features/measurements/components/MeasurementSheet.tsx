import { useState } from 'react';
import type { MeasurementInput } from '@/domain/measurement/measurement.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { useAddMeasurement } from '../api/useMeasurements';

const num = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function MeasurementSheet({
  open,
  onClose,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
}) {
  const add = useAddMeasurement(memberId);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const input: MeasurementInput = {
      date: new Date(`${date}T12:00:00`),
      weightKg: num(weight),
      bodyFatPct: num(bodyFat),
      muscleKg: num(muscle),
      waistCm: num(waist),
      armCm: num(arm),
      notes: notes.trim() || null,
    };
    if (
      input.weightKg == null &&
      input.bodyFatPct == null &&
      input.muscleKg == null &&
      input.waistCm == null &&
      input.armCm == null
    ) {
      return setError('Ingresa al menos una medida.');
    }
    await add.mutateAsync(input);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar medida"
      description="Toma las medidas del cliente para seguir su evolución"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={add.isPending}>
            Guardar medida
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Fecha" htmlFor="m-date" required>
          <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)" htmlFor="m-weight">
            <Input id="m-weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Grasa corporal (%)" htmlFor="m-fat">
            <Input id="m-fat" type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </Field>
          <Field label="Masa muscular (kg)" htmlFor="m-muscle">
            <Input id="m-muscle" type="number" step="0.1" value={muscle} onChange={(e) => setMuscle(e.target.value)} />
          </Field>
          <Field label="Cintura (cm)" htmlFor="m-waist">
            <Input id="m-waist" type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} />
          </Field>
          <Field label="Brazo (cm)" htmlFor="m-arm">
            <Input id="m-arm" type="number" step="0.1" value={arm} onChange={(e) => setArm(e.target.value)} />
          </Field>
        </div>

        <Field label="Notas" htmlFor="m-notes">
          <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones de la medición…" />
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
