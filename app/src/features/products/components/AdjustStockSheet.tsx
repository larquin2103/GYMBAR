import { useState } from 'react';
import type { Product, StockMovementType } from '@/domain/product/product.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useAdjustStock } from '../api/useProducts';

type Mode = 'in' | 'out';

export function AdjustStockSheet({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const adjust = useAdjustStock();
  const [mode, setMode] = useState<Mode>('in');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const quantity = Math.max(0, parseInt(qty, 10) || 0);
  const delta = mode === 'in' ? quantity : -quantity;
  const nextStock = product.stock + delta;

  async function onSubmit() {
    setError(null);
    if (!product) return;
    if (quantity <= 0) return setError('Ingresa una cantidad válida.');
    if (nextStock < 0) return setError('El ajuste dejaría el stock en negativo.');
    const type: StockMovementType = mode === 'in' ? 'restock' : 'adjustment';
    try {
      await adjust.mutateAsync({
        productId: product.id,
        delta,
        type,
        reason: reason.trim() || (mode === 'in' ? 'Entrada de mercancía' : 'Ajuste de inventario'),
      });
      onClose();
      setQty('1');
      setReason('');
      setMode('in');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ajustar el stock.');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajustar inventario"
      description={product.name}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-content-muted">
            Stock: <span className="font-semibold text-content">{product.stock}</span> →{' '}
            <span className={cn('font-semibold', nextStock < 0 ? 'text-state-expired' : 'text-content')}>
              {nextStock}
            </span>
          </span>
          <Button onClick={onSubmit} loading={adjust.isPending}>
            Aplicar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('in')}
            className={cn(
              'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              mode === 'in'
                ? 'border-primary/40 bg-primary-soft text-primary'
                : 'border-border text-content-muted hover:text-content',
            )}
          >
            Entrada (+)
          </button>
          <button
            type="button"
            onClick={() => setMode('out')}
            className={cn(
              'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              mode === 'out'
                ? 'border-primary/40 bg-primary-soft text-primary'
                : 'border-border text-content-muted hover:text-content',
            )}
          >
            Salida / merma (−)
          </button>
        </div>

        <Field label="Cantidad" htmlFor="a-qty" required>
          <Input
            id="a-qty"
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>

        <Field label="Motivo" htmlFor="a-reason" hint="Compra, conteo, merma, corrección…">
          <Input
            id="a-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === 'in' ? 'Entrada de mercancía' : 'Ajuste de inventario'}
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
