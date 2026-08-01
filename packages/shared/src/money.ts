/**
 * Dinero como enteros en la unidad menor (centavos). NUNCA floats para dinero.
 * El formateo a texto ocurre solo en la capa de UI.
 */

export interface Money {
  /** Monto en la unidad menor de la moneda (ej. centavos). Entero. */
  readonly amountCents: number;
  /** Código ISO-4217, ej. 'USD', 'MXN', 'ARS'. */
  readonly currency: string;
}

export function money(amountCents: number, currency: string): Money {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`amountCents debe ser entero, recibido: ${amountCents}`);
  }
  return { amountCents, currency };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountCents + b.amountCents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountCents - b.amountCents, a.currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Monedas distintas: ${a.currency} vs ${b.currency}`);
  }
}

/** Formatea para UI. No usar el resultado para cálculos. */
export function formatMoney(m: Money, locale = 'es'): string {
  // Peso cubano: se muestra como "MN" (moneda nacional), la convención local.
  if (m.currency === 'CUP') {
    const n = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(m.amountCents / 100);
    return `${n} MN`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
  }).format(m.amountCents / 100);
}
