import { useState } from 'react';
import type { PlanType } from '@gymbar/shared';
import type { Plan, PlanInput } from '@/domain/plan/plan.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useOrgSettings } from '@/features/settings/api/useSettings';
import { usePlanMutations } from '../api/useBilling';

/** Etiqueta corta de la moneda (CUP se muestra como MN, convención local). */
const currencyLabel = (code: string) => (code === 'CUP' ? 'MN' : code);

const TYPES: { value: PlanType; label: string; days: number }[] = [
  { value: 'daily', label: 'Diario', days: 1 },
  { value: 'weekly', label: 'Semanal', days: 7 },
  { value: 'biweekly', label: 'Quincenal', days: 15 },
  { value: 'monthly', label: 'Mensual', days: 30 },
  { value: 'annual', label: 'Anual', days: 365 },
  { value: 'promo', label: 'Promoción', days: 30 },
];

export function PlanSheet({
  open,
  onClose,
  plan,
}: {
  open: boolean;
  onClose: () => void;
  plan?: Plan | null;
}) {
  const isEdit = !!plan;
  const { create, update } = usePlanMutations();
  const { data: settings } = useOrgSettings();
  // Al crear, la moneda por defecto es la de Configuración; al editar se
  // conserva la del plan (los importes ya cobrados guardan su moneda).
  const currency = plan?.currency ?? settings?.currency ?? 'CUP';

  const [name, setName] = useState(plan?.name ?? '');
  const [type, setType] = useState<PlanType>(plan?.type ?? 'monthly');
  const [price, setPrice] = useState(plan ? String(plan.priceCents / 100) : '');
  const [days, setDays] = useState(plan ? String(plan.durationDays) : '30');
  const [allowsFreeze, setAllowsFreeze] = useState(plan?.allowsFreeze ?? false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending;

  function pickType(t: (typeof TYPES)[number]) {
    setType(t.value);
    if (!isEdit) setDays(String(t.days)); // sugiere duración típica en alta
  }

  async function onSubmit() {
    setError(null);
    const priceCents = Math.round(parseFloat(price || '0') * 100);
    const durationDays = parseInt(days || '0', 10);
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (!(priceCents >= 0)) return setError('Precio inválido.');
    if (!(durationDays > 0)) return setError('La duración debe ser mayor a 0.');

    const input: PlanInput = {
      name: name.trim(),
      type,
      priceCents,
      currency,
      durationDays,
      allowsFreeze,
      isActive,
    };
    if (isEdit && plan) await update.mutateAsync({ id: plan.id, input });
    else await create.mutateAsync(input);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar plan' : 'Nuevo plan'}
      description={isEdit ? plan!.name : 'Define un plan de membresía'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={busy}>
            {isEdit ? 'Guardar' : 'Crear plan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nombre" htmlFor="plan-name" required>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mensual, Estudiante, Promo verano"
          />
        </Field>

        <div>
          <div className="mb-2 text-sm font-medium text-content">Tipo</div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => pickType(t)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  type === t.value
                    ? 'bg-primary text-primary-contrast'
                    : 'bg-surface text-content-muted hover:text-content',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Precio (${currencyLabel(currency)})`} htmlFor="plan-price" required>
            <Input
              id="plan-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="700"
            />
          </Field>
          <Field label="Duración (días)" htmlFor="plan-days" required>
            <Input
              id="plan-days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <ToggleRow label="Permite congelamiento" value={allowsFreeze} onChange={setAllowsFreeze} />
          <ToggleRow label="Plan activo (visible para cobrar)" value={isActive} onChange={setIsActive} />
        </div>

        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
    >
      <span className="text-content">{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          value ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            value ? 'left-0.5 translate-x-4' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
