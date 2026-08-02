import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, Package, AlertTriangle, Pencil, Search } from 'lucide-react';
import { formatMoney, money } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card, CardBody } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { isLowStock, unitMarginCents, type Product } from '@/domain/product/product.entity';
import { useProducts } from '../api/useProducts';
import { ProductSheet } from '../components/ProductSheet';
import { PosSheet } from '../components/PosSheet';

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term),
    );
  }, [products, search]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setSheetOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo y punto de venta"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
            <Button onClick={() => setPosOpen(true)}>
              <ShoppingCart className="h-4 w-4" /> Vender
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (products?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin productos"
          description="Crea el primer producto de tu catálogo."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-content-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="pl-9"
            />
          </div>

          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-content-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Categoría</th>
                      <th className="px-4 py-3 text-right font-medium">Precio</th>
                      <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Margen</th>
                      <th className="px-4 py-3 text-right font-medium">Stock</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {list.map((p) => {
                      const low = isLowStock(p);
                      const margin = unitMarginCents(p);
                      return (
                        <tr key={p.id} className={cn('hover:bg-surface/40', !p.isActive && 'opacity-50')}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-content">{p.name}</div>
                            <div className="text-xs text-content-muted">{p.sku || '—'}</div>
                          </td>
                          <td className="hidden px-4 py-3 text-content-muted sm:table-cell">
                            {p.category}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular text-content">
                            {formatMoney(money(p.priceCents, p.currency))}
                          </td>
                          <td className="hidden px-4 py-3 text-right tabular text-content-muted md:table-cell">
                            {margin != null ? formatMoney(money(margin, p.currency)) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 font-medium tabular',
                                low ? 'text-state-expired' : 'text-content',
                              )}
                            >
                              {low && <AlertTriangle className="h-3.5 w-3.5" />}
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <ProductSheet open={sheetOpen} onClose={() => setSheetOpen(false)} product={editing} />
      <PosSheet open={posOpen} onClose={() => setPosOpen(false)} />
    </div>
  );
}
