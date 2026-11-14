import { describe, expect, it } from 'vitest';
import { RateTable, rateChangePct } from '../rates';

const table = new RateTable([
  { date: '2026-05-15', currency: 'USD', cupPerUnit: '365.5' },
  { date: '2026-05-01', currency: 'USD', cupPerUnit: 360 },
  { date: '2026-06-01', currency: 'USD', cupPerUnit: '370' },
  { date: '2026-05-10', currency: 'MLC', cupPerUnit: '250' },
]);

describe('RateTable.resolve', () => {
  it('CUP siempre vale 1', () => {
    expect(table.resolveNumber('CUP', '1999-01-01')).toBe(1);
  });

  it('usa la tasa del mismo día', () => {
    expect(table.resolve('USD', '2026-05-15')).toEqual({ date: '2026-05-15', scaled: 3655000n });
  });

  it('si no hay tasa ese día usa la última anterior (aunque se cargaran desordenadas)', () => {
    expect(table.resolve('USD', '2026-05-14')?.date).toBe('2026-05-01');
    expect(table.resolve('USD', '2026-05-31')?.date).toBe('2026-05-15');
    expect(table.resolve('USD', '2027-01-01')?.date).toBe('2026-06-01');
  });

  it('no usa tasas futuras: antes de la primera tasa devuelve null', () => {
    expect(table.resolve('USD', '2026-04-30')).toBeNull();
    expect(table.resolve('MLC', '2026-05-09')).toBeNull();
  });

  it('moneda sin ninguna tasa devuelve null', () => {
    expect(table.resolve('EUR', '2026-06-01')).toBeNull();
  });

  it('rechaza tasas cero o negativas', () => {
    expect(() => new RateTable([{ date: '2026-01-01', currency: 'USD', cupPerUnit: 0 }])).toThrow(
      /Tasa inválida/,
    );
  });

  it('busca bien con muchas tasas (búsqueda binaria)', () => {
    const many = new RateTable(
      Array.from({ length: 365 }, (_, i) => {
        const d = new Date(Date.UTC(2026, 0, 1 + i * 2)).toISOString().slice(0, 10);
        return { date: d, currency: 'USD' as const, cupPerUnit: 300 + i };
      }),
    );
    expect(many.resolveNumber('USD', '2026-01-04')).toBe(301);
    expect(many.resolveNumber('USD', '2026-01-05')).toBe(302);
  });
});

describe('rateChangePct', () => {
  it('calcula la variación porcentual', () => {
    expect(rateChangePct(400, 410)).toBeCloseTo(2.5);
    expect(rateChangePct(0, 410)).toBeNull();
  });
});
