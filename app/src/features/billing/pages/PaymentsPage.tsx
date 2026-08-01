import { CreditCard, Banknote, ArrowLeftRight, MoreHorizontal } from 'lucide-react';
import { money, formatMoney, type PaymentMethod } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useRecentPayments } from '../api/useBilling';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};
const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
  other: MoreHorizontal,
};

export default function PaymentsPage() {
  const { data: payments, isLoading } = useRecentPayments();

  return (
    <div>
      <PageHeader title="Pagos" description="Historial de cobros registrados" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (payments?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin pagos aún"
          description="Los cobros aparecerán aquí. Puedes cobrar desde la ficha de un cliente."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Método</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Recibo</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments!.map((p) => {
                const Icon = METHOD_ICON[p.method];
                return (
                  <tr key={p.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 font-medium text-content">{p.memberNameSnapshot}</td>
                    <td className="hidden px-4 py-3 text-content-muted sm:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-4 w-4" />
                        {METHOD_LABEL[p.method]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-content-muted md:table-cell tabular">
                      {p.receiptNumber}
                    </td>
                    <td className="px-4 py-3 text-content-muted tabular">
                      {p.createdAt.toLocaleDateString('es', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right tabular font-semibold text-content">
                      {formatMoney(money(p.amountCents, p.currency))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
