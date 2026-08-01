import { useMemo } from 'react';
import { CalendarCheck, CalendarDays, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Stat } from '@/shared/ui/Stat';
import { Card, CardBody } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';
import { addDays, startOfDay } from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';
import { useAttendanceRange } from '../api/useAttendance';

const RESULT_LABEL: Record<string, string> = {
  allowed: 'Permitido',
  expired: 'Vencido',
  pending_payment: 'Pago pendiente',
  denied: 'Denegado',
};
const SOURCE_LABEL: Record<string, string> = {
  search: 'Mostrador',
  kiosk: 'Autoservicio',
  qr: 'QR',
  code: 'Código',
  phone: 'Teléfono',
};

export default function AttendancePage() {
  const { data: checkins, isLoading } = useAttendanceRange(30);

  const stats = useMemo(() => {
    const list = checkins ?? [];
    const today = startOfDay(new Date());
    const todayKey = dateKeyOf(today);
    const weekFrom = dateKeyOf(addDays(today, -6));

    const todayCount = list.filter((c) => c.dateKey === todayKey).length;
    const weekCount = list.filter((c) => c.dateKey >= weekFrom).length;
    const monthCount = list.length;

    // Barras de los últimos 14 días.
    const bars: { key: string; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = addDays(today, -i);
      const key = dateKeyOf(day);
      bars.push({
        key,
        label: day.toLocaleDateString('es', { day: '2-digit' }),
        count: list.filter((c) => c.dateKey === key).length,
      });
    }
    const max = Math.max(1, ...bars.map((b) => b.count));
    return { todayCount, weekCount, monthCount, bars, max };
  }, [checkins]);

  return (
    <div>
      <PageHeader title="Asistencia" description="Historial y estadística de entradas" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Entradas hoy" value={stats.todayCount} icon={CalendarCheck} loading={isLoading} />
        <Stat label="Últimos 7 días" value={stats.weekCount} icon={CalendarDays} loading={isLoading} />
        <Stat label="Últimos 30 días" value={stats.monthCount} icon={TrendingUp} loading={isLoading} />
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="text-sm font-semibold text-content">Entradas por día (últimas 2 semanas)</div>
          {isLoading ? (
            <Skeleton className="mt-4 h-40" />
          ) : (
            <div className="mt-6 flex h-40 gap-2">
              {stats.bars.map((b) => (
                <div key={b.key} className="flex h-full flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${(b.count / stats.max) * 100}%` }}
                      title={`${b.count} entradas`}
                    />
                  </div>
                  <span className="text-[10px] text-content-muted">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-content">Historial reciente</div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (checkins?.length ?? 0) === 0 ? (
          <EmptyState icon={CalendarCheck} title="Sin entradas" description="Aún no hay registros de asistencia." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-content-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Origen</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(checkins ?? []).slice(0, 40).map((c) => (
                  <tr key={c.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3 font-medium text-content">{c.memberNameSnapshot}</td>
                    <td className="hidden px-4 py-3 text-content-muted sm:table-cell">
                      {SOURCE_LABEL[c.source] ?? c.source}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          c.result === 'allowed'
                            ? 'text-state-active'
                            : c.result === 'denied'
                              ? 'text-state-blocked'
                              : 'text-state-pending',
                        )}
                      >
                        {RESULT_LABEL[c.result] ?? c.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular text-content-muted">
                      {c.createdAt.toLocaleDateString('es', { day: '2-digit', month: 'short' })}{' '}
                      {c.createdAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
