import { BadgeCheck, Snowflake } from 'lucide-react';
import { money, formatMoney } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { usePlans } from '../api/useBilling';

export default function MembershipsPage() {
  const { data: plans, isLoading } = usePlans();

  return (
    <div>
      <PageHeader
        title="Membresías"
        description="Planes disponibles. El cobro y la renovación se hacen desde la ficha del cliente."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  {p.allowsFreeze && (
                    <Badge className="gap-1">
                      <Snowflake className="h-3 w-3" />
                      Congelable
                    </Badge>
                  )}
                </div>
                <div className="mt-4 text-base font-semibold text-content">{p.name}</div>
                <div className="text-sm text-content-muted">{p.durationDays} días de vigencia</div>
                <div className="mt-3 text-metric tabular text-content">
                  {formatMoney(money(p.priceCents, p.currency))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
