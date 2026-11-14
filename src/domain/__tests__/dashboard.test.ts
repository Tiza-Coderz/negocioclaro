import { describe, expect, it } from 'vitest';
import {
  comparablePrevious,
  dailyCashflow,
  expensesByCategory,
  monthlySeries,
  netMargin,
  percentChange,
  topClients,
  type DashboardMovement,
} from '../dashboard';

function mv(
  p: Partial<DashboardMovement> & Pick<DashboardMovement, 'date' | 'kind'>,
): DashboardMovement {
  return {
    amountUsdCents: 100_00,
    amountCupCents: 40000_00,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    clientId: null,
    clientName: null,
    ...p,
  };
}

const data: DashboardMovement[] = [
  mv({
    date: '2026-10-05',
    kind: 'ingreso',
    amountUsdCents: 500_00,
    clientId: 'c1',
    clientName: 'Paladar La Habanera',
  }),
  mv({
    date: '2026-10-06',
    kind: 'gasto',
    amountUsdCents: 200_00,
    categoryId: 'g1',
    categoryName: 'Mercancía',
    categoryColor: '#111111',
  }),
  mv({
    date: '2026-11-01',
    kind: 'ingreso',
    amountUsdCents: 300_00,
    clientId: 'c2',
    clientName: 'Cafetería El Rápido',
  }),
  mv({
    date: '2026-11-02',
    kind: 'ingreso',
    amountUsdCents: 150_00,
    clientId: 'c1',
    clientName: 'Paladar La Habanera',
  }),
  mv({
    date: '2026-11-02',
    kind: 'gasto',
    amountUsdCents: 100_00,
    categoryId: 'g1',
    categoryName: 'Mercancía',
    categoryColor: '#111111',
  }),
  mv({
    date: '2026-11-03',
    kind: 'gasto',
    amountUsdCents: 50_00,
    categoryId: 'g2',
    categoryName: 'Transporte',
    categoryColor: '#222222',
  }),
  mv({ date: '2026-11-03', kind: 'gasto', amountUsdCents: null, amountCupCents: null }), // sin tasa
];

describe('monthlySeries', () => {
  it('resume cada mes, incluidos los vacíos', () => {
    const s = monthlySeries(data, ['2026-09', '2026-10', '2026-11'], 'USD');
    expect(s.map((x) => [x.month, x.income, x.expense, x.net])).toEqual([
      ['2026-09', 0, 0, 0],
      ['2026-10', 500_00, 200_00, 300_00],
      ['2026-11', 450_00, 150_00, 300_00],
    ]);
    expect(s[2]?.missingRate).toBe(1);
  });
});

describe('percentChange / netMargin', () => {
  it('compara con el mes anterior', () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(-50, -100)).toBeCloseTo(50); // pérdida que mejora
    expect(percentChange(10, 0)).toBeNull();
  });

  it('margen neto', () => {
    expect(netMargin({ income: 1000, expense: 750, net: 250, count: 2, missingRate: 0 })).toBe(25);
    expect(netMargin({ income: 0, expense: 10, net: -10, count: 1, missingRate: 0 })).toBeNull();
  });
});

describe('expensesByCategory', () => {
  const nov = data.filter((m) => m.date.startsWith('2026-11'));

  it('ordena de mayor a menor con su porcentaje', () => {
    const r = expensesByCategory(nov, 'USD');
    expect(r.map((x) => [x.name, x.total])).toEqual([
      ['Mercancía', 100_00],
      ['Transporte', 50_00],
    ]);
    expect(r[0]?.share).toBeCloseTo(2 / 3);
  });

  it('agrupa el resto en "Otros"', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      mv({
        date: '2026-11-01',
        kind: 'gasto',
        amountUsdCents: (10 - i) * 100,
        categoryId: `c${i}`,
        categoryName: `Cat ${i}`,
      }),
    );
    const r = expensesByCategory(many, 'USD', 3);
    expect(r).toHaveLength(4);
    expect(r[3]?.name).toBe('Otros');
    expect(r.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
  });
});

describe('dailyCashflow', () => {
  it('acumula el saldo día a día y corta en hoy', () => {
    const r = dailyCashflow(data, '2026-11', 'USD', '2026-11-04');
    expect(r).toHaveLength(4);
    expect(r.map((p) => p.balance)).toEqual([300_00, 350_00, 300_00, 300_00]);
  });

  it('un mes pasado incluye todos sus días', () => {
    expect(dailyCashflow(data, '2026-10', 'USD', '2026-11-14')).toHaveLength(31);
  });
});

describe('topClients', () => {
  it('ordena clientes por ingresos', () => {
    const r = topClients(data, 'USD');
    expect(r).toEqual([
      { clientId: 'c1', name: 'Paladar La Habanera', total: 650_00, count: 2 },
      { clientId: 'c2', name: 'Cafetería El Rápido', total: 300_00, count: 1 },
    ]);
  });
});

describe('comparablePrevious', () => {
  const movs = [
    mv({ date: '2026-10-03', kind: 'ingreso', amountUsdCents: 100_00 }),
    mv({ date: '2026-10-20', kind: 'ingreso', amountUsdCents: 900_00 }),
    mv({ date: '2026-11-02', kind: 'ingreso', amountUsdCents: 150_00 }),
  ];

  it('en el mes en curso compara contra los mismos días del mes anterior', () => {
    const r = comparablePrevious(movs, '2026-11', '2026-11-14', 'USD');
    expect(r.month).toBe('2026-10');
    expect(r.uptoDay).toBe(14);
    expect(r.totals.income).toBe(100_00); // excluye el 20 de octubre
  });

  it('un mes cerrado se compara con el mes anterior completo', () => {
    const r = comparablePrevious(movs, '2026-11', '2026-12-05', 'USD');
    expect(r.uptoDay).toBeNull();
    expect(r.totals.income).toBe(1000_00);
  });

  it('el día 31 contra un mes de 30 días usa el último día disponible', () => {
    expect(comparablePrevious([], '2026-12', '2026-12-31', 'USD').uptoDay).toBe(30);
  });
});
