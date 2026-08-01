import type { CheckInResult, MemberStatus } from '@gymbar/shared';

export interface AccessDecision {
  result: CheckInResult;
  allowed: boolean;
  label: string;
  tone: 'active' | 'expired' | 'pending' | 'blocked';
}

/**
 * Decide el acceso a partir del estado del cliente. Decisión no complaciente
 * (ver docs/03): el check-in SIEMPRE se registra (dato valioso); el acceso se
 * decide por política. Aquí: vencido/pendiente pasan con aviso, cancelado no.
 */
export function decideAccess(status: MemberStatus): AccessDecision {
  switch (status) {
    case 'active':
      return { result: 'allowed', allowed: true, label: 'Acceso permitido', tone: 'active' };
    case 'expired':
      return { result: 'expired', allowed: true, label: 'Vencido — renovar', tone: 'expired' };
    case 'pending':
      return { result: 'pending_payment', allowed: true, label: 'Pago pendiente', tone: 'pending' };
    case 'frozen':
      return { result: 'denied', allowed: false, label: 'Membresía congelada', tone: 'blocked' };
    case 'cancelled':
      return { result: 'denied', allowed: false, label: 'Sin membresía activa', tone: 'blocked' };
    default:
      return { result: 'denied', allowed: false, label: 'Sin acceso', tone: 'blocked' };
  }
}

export function dateKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
