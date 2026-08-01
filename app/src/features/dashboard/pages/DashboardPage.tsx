import { Users, UserX, TrendingUp, CalendarClock, ScanLine, RefreshCw } from 'lucide-react';
import { money, formatMoney } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Stat } from '@/shared/ui/Stat';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useSession } from '@/shared/session/SessionContext';
import { useDashboardStats } from '../api/useDashboardStats';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function DashboardPage() {
  const { organizationName } = useSession();
  const { data, isLoading } = useDashboardStats();
  const currency = data?.currency ?? 'CUP';
  const fmt = (cents: number) => formatMoney(money(cents, currency));
  const maxWeekly = Math.max(1, ...(data?.weeklyAttendance ?? [1]));

  return (
    <div>
      <PageHeader title="Dashboard" description={`Resumen operativo de ${organizationName}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Clientes activos"
          value={data?.activeMembers ?? 0}
          icon={Users}
          tone="active"
          loading={isLoading}
        />
        <Stat
          label="Vencidos"
          value={data?.expiredMembers ?? 0}
          icon={UserX}
          tone="expired"
          loading={isLoading}
        />
        <Stat
          label="Ingresos hoy"
          value={fmt(data?.incomeTodayCents ?? 0)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <Stat
          label="Ingresos del mes"
          value={fmt(data?.incomeMonthCents ?? 0)}
          icon={TrendingUp}
          loading={isLoading}
        />
        <Stat
          label="Entradas hoy"
          value={data?.checkinsToday ?? 0}
          icon={ScanLine}
          loading={isLoading}
        />
        <Stat
          label="Renovaciones"
          value={data?.pendingRenewals ?? 0}
          icon={RefreshCw}
          tone="pending"
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center gap-2 text-sm font-semibold text-content">
              <CalendarClock className="h-4 w-4 text-content-muted" />
              Asistencia semanal
            </div>
            <div className="mt-6 flex h-40 gap-3">
              {(data?.weeklyAttendance ?? new Array(7).fill(0)).map((v, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${(v / maxWeekly) * 100}%` }}
                      title={`${v} entradas`}
                      aria-hidden
                    />
                  </div>
                  <span className="text-xs text-content-muted">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-sm font-semibold text-content">Próximas acciones</div>
            <ul className="mt-4 space-y-3 text-sm text-content-muted">
              <li className="flex items-center justify-between">
                <span>Renovaciones por vencer</span>
                <Badge>{data?.pendingRenewals ?? 0}</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>Clientes vencidos</span>
                <Badge>{data?.expiredMembers ?? 0}</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>Entradas registradas hoy</span>
                <Badge>{data?.checkinsToday ?? 0}</Badge>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
