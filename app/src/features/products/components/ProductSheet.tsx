import { useState } from 'react';
import type { Product, ProductInput } from '@/domain/product/product.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { useOrgSettings } from '@/features/settings/api/useSettings';
import { useCreateProduct, useUpdateProduct } from '../api/useProducts';

/** Convierte texto en unidades ("80.5") a centavos enteros. */
function toCents(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
const toUnits = (cents: number) => (cents / 100).toString();

export function ProductSheet({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { data: settings } = useOrgSettings();
  const editing = !!product;

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [price, setPrice] = useState(product ? toUnits(product.priceCents) : '');
  const [cost, setCost] = useState(product?.costCents != null ? toUnits(product.costCents) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? 5));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError('Ponle un nombre al producto.');
    const priceCents = toCents(price);
    if (priceCents <= 0) return setError('Ingresa un precio de venta válido.');

    const base = {
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim() || 'General',
      priceCents,
      costCents: cost.trim() ? toCents(cost) : null,
      currency: settings?.currency ?? 'CUP',
      lowStockThreshold: Math.max(0, parseInt(threshold, 10) || 0),
      isActive,
    };
    if (editing && product) {
      // El stock no se edita aquí (se ajusta desde Inventario, con asiento).
      await update.mutateAsync({ id: product.id, input: base });
    } else {
      const input: ProductInput = { ...base, stock: Math.max(0, parseInt(stock, 10) || 0) };
      await create.mutateAsync(input);
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      description="Datos del catálogo del punto de venta"
      footer={
        <div className="flex justify-end">
          <Button onClick={onSubmit} loading={create.isPending || update.isPending}>
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="p-name" required>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU / Código" htmlFor="p-sku">
            <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <Field label="Categoría" htmlFor="p-cat">
            <Input
              id="p-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Bebidas, Suplementos…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de venta" htmlFor="p-price" required hint="En la moneda del gimnasio">
            <Input
              id="p-price"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Costo (opcional)" htmlFor="p-cost" hint="Para calcular margen">
            <Input
              id="p-cost"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!editing && (
            <Field label="Stock inicial" htmlFor="p-stock">
              <Input
                id="p-stock"
                type="number"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          )}
          <Field label="Alerta de stock bajo" htmlFor="p-thr" hint="Avisar al llegar a…">
            <Input
              id="p-thr"
              type="number"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Producto activo (disponible para la venta)
        </label>

        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
