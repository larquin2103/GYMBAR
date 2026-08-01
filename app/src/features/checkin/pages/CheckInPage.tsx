import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ScanLine, Check, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { Member } from '@/domain/member/member.entity';
import { memberFullName, memberInitials } from '@/domain/member/member.entity';
import { decideAccess } from '@/domain/checkin/checkin.logic';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Avatar } from '@/shared/ui/Avatar';
import { cn } from '@/shared/lib/cn';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useMembers } from '@/features/members/api/useMembers';
import { useRegisterCheckIn, useTodayCheckins } from '../api/useCheckin';
import { KioskCheckIn } from '../components/KioskCheckIn';

interface LastResult {
  member: Member;
  tone: 'active' | 'expired' | 'pending' | 'blocked';
  label: string;
  allowed: boolean;
}

const toneStyles: Record<LastResult['tone'], string> = {
  active: 'border-state-active/40 bg-state-active/10',
  expired: 'border-state-expired/40 bg-state-expired/10',
  pending: 'border-state-pending/40 bg-state-pending/10',
  blocked: 'border-state-blocked/40 bg-state-blocked/10',
};
const toneIcon = { active: Check, expired: AlertTriangle, pending: Clock, blocked: XCircle };

export default function CheckInPage() {
  const [mode, setMode] = useState<'desk' | 'kiosk'>('desk');
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState('');
  const search = useDebounce(raw.trim(), 200);
  const [last, setLast] = useState<LastResult | null>(null);

  const { data } = useMembers({ search: search || undefined });
  const results = search ? (data?.pages.flatMap((p) => p.items) ?? []).slice(0, 6) : [];
  const register = useRegisterCheckIn();
  const { data: today } = useTodayCheckins();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function checkIn(member: Member) {
    const decision = decideAccess(member.status);
    await register.mutateAsync({ memberId: member.id, source: 'search' });
    setLast({ member, tone: decision.tone, label: decision.label, allowed: decision.allowed });
    setRaw('');
    inputRef.current?.focus();
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'Enter' && results[0]) {
      e.preventDefault();
      void checkIn(results[0]);
    }
  }

  const LastIcon = last ? toneIcon[last.tone] : ScanLine;

  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Registra la entrada del cliente en segundos"
        action={
          <div className="flex rounded-md border border-border p-0.5">
            {(['desk', 'kiosk'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === m ? 'bg-primary text-primary-contrast' : 'text-content-muted',
                )}
              >
                {m === 'desk' ? 'Mostrador' : 'Autoservicio'}
              </button>
            ))}
          </div>
        }
      />

      {mode === 'kiosk' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardBody className="p-6">
              <KioskCheckIn />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-content">Entradas de hoy</span>
                <Badge>{today?.length ?? 0}</Badge>
              </div>
              <ul className="mt-4 space-y-2">
                {(today ?? []).slice(0, 12).map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-content">{c.memberNameSnapshot}</span>
                    <span className="tabular text-xs text-content-muted">
                      {c.createdAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="p-6">
              <label htmlFor="checkin-search" className="text-sm font-medium text-content">
                Buscar cliente
              </label>
              <div className="mt-2 flex h-12 items-center gap-2 rounded-md border border-border bg-surface/40 px-3">
                <ScanLine className="h-5 w-5 text-content-muted" aria-hidden />
                <input
                  id="checkin-search"
                  ref={inputRef}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Nombre, teléfono o código… (Enter registra el primero)"
                  className="h-full w-full bg-transparent text-base text-content outline-none placeholder:text-content-muted"
                  autoComplete="off"
                />
              </div>

              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border">
                  {results.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => void checkIn(m)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface/60"
                      >
                        <Avatar photoUrl={m.photoUrl} initials={memberInitials(m)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-content">
                            {memberFullName(m)}
                          </div>
                          <div className="text-xs text-content-muted">{m.code}</div>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            m.status === 'active'
                              ? 'text-state-active'
                              : m.status === 'expired'
                                ? 'text-state-expired'
                                : 'text-content-muted',
                          )}
                        >
                          {decideAccess(m.status).label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Resultado del último registro */}
              <div
                className={cn(
                  'mt-5 flex items-center gap-4 rounded-lg border p-5 transition-colors',
                  last ? toneStyles[last.tone] : 'border-dashed border-border',
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    last ? 'bg-bg' : 'bg-surface',
                  )}
                >
                  <LastIcon
                    className={cn(
                      'h-6 w-6',
                      last
                        ? {
                            active: 'text-state-active',
                            expired: 'text-state-expired',
                            pending: 'text-state-pending',
                            blocked: 'text-state-blocked',
                          }[last.tone]
                        : 'text-content-muted',
                    )}
                  />
                </div>
                <div>
                  {last ? (
                    <>
                      <div className="text-base font-semibold text-content">
                        {memberFullName(last.member)}
                      </div>
                      <div className="text-sm text-content-muted">
                        {last.label}
                        {last.allowed ? ' · entrada registrada' : ' · acceso denegado'}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-content-muted">
                      Busca un cliente y presiona Enter para registrar su entrada.
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-content">Entradas de hoy</span>
              <Badge>{today?.length ?? 0}</Badge>
            </div>
            <ul className="mt-4 space-y-2">
              {(today ?? []).slice(0, 12).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-content">{c.memberNameSnapshot}</span>
                  <span className="tabular text-xs text-content-muted">
                    {c.createdAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
              {(today?.length ?? 0) === 0 && (
                <li className="text-sm text-content-muted">Aún no hay entradas hoy.</li>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
      )}
    </div>
  );
}
