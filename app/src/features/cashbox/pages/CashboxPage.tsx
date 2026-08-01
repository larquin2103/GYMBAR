import { useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock } from 'lucide-react';
import { money, formatMoney } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';
import { useOpenSession, useSessionMovements, useCashMutations } from '../api/useCashbox';

const CURRENCY = 'CUP';
const toCents = (v: string) => Math.round(parseFloat(v || '0') * 100);
const fmt = (cents: number) => formatMoney(money(cents, CURRENCY));

export default function CashboxPage() {
  const { data: session, isLoading } = useOpenSession();
  const { data: movements } = useSessionMovements(session?.id);
  const { open, addMovement, close } = useCashMutations();

  const [floatValue, setFloatValue] = useState('0');
  const [movType, setMovType] = useState<'income' | 'expense'>('expense');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');
  const [counted, setCounted] = useState('');

  const income =
    (movements ?? []).filter((m) => m.type === 'income').reduce((s, m) => s + m.amountCents, 0) ??
    0;
  const expense =
    (movements ?? []).filter((m) => m.type === 'expense').reduce((s, m) => s + m.amountCents, 0) ??
    0;
  const expected = (session?.openingFloatCents ?? 0) + income - expense;

  if (isLoading) return <div className="text-sm text-content-muted">Cargando caja…</div>;

  if (!session) {
    return (
      <div>
        <PageHeader title="Caja" description="Abre la caja para comenzar el turno" />
        <Card className="mx-auto max-w-md">
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-content">
              <Wallet className="h-4 w-4 text-content-muted" />
              Abrir caja
            </div>
            <Field label="Fondo inicial" htmlFor="float" hint="Efectivo con el que abres el turno.">
              <Input
                id="float"
                type="number"
                min="0"
                step="0.01"
                value={floatValue}
                onChange={(e) => setFloatValue(e.target.value)}
              />
            </Field>
            <Button
              className="mt-4 w-full"
              loading={open.isPending}
              onClick={() =>
                open.mutate({ openingFloatCents: toCents(floatValue), currency: CURRENCY })
              }
            >
              Abrir caja
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Caja"
        description={`Turno abierto a las ${session.openedAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Fondo inicial" value={fmt(session.openingFloatCents)} />
            <MiniStat label="Ingresos" value={fmt(income)} tone="active" />
            <MiniStat label="Egresos" value={fmt(expense)} tone="expired" />
            <MiniStat label="Esperado" value={fmt(expected)} />
          </div>

          <Card>
            <CardBody>
              <div className="text-sm font-semibold text-content">Movimientos</div>
              <ul className="mt-4 divide-y divide-border">
                {(movements ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2 text-content">
                      {m.type === 'income' ? (
                        <ArrowDownCircle className="h-4 w-4 text-state-active" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-state-expired" />
                      )}
                      {m.reason}
                    </span>
                    <span
                      className={cn(
                        'tabular font-medium',
                        m.type === 'income' ? 'text-state-active' : 'text-state-expired',
                      )}
                    >
                      {m.type === 'income' ? '+' : '−'}
                      {fmt(m.amountCents)}
                    </span>
                  </li>
                ))}
                {(movements?.length ?? 0) === 0 && (
                  <li className="py-6">
                    <EmptyState
                      icon={Wallet}
                      title="Sin movimientos"
                      description="Registra un ingreso o egreso, o cobra desde un cliente."
                    />
                  </li>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-semibold text-content">Registrar movimiento</div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMovType(t)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      movType === t
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border text-content-muted',
                    )}
                  >
                    {t === 'income' ? 'Ingreso' : 'Egreso'}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Monto"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                />
                <Input
                  placeholder="Concepto"
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                />
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={addMovement.isPending}
                  disabled={!movAmount || !movReason}
                  onClick={() =>
                    addMovement.mutate(
                      { type: movType, amountCents: toCents(movAmount), reason: movReason },
                      {
                        onSuccess: () => {
                          setMovAmount('');
                          setMovReason('');
                        },
                      },
                    )
                  }
                >
                  Agregar
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-content">
                <Lock className="h-4 w-4 text-content-muted" />
                Cerrar caja
              </div>
              <Field label="Efectivo contado" htmlFor="counted">
                <Input
                  id="counted"
                  type="number"
                  min="0"
                  step="0.01"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                />
              </Field>
              {counted !== '' && (
                <div className="mt-2 text-sm">
                  Diferencia:{' '}
                  <span
                    className={cn(
                      'tabular font-semibold',
                      toCents(counted) - expected === 0
                        ? 'text-state-active'
                        : 'text-state-expired',
                    )}
                  >
                    {fmt(toCents(counted) - expected)}
                  </span>
                </div>
              )}
              <Button
                variant="danger"
                className="mt-4 w-full"
                loading={close.isPending}
                disabled={counted === ''}
                onClick={() => close.mutate({ countedCents: toCents(counted) })}
              >
                Cerrar turno
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'active' | 'expired';
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="text-xs text-content-muted">{label}</div>
      <div
        className={cn(
          'mt-1 tabular text-lg font-semibold',
          tone === 'active'
            ? 'text-state-active'
            : tone === 'expired'
              ? 'text-state-expired'
              : 'text-content',
        )}
      >
        {value}
      </div>
    </div>
  );
}
