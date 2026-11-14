import { describe, expect, it } from 'vitest';
import fixture from '../__fixtures__/consolidation-cases.json';
import {
  consolidate,
  convert,
  signedAmount,
  totals,
  totalsByOriginalCurrency,
  type ConsolidatedMovement,
  type MovementInput,
} from '../consolidation';
import { RateTable, type ExchangeRate } from '../rates';

const rates = new RateTable(fixture.rates as ExchangeRate[]);

describe('consolidate (casos compartidos con SQL)', () => {
  it.each(fixture.cases)('$name', ({ input, expected }) => {
    expect(consolidate(input as MovementInput, rates)).toEqual(expected);
  });
});

describe('convert', () => {
  it('misma moneda no cambia el monto', () => {
    expect(convert(12345, 'EUR', 'EUR', '2000-01-01', rates)).toBe(12345);
  });

  it('USD → CUP', () => {
    expect(convert(100, 'USD', 'CUP', '2026-05-20', rates)).toBe(36550);
  });

  it('CUP → USD redondea al centavo', () => {
    expect(convert(36550, 'CUP', 'USD', '2026-05-20', rates)).toBe(100);
    expect(convert(1000, 'CUP', 'USD', '2026-05-20', rates)).toBe(3); // 2,736 → 3
  });

  it('EUR → MLC cruzando por CUP', () => {
    // 10 EUR · 395,25 / 250 = 15,81 MLC
    expect(convert(1000, 'EUR', 'MLC', '2026-05-20', rates)).toBe(1581);
  });

  it('devuelve null si falta una tasa', () => {
    expect(convert(1000, 'MLC', 'USD', '2026-05-01', rates)).toBeNull();
  });

  it('ida y vuelta pierde como máximo un centavo', () => {
    for (const cents of [1, 99, 12345, 9_999_999]) {
      const cup = convert(cents, 'USD', 'CUP', '2026-05-20', rates);
      const back = convert(cup ?? 0, 'CUP', 'USD', '2026-05-20', rates);
      expect(Math.abs((back ?? 0) - cents)).toBeLessThanOrEqual(1);
    }
  });

  it('montos grandes no pierden precisión (BigInt)', () => {
    // 50 millones de USD a CUP
    expect(convert(5_000_000_000, 'USD', 'CUP', '2026-06-01', rates)).toBe(1_850_000_000_000);
  });
});

describe('totals', () => {
  const movements: ConsolidatedMovement[] = [
    { date: '2026-05-01', kind: 'ingreso', amountUsdCents: 10000, amountCupCents: 3600000 },
    { date: '2026-05-02', kind: 'ingreso', amountUsdCents: 274, amountCupCents: 100000 },
    { date: '2026-05-03', kind: 'gasto', amountUsdCents: 5000, amountCupCents: 1800000 },
    { date: '2026-05-04', kind: 'gasto', amountUsdCents: null, amountCupCents: null },
  ];

  it('suma ingresos, resta gastos y cuenta los sin tasa', () => {
    expect(totals(movements, 'USD')).toEqual({
      income: 10274,
      expense: 5000,
      net: 5274,
      count: 4,
      missingRate: 1,
    });
    expect(totals(movements, 'CUP').net).toBe(1900000);
  });

  it('lista vacía da ceros', () => {
    expect(totals([], 'USD')).toEqual({ income: 0, expense: 0, net: 0, count: 0, missingRate: 0 });
  });

  it('signedAmount: gasto en negativo, sin tasa cuenta 0', () => {
    expect(signedAmount(movements[2]!, 'USD')).toBe(-5000);
    expect(signedAmount(movements[3]!, 'USD')).toBe(-0);
  });
});

describe('totalsByOriginalCurrency', () => {
  it('agrupa sin convertir', () => {
    const result = totalsByOriginalCurrency([
      { date: '2026-05-01', kind: 'ingreso', amountCents: 100, currency: 'USD' },
      { date: '2026-05-01', kind: 'gasto', amountCents: 40, currency: 'USD' },
      { date: '2026-05-01', kind: 'ingreso', amountCents: 5000, currency: 'CUP' },
    ]);
    expect(result.USD).toEqual({ income: 100, expense: 40 });
    expect(result.CUP).toEqual({ income: 5000, expense: 0 });
    expect(result.MLC).toEqual({ income: 0, expense: 0 });
  });
});
