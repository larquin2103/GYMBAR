import { useState } from 'react';
import { BadgeCheck, Snowflake, Plus, Pencil } from 'lucide-react';
import { money, formatMoney } from '@gymbar/shared';
import type { Plan } from '@/domain/plan/plan.entity';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';
import { useSession } from '@/shared/session/SessionContext';
import { usePlans } from '../api/useBilling';
import { PlanSheet } from '../components/PlanSheet';

export default function MembershipsPage() {
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const { data: plans, isLoading } = usePlans();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(plan: Plan) {
    setEditing(plan);
    setSheetOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Membresías"
        description="Planes de tu gimnasio. El cobro y la renovación se hacen desde la ficha del cliente."
        action={
          isAdmin && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Nuevo plan
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (plans?.length ?? 0) === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Aún no hay planes"
          description="Crea el primer plan de membresía para poder cobrar."
          action={isAdmin && <Button onClick={openNew}>Crear plan</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => isAdmin && openEdit(p)}
              className={cn(
                'group text-left transition-opacity',
                !isAdmin && 'cursor-default',
                !p.isActive && 'opacity-50',
              )}
            >
              <Card className={cn(isAdmin && 'transition-colors group-hover:border-primary/40')}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!p.isActive && <Badge>Inactivo</Badge>}
                      {p.allowsFreeze && (
                        <Badge className="gap-1">
                          <Snowflake className="h-3 w-3" />
                          Congelable
                        </Badge>
                      )}
                      {isAdmin && (
                        <Pencil className="h-4 w-4 text-content-muted opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 text-base font-semibold text-content">{p.name}</div>
                  <div className="text-sm text-content-muted">{p.durationDays} días de vigencia</div>
                  <div className="mt-3 text-metric tabular text-content">
                    {formatMoney(money(p.priceCents, p.currency))}
                  </div>
                </CardBody>
              </Card>
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <PlanSheet
          key={editing?.id ?? 'new'}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          plan={editing}
        />
      )}
    </div>
  );
}
