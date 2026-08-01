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
} from 'lucide-react';
import { memberFullName, memberInitials } from '@/domain/member/member.entity';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/Badge';
import { Card, CardBody } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useMember } from '../api/useMembers';
import { MemberSheet } from '../components/MemberSheet';

function formatDate(date: Date | null): string {
  if (!date) return 'Sin membresía';
  return date.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading } = useMember(memberId);
  const [editOpen, setEditOpen] = useState(false);

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
        {/* Columna principal: identidad + acciones */}
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

            {/* Acciones rápidas (operativas en Fase 2) */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" disabled title="Disponible en Fase 2">
                <CreditCard className="h-4 w-4" />
                Cobrar
              </Button>
              <Button size="sm" variant="secondary" disabled title="Disponible en Fase 2">
                <ScanLine className="h-4 w-4" />
                Check-in
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Phone} label="Teléfono" value={member.phone ?? '—'} />
              <InfoRow icon={Mail} label="Correo" value={member.email ?? '—'} />
              <InfoRow
                icon={CalendarClock}
                label="Vencimiento"
                value={formatDate(member.membershipEndDate)}
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

        {/* Columna lateral: actividad reciente (Fase 2/3) */}
        <Card>
          <CardBody>
            <div className="text-sm font-semibold text-content">Últimas asistencias</div>
            <div className="mt-4">
              <EmptyState
                icon={ScanLine}
                title="Sin asistencias"
                description="El historial de entradas aparecerá aquí (Fase 2)."
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <MemberSheet open={editOpen} onClose={() => setEditOpen(false)} member={member} />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-surface text-content-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-content-muted">{label}</div>
        <div className="truncate text-sm text-content">{value}</div>
      </div>
    </div>
  );
}
