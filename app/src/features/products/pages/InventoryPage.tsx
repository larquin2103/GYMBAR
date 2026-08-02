import { useMemo, useState } from 'react';
import { Boxes, AlertTriangle, PackagePlus, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { formatMoney, money } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Stat } from '@/shared/ui/Stat';
import { Card, CardBody } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';
import { isLowStock, type Product, type StockMovementType } from '@/domain/product/product.entity';
import { useProducts, useInventoryMovements } from '../api/useProducts';
import { AdjustStockSheet } from '../components/AdjustStockSheet';

const MOVE_LABEL: Record<StockMovementType, string> = {
  restock: 'Entrada',
  sale: 'Venta',
  adjustment: 'Ajuste',
};

export default function InventoryPage() {
  const { data: products, isLoading } = useProducts();
  const { data: movements } = useInventoryMovements(60);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const stats = useMemo(() => {
    const list = products ?? [];
    const lowCount = list.filter((p) => isLowStock(p)).length;
    const currency = list[0]?.currency ?? 'CUP';
    // Valor del inventario a costo (o precio si no hay costo).
    const valueCents = list.reduce((s, p) => s + (p.costCents ?? p.priceCents) * p.stock, 0);
    const units = list.reduce((s, p) => s + p.stock, 0);
    return { count: list.length, lowCount, valueCents, units, currency };
  }, [products]);

  return (
    <div>
      <PageHeader title="Inventario" description="Control de stock y movimientos" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Productos" value={stats.count} icon={Boxes} loading={isLoading} />
        <Stat label="Unidades en stock" value={stats.units} icon={PackagePlus} loading={isLoading} />
        <Stat
          label="Stock bajo"
          value={stats.lowCount}
          icon={AlertTriangle}
          tone={stats.lowCount > 0 ? 'expired' : 'default'}
          loading={isLoading}
        />
        <Stat
          label="Valor de inventario"
          value={formatMoney(money(stats.valueCents, stats.currency))}
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Stock por producto */}
        <Card className="lg:col-span-3">
          <CardBody className="p-0">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold text-content">
              Stock por producto
            </div>
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (products?.length ?? 0) === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Boxes}
                  title="Sin productos"
                  description="Agrega productos desde la sección Productos."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {(products ?? []).map((p) => {
                      const low = isLowStock(p);
                      return (
                        <tr key={p.id} className="hover:bg-surface/40">
                          <td className="px-4 py-3">
                            <div className="font-medium text-content">{p.name}</div>
                            <div className="text-xs text-content-muted">{p.category}</div>
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
                            <div className="text-xs text-content-muted">mín. {p.lowStockThreshold}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="secondary" size="sm" onClick={() => setAdjusting(p)}>
                              <ArrowUpDown className="h-4 w-4" /> Ajustar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Movimientos recientes */}
        <Card className="lg:col-span-2">
          <CardBody className="p-0">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold text-content">
              Movimientos recientes
            </div>
            {(movements?.length ?? 0) === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={ArrowUpDown}
                  title="Sin movimientos"
                  description="Las entradas, ventas y ajustes aparecerán aquí."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(movements ?? []).map((m) => {
                  const positive = m.quantityDelta > 0;
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          positive ? 'bg-state-active/12 text-state-active' : 'bg-state-expired/12 text-state-expired',
                        )}
                      >
                        {positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-content">
                          {m.productNameSnapshot}
                        </div>
                        <div className="truncate text-xs text-content-muted">
                          {MOVE_LABEL[m.type]} · {m.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-sm font-semibold tabular', positive ? 'text-state-active' : 'text-state-expired')}>
                          {positive ? '+' : ''}
                          {m.quantityDelta}
                        </div>
                        <div className="text-xs text-content-muted">
                          {m.createdAt.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <AdjustStockSheet open={!!adjusting} onClose={() => setAdjusting(null)} product={adjusting} />
    </div>
  );
}
