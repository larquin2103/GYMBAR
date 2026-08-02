import type { PaymentMethod, CheckInSource } from '@gymbar/shared';
import type { Membership } from '@/domain/membership/membership.entity';
import type { Payment } from '@/domain/payment/payment.entity';
import type { CheckIn } from '@/domain/checkin/checkin.entity';
import type { CashSession } from '@/domain/cashbox/cashbox.entity';
import type { Sale } from '@/domain/product/product.entity';

/**
 * Operaciones sensibles (dinero, vigencia, acceso). En producción cada una es una
 * Cloud Function transaccional e idempotente (ver docs/09). Aquí se define el
 * contrato; el modo demo lo implementa en memoria y el modo real vía callables.
 */
export interface OperationsService {
  /**
   * Renueva/asigna una membresía: extiende la vigencia según el plan, registra el
   * pago y su movimiento de caja, y recalcula el estado del cliente. Atómico.
   */
  renewMembership(input: {
    orgId: string;
    memberId: string;
    planId: string;
    method: PaymentMethod;
    clientRequestId: string;
    notes?: string;
  }): Promise<{ membership: Membership; payment: Payment }>;

  /** Registra un intento de acceso (siempre) y decide el acceso por política. */
  registerCheckIn(input: {
    orgId: string;
    memberId: string;
    source: CheckInSource;
  }): Promise<CheckIn>;

  openCashSession(input: {
    orgId: string;
    openingFloatCents: number;
    currency: string;
  }): Promise<CashSession>;

  addCashMovement(input: {
    orgId: string;
    type: 'income' | 'expense';
    amountCents: number;
    reason: string;
  }): Promise<void>;

  /** Cierra la caja calculando esperado vs contado (server-side en prod). */
  closeCashSession(input: { orgId: string; countedCents: number }): Promise<CashSession>;

  /**
   * Registra una venta de mostrador: valida stock, descuenta inventario (con
   * asiento), registra la venta y su movimiento de ingreso en caja. Atómico e
   * idempotente. El servidor recalcula precios desde el catálogo (no confía en
   * el cliente).
   */
  registerSale(input: {
    orgId: string;
    items: { productId: string; quantity: number }[];
    method: PaymentMethod;
    memberId?: string | null;
    memberNameSnapshot?: string | null;
    clientRequestId: string;
  }): Promise<Sale>;
}
