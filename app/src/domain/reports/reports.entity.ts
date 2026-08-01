import type { MemberStatus, MemberGoal } from '@gymbar/shared';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';

/** Fila del reporte de vencimientos (quién debe renovar). */
export interface ExpiringRow {
  memberId: string;
  memberName: string;
  phone: string | null;
  planName: string | null;
  endDate: Date;
  /** Días hasta el vencimiento; negativo si ya venció. */
  daysLeft: number;
}

/** Fila del padrón de clientes. */
export interface RosterRow {
  memberId: string;
  code: string;
  name: string;
  phone: string | null;
  status: MemberStatus;
  goal: MemberGoal | null;
  endDate: Date | null;
  createdAt: Date;
}

/**
 * Read-model de reportes (docs/08): consultas de solo lectura y agregación,
 * separadas de la escritura operativa. En prod se apoya en índices/rollups;
 * en demo lee del store en memoria. La UI depende solo de esta interfaz.
 */
export interface ReportsRepository {
  /** Pagos en el rango [fromKey, toKey] (YYYY-MM-DD, inclusivo). */
  income(orgId: string, fromKey: string, toKey: string): Promise<Payment[]>;
  /** Entradas en el rango [fromKey, toKey]. */
  attendance(orgId: string, fromKey: string, toKey: string): Promise<CheckIn[]>;
  /** Clientes cuya membresía vence dentro de `withinDays` (o ya venció). */
  expiring(orgId: string, withinDays: number): Promise<ExpiringRow[]>;
  /** Padrón completo de clientes. */
  roster(orgId: string): Promise<RosterRow[]>;
}
