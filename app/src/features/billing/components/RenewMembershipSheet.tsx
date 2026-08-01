import { useState } from 'react';
import { Check, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { money, formatMoney, type PaymentMethod } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';
import { usePlans, useRenewMembership } from '../api/useBilling';

const METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
];

export function RenewMembershipSheet({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: Member;
}) {
  const { data: allPlans, isLoading } = usePlans();
  const plans = allPlans?.filter((p) => p.isActive);
  const renew = useRenewMembership();
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');

  const selectedPlan = plans?.find((p) => p.id === planId) ?? null;

  async function onConfirm() {
    if (!planId) return;
    await renew.mutateAsync({ memberId: member.id, planId, method });
    setPlanId(null);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cobrar membresía"
      description={`${member.firstName} ${member.lastName}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-content-muted">
            {selectedPlan
              ? formatMoney(money(selectedPlan.priceCents, selectedPlan.currency))
              : 'Selecciona un plan'}
          </span>
          <Button onClick={onConfirm} loading={renew.isPending} disabled={!planId}>
            <Check className="h-4 w-4" />
            Cobrar y renovar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-sm font-medium text-content">Plan</div>
          {isLoading ? (
            <div className="text-sm text-content-muted">Cargando planes…</div>
          ) : (
            <div className="space-y-2">
              {plans?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors',
                    planId === p.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-content">{p.name}</div>
                    <div className="text-xs text-content-muted">{p.durationDays} días</div>
                  </div>
                  <div className="tabular text-sm font-semibold text-content">
                    {formatMoney(money(p.priceCents, p.currency))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-content">Método de pago</div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-xs font-medium transition-colors',
                  method === m.value
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border text-content-muted hover:text-content',
                )}
              >
                <m.icon className="h-5 w-5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
