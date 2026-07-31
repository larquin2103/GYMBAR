import { describe, expect, it } from 'vitest';
import { addMoney, formatMoney, money, subtractMoney } from './money.js';

describe('money', () => {
  it('rechaza montos no enteros', () => {
    expect(() => money(10.5, 'USD')).toThrow();
  });

  it('suma montos de la misma moneda', () => {
    expect(addMoney(money(1000, 'USD'), money(500, 'USD')).amountCents).toBe(1500);
  });

  it('resta montos de la misma moneda', () => {
    expect(subtractMoney(money(1000, 'USD'), money(300, 'USD')).amountCents).toBe(700);
  });

  it('falla al operar con monedas distintas', () => {
    expect(() => addMoney(money(1000, 'USD'), money(500, 'MXN'))).toThrow();
  });

  it('formatea a texto de moneda', () => {
    // El separador exacto depende del runtime ICU; validamos que incluya el número.
    expect(formatMoney(money(150000, 'USD'), 'en-US')).toContain('1,500');
  });
});
