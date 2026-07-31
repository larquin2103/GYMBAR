import { Users, UserX, TrendingUp, CalendarClock, ScanLine, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Stat } from '@/shared/ui/Stat';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useSession } from '@/shared/session/SessionContext';

/**
 * Dashboard de indicadores accionables (ver docs · Dashboard). En Fase 2 los
 * valores vendrán de los contadores precomputados (counters/*); aquí se muestran
 * placeholders con skeleton desactivado para ilustrar la jerarquía visual.
 */
export default function DashboardPage() {
  const { organizationName } = useSession();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Resumen operativo de ${organizationName}`}
        action={<Badge>Datos de ejemplo · Fase 2</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Clientes activos" value="—" icon={Users} tone="active" />
        <Stat label="Vencidos" value="—" icon={UserX} tone="expired" />
        <Stat label="Ingresos hoy" value="—" icon={TrendingUp} />
        <Stat label="Ingresos del mes" value="—" icon={TrendingUp} />
        <Stat label="Entradas hoy" value="—" icon={ScanLine} />
        <Stat label="Renovaciones" value="—" icon={RefreshCw} tone="pending" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center gap-2 text-sm font-semibold text-content">
              <CalendarClock className="h-4 w-4 text-content-muted" />
              Asistencia semanal
            </div>
            <div className="mt-6 flex h-40 gap-3">
              {[40, 65, 52, 78, 90, 60, 30].map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${h}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="text-xs text-content-muted">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
                  </span>
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
                <Badge>—</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>Pagos pendientes</span>
                <Badge>—</Badge>
              </li>
              <li className="flex items-center justify-between">
                <span>Caja del día</span>
                <Badge>Sin abrir</Badge>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
