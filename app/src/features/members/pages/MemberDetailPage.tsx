import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  ScanLine,
  Phone,
  Mail,
  CalendarClock,
  StickyNote,
  KeyRound,
  Target,
  LineChart as LineChartIcon,
  Plus,
} from 'lucide-react';
import { money, formatMoney, MEMBER_GOAL_LABELS } from '@gymbar/shared';
import { memberFullName, memberInitials } from '@/domain/member/member.entity';
import { decideAccess } from '@/domain/checkin/checkin.logic';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/Badge';
import { Card, CardBody } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LineChart, type LinePoint } from '@/shared/ui/LineChart';
import { useMember } from '../api/useMembers';
import { MemberSheet } from '../components/MemberSheet';
import { RenewMembershipSheet } from '@/features/billing/components/RenewMembershipSheet';
import { useMemberMembership, useMemberPayments } from '@/features/billing/api/useBilling';
import { useMemberCheckins, useRegisterCheckIn } from '@/features/checkin/api/useCheckin';
import { useMemberMeasurements } from '@/features/measurements/api/useMeasurements';
import { MeasurementSheet } from '@/features/measurements/components/MeasurementSheet';

function formatDate(date: Date | null): string {
  if (!date) return 'Sin membresía';
  return date.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading } = useMember(memberId);
  const { data: membership } = useMemberMembership(memberId);
  const { data: payments } = useMemberPayments(memberId);
  const { data: checkins } = useMemberCheckins(memberId);
  const { data: measurements } = useMemberMeasurements(memberId);
  const register = useRegisterCheckIn();
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!member) {
    return (
      <EmptyState
        icon={StickyNote}
        title="Cliente no encontrado"
        description="El cliente que buscas no existe o fue eliminado."
        action={<Button onClick={() => navigate('/members')}>Volver a clientes</Button>}
      />
    );
  }

  const weightPoints: LinePoint[] = (measurements ?? [])
    .filter((m) => m.weightKg != null)
    .slice()
    .reverse()
    .map((m) => ({
      label: m.date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      value: m.weightKg as number,
    }));

  async function onCheckIn() {
    if (!member) return;
    const decision = decideAccess(member.status);
    await register.mutateAsync({ memberId: member.id, source: 'search' });
    setCheckedIn(decision.label);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/members')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-content-muted hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  photoUrl={member.photoUrl}
                  initials={memberInitials(member)}
                  name={memberFullName(member)}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-semibold text-content">{memberFullName(member)}</h1>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={member.status} />
                    <span className="text-xs text-content-muted">{member.code}</span>
                  </div>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRenewOpen(true)}>
                <CreditCard className="h-4 w-4" />
                Cobrar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onCheckIn}
                loading={register.isPending}
              >
                <ScanLine className="h-4 w-4" />
                Check-in
              </Button>
              {checkedIn && (
                <span className="text-sm text-state-active">
                  ✓ {checkedIn} · entrada registrada
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Phone} label="Teléfono" value={member.phone ?? '—'} />
              <InfoRow icon={Mail} label="Correo" value={member.email ?? '—'} />
              <InfoRow
                icon={CalendarClock}
                label="Vencimiento"
                value={formatDate(member.membershipEndDate)}
              />
              <InfoRow
                icon={CreditCard}
                label="Plan actual"
                value={membership?.planNameSnapshot ?? '—'}
              />
              <InfoRow
                icon={Target}
                label="Objetivo"
                value={member.goal ? MEMBER_GOAL_LABELS[member.goal] : 'Sin definir'}
              />
              <InfoRow
                icon={KeyRound}
                label="Código de autoservicio (PIN)"
                value={member.accessCode || '—'}
                mono
              />
            </div>

            {member.notes && (
              <div className="mt-6 rounded-md bg-surface/60 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-content-muted">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notas
                </div>
                <p className="text-sm text-content">{member.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold text-content">Últimos pagos</div>
              <ul className="mt-4 space-y-2.5">
                {(payments ?? []).slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-content-muted">
                      {p.createdAt.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="tabular font-medium text-content">
                      {formatMoney(money(p.amountCents, p.currency))}
                    </span>
                  </li>
                ))}
                {(payments?.length ?? 0) === 0 && (
                  <li className="text-sm text-content-muted">Sin pagos registrados.</li>
                )}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="text-sm font-semibold text-content">Últimas asistencias</div>
              <ul className="mt-4 space-y-2.5">
                {(checkins ?? []).slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-content-muted">
                      {c.createdAt.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="tabular text-xs text-content-muted">
                      {c.createdAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
                {(checkins?.length ?? 0) === 0 && (
                  <li className="text-sm text-content-muted">Sin asistencias aún.</li>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Medidas y evolución */}
      <Card className="mt-5">
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-content">
              <LineChartIcon className="h-4 w-4 text-content-muted" />
              Medidas y progreso
            </div>
            <Button size="sm" variant="secondary" onClick={() => setMeasureOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar medida
            </Button>
          </div>

          {(measurements?.length ?? 0) === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={LineChartIcon}
                title="Sin medidas registradas"
                description="Registra la primera medición para empezar a seguir su evolución."
              />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">
                  Evolución del peso
                </div>
                <LineChart points={weightPoints} unit="kg" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-content-muted">
                    <tr>
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 text-right font-medium">Peso</th>
                      <th className="pb-2 text-right font-medium">Grasa</th>
                      <th className="pb-2 text-right font-medium">Músculo</th>
                      <th className="pb-2 text-right font-medium">Cintura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(measurements ?? []).slice(0, 8).map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 text-content-muted">
                          {m.date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2 text-right tabular text-content">
                          {m.weightKg != null ? `${m.weightKg} kg` : '—'}
                        </td>
                        <td className="py-2 text-right tabular text-content-muted">
                          {m.bodyFatPct != null ? `${m.bodyFatPct}%` : '—'}
                        </td>
                        <td className="py-2 text-right tabular text-content-muted">
                          {m.muscleKg != null ? `${m.muscleKg} kg` : '—'}
                        </td>
                        <td className="py-2 text-right tabular text-content-muted">
                          {m.waistCm != null ? `${m.waistCm} cm` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <MemberSheet open={editOpen} onClose={() => setEditOpen(false)} member={member} />
      <RenewMembershipSheet open={renewOpen} onClose={() => setRenewOpen(false)} member={member} />
      <MeasurementSheet
        open={measureOpen}
        onClose={() => setMeasureOpen(false)}
        memberId={member.id}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-surface text-content-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-content-muted">{label}</div>
        <div className={mono ? 'tabular text-sm font-semibold tracking-widest text-content' : 'truncate text-sm text-content'}>
          {value}
        </div>
      </div>
    </div>
  );
}
