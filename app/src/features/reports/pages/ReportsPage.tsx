import { useMemo, useState } from 'react';
import { Download, Printer, FileText } from 'lucide-react';
import { formatMoney, money, MEMBER_GOAL_LABELS, type MemberStatus } from '@gymbar/shared';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Stat } from '@/shared/ui/Stat';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatusBadge } from '@/shared/ui/Badge';
import { cn } from '@/shared/lib/cn';
import { addDays, startOfDay } from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';
import { useOrgSettings } from '@/features/settings/api/useSettings';
import {
  useIncomeReport,
  useAttendanceReport,
  useExpiringReport,
  useRosterReport,
} from '../api/useReports';
import { downloadCsv, printReport } from '../lib/export';

type ReportKind = 'income' | 'attendance' | 'expiring' | 'roster';

const REPORTS: { kind: ReportKind; label: string }[] = [
  { kind: 'income', label: 'Ingresos' },
  { kind: 'attendance', label: 'Asistencia' },
  { kind: 'expiring', label: 'Vencimientos' },
  { kind: 'roster', label: 'Padrón de clientes' },
];

const PERIODS = [
  { id: '7', label: 'Últimos 7 días', days: 7 },
  { id: '30', label: 'Últimos 30 días', days: 30 },
  { id: '90', label: 'Últimos 90 días', days: 90 },
] as const;

const WITHIN = [
  { id: '7', label: 'Próximos 7 días', days: 7 },
  { id: '15', label: 'Próximos 15 días', days: 15 },
  { id: '30', label: 'Próximos 30 días', days: 30 },
] as const;

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Activo',
  expired: 'Vencido',
  pending: 'Pendiente',
  frozen: 'Congelado',
  cancelled: 'Cancelado',
};
const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};
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

const fmtDate = (d: Date) => d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (d: Date) =>
  `${d.toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;

export default function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>('income');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [withinDays, setWithinDays] = useState<number>(15);
  const { data: settings } = useOrgSettings();
  const currency = settings?.currency ?? 'CUP';

  const range = useMemo(() => {
    const today = startOfDay(new Date());
    return { fromKey: dateKeyOf(addDays(today, -(periodDays - 1))), toKey: dateKeyOf(today) };
  }, [periodDays]);

  const income = useIncomeReport(range.fromKey, range.toKey, kind === 'income');
  const attendance = useAttendanceReport(range.fromKey, range.toKey, kind === 'attendance');
  const expiring = useExpiringReport(withinDays, kind === 'expiring');
  const roster = useRosterReport(kind === 'roster');

  const isLoading =
    (kind === 'income' && income.isLoading) ||
    (kind === 'attendance' && attendance.isLoading) ||
    (kind === 'expiring' && expiring.isLoading) ||
    (kind === 'roster' && roster.isLoading);

  const periodLabel =
    kind === 'expiring'
      ? (WITHIN.find((w) => w.days === withinDays)?.label ?? '')
      : kind === 'roster'
        ? 'Todos los clientes'
        : `${fmtDate(new Date(range.fromKey + 'T00:00:00'))} — ${fmtDate(new Date(range.toKey + 'T00:00:00'))}`;

  // Construye headers + filas de exportación + resumen para el reporte activo.
  const view = useMemo(() => {
    const cur = (cents: number) => formatMoney(money(cents, currency));
    if (kind === 'income') {
      const rows = income.data ?? [];
      const total = rows.reduce((s, p) => s + p.amountCents, 0);
      return {
        headers: ['Fecha', 'Recibo', 'Cliente', 'Método', 'Monto'],
        exportRows: rows.map((p) => [
          fmtDateTime(p.createdAt),
          p.receiptNumber,
          p.memberNameSnapshot,
          METHOD_LABEL[p.method] ?? p.method,
          (p.amountCents / 100).toFixed(2),
        ]),
        stats: [
          { label: 'Cobros', value: String(rows.length) },
          { label: 'Total ingresos', value: cur(total) },
        ],
      };
    }
    if (kind === 'attendance') {
      const rows = attendance.data ?? [];
      const uniqueMembers = new Set(rows.map((c) => c.memberId)).size;
      return {
        headers: ['Fecha', 'Cliente', 'Origen', 'Resultado'],
        exportRows: rows.map((c) => [
          fmtDateTime(c.createdAt),
          c.memberNameSnapshot,
          SOURCE_LABEL[c.source] ?? c.source,
          RESULT_LABEL[c.result] ?? c.result,
        ]),
        stats: [
          { label: 'Entradas', value: String(rows.length) },
          { label: 'Clientes distintos', value: String(uniqueMembers) },
        ],
      };
    }
    if (kind === 'expiring') {
      const rows = expiring.data ?? [];
      const overdue = rows.filter((r) => r.daysLeft < 0).length;
      return {
        headers: ['Cliente', 'Teléfono', 'Plan', 'Vence', 'Días'],
        exportRows: rows.map((r) => [
          r.memberName,
          r.phone ?? '',
          r.planName ?? '',
          fmtDate(r.endDate),
          String(r.daysLeft),
        ]),
        stats: [
          { label: 'Por vencer / vencidos', value: String(rows.length) },
          { label: 'Ya vencidos', value: String(overdue) },
        ],
      };
    }
    const rows = roster.data ?? [];
    const active = rows.filter((r) => r.status === 'active').length;
    return {
      headers: ['Código', 'Cliente', 'Teléfono', 'Estado', 'Objetivo', 'Vence'],
      exportRows: rows.map((r) => [
        r.code,
        r.name,
        r.phone ?? '',
        STATUS_LABEL[r.status],
        r.goal ? MEMBER_GOAL_LABELS[r.goal] : '',
        r.endDate ? fmtDate(r.endDate) : '',
      ]),
      stats: [
        { label: 'Clientes', value: String(rows.length) },
        { label: 'Activos', value: String(active) },
      ],
    };
  }, [kind, income.data, attendance.data, expiring.data, roster.data, currency]);

  const reportTitle = REPORTS.find((r) => r.kind === kind)!.label;
  const hasRows = view.exportRows.length > 0;

  function onExportCsv() {
    const slug = kind;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`gymbar-${slug}-${stamp}`, view.headers, view.exportRows);
  }
  function onExportPdf() {
    printReport(`Reporte de ${reportTitle}`, periodLabel, view.headers, view.exportRows);
  }

  return (
    <div>
      <PageHeader title="Reportes" description="Ingresos, asistencia, vencimientos y padrón — exportables a Excel y PDF" />

      {/* Selector de tipo de reporte */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.kind}
            type="button"
            onClick={() => setKind(r.kind)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              kind === r.kind
                ? 'bg-primary text-primary-contrast'
                : 'bg-surface text-content-muted hover:text-content',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Barra de filtros + exportación */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(kind === 'income' || kind === 'attendance') &&
            PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodDays(p.days)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  periodDays === p.days
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border text-content-muted hover:text-content',
                )}
              >
                {p.label}
              </button>
            ))}
          {kind === 'expiring' &&
            WITHIN.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWithinDays(w.days)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  withinDays === w.days
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border text-content-muted hover:text-content',
                )}
              >
                {w.label}
              </button>
            ))}
          {kind === 'roster' && (
            <span className="text-sm text-content-muted">Padrón completo de clientes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={!hasRows}>
            <Download className="h-4 w-4" /> Excel (CSV)
          </Button>
          <Button variant="secondary" size="sm" onClick={onExportPdf} disabled={!hasRows}>
            <Printer className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {view.stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} loading={isLoading} />
        ))}
      </div>

      {/* Tabla */}
      <Card className="mt-6">
        <CardBody>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !hasRows ? (
            <EmptyState
              icon={FileText}
              title="Sin datos"
              description="No hay registros para el filtro seleccionado."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-content-muted">
                  <tr>
                    {view.headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {renderRows()}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  function renderRows() {
    if (kind === 'income') {
      return (income.data ?? []).map((p) => (
        <tr key={p.id} className="hover:bg-surface/40">
          <td className="px-3 py-2.5 text-content-muted">{fmtDateTime(p.createdAt)}</td>
          <td className="px-3 py-2.5 tabular text-content-muted">{p.receiptNumber}</td>
          <td className="px-3 py-2.5 font-medium text-content">{p.memberNameSnapshot}</td>
          <td className="px-3 py-2.5 text-content-muted">{METHOD_LABEL[p.method] ?? p.method}</td>
          <td className="px-3 py-2.5 font-medium tabular text-content">
            {formatMoney(money(p.amountCents, currency))}
          </td>
        </tr>
      ));
    }
    if (kind === 'attendance') {
      return (attendance.data ?? []).map((c) => (
        <tr key={c.id} className="hover:bg-surface/40">
          <td className="px-3 py-2.5 text-content-muted">{fmtDateTime(c.createdAt)}</td>
          <td className="px-3 py-2.5 font-medium text-content">{c.memberNameSnapshot}</td>
          <td className="px-3 py-2.5 text-content-muted">{SOURCE_LABEL[c.source] ?? c.source}</td>
          <td className="px-3 py-2.5">
            <span
              className={cn(
                'text-xs font-medium',
                c.result === 'allowed' ? 'text-state-active' : 'text-state-pending',
              )}
            >
              {RESULT_LABEL[c.result] ?? c.result}
            </span>
          </td>
        </tr>
      ));
    }
    if (kind === 'expiring') {
      return (expiring.data ?? []).map((r) => (
        <tr key={r.memberId} className="hover:bg-surface/40">
          <td className="px-3 py-2.5 font-medium text-content">{r.memberName}</td>
          <td className="px-3 py-2.5 text-content-muted">{r.phone ?? '—'}</td>
          <td className="px-3 py-2.5 text-content-muted">{r.planName ?? '—'}</td>
          <td className="px-3 py-2.5 text-content-muted">{fmtDate(r.endDate)}</td>
          <td className="px-3 py-2.5">
            <span
              className={cn(
                'text-xs font-semibold',
                r.daysLeft < 0
                  ? 'text-state-expired'
                  : r.daysLeft <= 3
                    ? 'text-state-pending'
                    : 'text-content-muted',
              )}
            >
              {r.daysLeft < 0 ? `Venció hace ${-r.daysLeft} d` : `${r.daysLeft} d`}
            </span>
          </td>
        </tr>
      ));
    }
    return (roster.data ?? []).map((r) => (
      <tr key={r.memberId} className="hover:bg-surface/40">
        <td className="px-3 py-2.5 tabular text-content-muted">{r.code}</td>
        <td className="px-3 py-2.5 font-medium text-content">{r.name}</td>
        <td className="px-3 py-2.5 text-content-muted">{r.phone ?? '—'}</td>
        <td className="px-3 py-2.5">
          <StatusBadge status={r.status} />
        </td>
        <td className="px-3 py-2.5 text-content-muted">
          {r.goal ? MEMBER_GOAL_LABELS[r.goal] : '—'}
        </td>
        <td className="px-3 py-2.5 text-content-muted">{r.endDate ? fmtDate(r.endDate) : '—'}</td>
      </tr>
    ));
  }
}
