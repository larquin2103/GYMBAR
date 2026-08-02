import { useMemo, useState } from 'react';
import { Plus, Minus, Search, Trash2, ShoppingCart } from 'lucide-react';
import { formatMoney, money, PaymentMethod, type PaymentMethod as PaymentMethodType } from '@gymbar/shared';
import type { Product } from '@/domain/product/product.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useProducts, useRegisterSale } from '../api/useProducts';

const METHOD_LABEL: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

export function PosSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products } = useProducts();
  const sell = useRegisterSale();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<PaymentMethodType>('cash');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? [])
      .filter((p) => p.isActive && p.stock > 0)
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  }, [products, search]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is { product: Product; qty: number } => !!l.product);
  const totalCents = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0);
  const currency = lines[0]?.product.currency ?? products?.[0]?.currency ?? 'CUP';

  function add(p: Product) {
    setError(null);
    setDone(null);
    setCart((prev) => {
      const next = (prev[p.id] ?? 0) + 1;
      if (next > p.stock) return prev;
      return { ...prev, [p.id]: next };
    });
  }
  function setQty(p: Product, qty: number) {
    setCart((prev) => {
      const clamped = Math.max(0, Math.min(qty, p.stock));
      const next = { ...prev };
      if (clamped === 0) delete next[p.id];
      else next[p.id] = clamped;
      return next;
    });
  }

  async function onConfirm() {
    setError(null);
    if (lines.length === 0) return setError('Agrega productos a la venta.');
    try {
      await sell.mutateAsync({
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        method,
      });
      setDone(`Venta registrada · ${formatMoney(money(totalCents, currency))}`);
      setCart({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta.');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Punto de venta"
      description="Vende productos y descuenta inventario"
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-muted">Total</span>
            <span className="text-lg font-semibold tabular text-content">
              {formatMoney(money(totalCents, currency))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
              className="h-10 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-content"
            >
              {PaymentMethod.options.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            <Button onClick={onConfirm} loading={sell.isPending} disabled={lines.length === 0}>
              Cobrar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Carrito */}
        {lines.length > 0 && (
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-content-muted">
              Carrito ({lines.reduce((s, l) => s + l.qty, 0)})
            </div>
            <ul className="divide-y divide-border">
              {lines.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-content">{product.name}</div>
                    <div className="text-xs text-content-muted">
                      {formatMoney(money(product.priceCents, product.currency))} c/u
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(product, qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-content-muted hover:bg-surface"
                      aria-label="Menos"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm tabular text-content">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(product, qty + 1)}
                      disabled={qty >= product.stock}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-content-muted hover:bg-surface disabled:opacity-40"
                      aria-label="Más"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-medium tabular text-content">
                    {formatMoney(money(product.priceCents * qty, product.currency))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQty(product, 0)}
                    className="text-content-muted hover:text-state-expired"
                    aria-label="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {done && (
          <p className="rounded-md bg-state-active/10 px-3 py-2 text-sm text-state-active">{done}</p>
        )}
        {error && (
          <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
            {error}
          </p>
        )}

        {/* Buscador + productos disponibles */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-content-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {available.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-content-muted">
              <ShoppingCart className="h-6 w-6" />
              Sin productos disponibles.
            </div>
          ) : (
            available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
                className={cn(
                  'flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-surface',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-content">{p.name}</div>
                  <div className="text-xs text-content-muted">
                    {p.category} · {p.stock} en stock
                  </div>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold tabular text-content">
                  {formatMoney(money(p.priceCents, p.currency))}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Sheet>
  );
}
