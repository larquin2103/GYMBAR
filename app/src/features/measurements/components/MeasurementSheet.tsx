import { useState } from 'react';
import {
  computeBMI,
  bmiCategory,
  type MeasurementInput,
} from '@/domain/measurement/measurement.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { useAddMeasurement } from '../api/useMeasurements';

const num = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Campo numérico compacto para una medida. */
function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <Field label={suffix ? `${label} (${suffix})` : label} htmlFor={`m-${label}`}>
      <Input
        id={`m-${label}`}
        type="number"
        step="0.1"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

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
  const [f, setF] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));
  const bmi = computeBMI(num(f.weight ?? ''), num(f.height ?? ''));

  async function onSubmit() {
    setError(null);
    const input: MeasurementInput = {
      date: new Date(`${date}T12:00:00`),
      weightKg: num(f.weight ?? ''),
      heightCm: num(f.height ?? ''),
      bodyFatPct: num(f.fat ?? ''),
      muscleKg: num(f.muscle ?? ''),
      neckCm: num(f.neck ?? ''),
      chestCm: num(f.chest ?? ''),
      waistCm: num(f.waist ?? ''),
      hipCm: num(f.hip ?? ''),
      armCm: num(f.arm ?? ''),
      thighCm: num(f.thigh ?? ''),
      calfCm: num(f.calf ?? ''),
      notes: notes.trim() || null,
    };
    const hasAny = Object.entries(input).some(
      ([k, v]) => k !== 'date' && k !== 'notes' && v != null,
    );
    if (!hasAny) return setError('Ingresa al menos una medida.');
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-content-muted">
            {bmi != null ? (
              <>
                IMC <span className="font-semibold text-content">{bmi}</span> · {bmiCategory(bmi)}
              </>
            ) : (
              'IMC: ingresa peso y altura'
            )}
          </span>
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

        <div>
          <div className="mb-2 text-sm font-medium text-content">Composición corporal</div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Peso" suffix="kg" value={f.weight ?? ''} onChange={set('weight')} />
            <NumField label="Altura" suffix="cm" value={f.height ?? ''} onChange={set('height')} />
            <NumField label="Grasa" suffix="%" value={f.fat ?? ''} onChange={set('fat')} />
            <NumField label="Músculo" suffix="kg" value={f.muscle ?? ''} onChange={set('muscle')} />
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-content">Perímetros (cm)</div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Cuello" value={f.neck ?? ''} onChange={set('neck')} />
            <NumField label="Pecho" value={f.chest ?? ''} onChange={set('chest')} />
            <NumField label="Cintura" value={f.waist ?? ''} onChange={set('waist')} />
            <NumField label="Cadera" value={f.hip ?? ''} onChange={set('hip')} />
            <NumField label="Brazo" value={f.arm ?? ''} onChange={set('arm')} />
            <NumField label="Muslo" value={f.thigh ?? ''} onChange={set('thigh')} />
            <NumField label="Pantorrilla" value={f.calf ?? ''} onChange={set('calf')} />
          </div>
        </div>

        <Field label="Notas" htmlFor="m-notes">
          <Textarea
            id="m-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones de la medición…"
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
