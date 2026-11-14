import { describe, expect, it } from 'vitest';
import { csvDecimal } from '@/lib/csv';
import { buildMonthlyReport, csvRows, reportFilename, type ReportMovement } from '../report';

function mv(p: Partial<ReportMovement> & Pick<ReportMovement, 'date' | 'kind'>): ReportMovement {
  return {
    amountCents: 100_00,
    currency: 'USD',
    method: 'efectivo',
    amountUsdCents: 100_00,
    amountCupCents: 44000_00,
    rateCupUsd: 440,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    clientId: null,
    clientName: null,
    supplierName: null,
    note: null,
    ...p,
  };
}

const data: ReportMovement[] = [
  mv({ date: '2026-10-10', kind: 'ingreso', amountUsdCents: 200_00 }),
  mv({
    date: '2026-11-02',
    kind: 'ingreso',
    method: 'zelle',
    categoryId: 'v',
    categoryName: 'Ventas',
    clientId: 'c1',
    clientName: 'Paladar La Habanera',
  }),
  mv({
    date: '2026-11-01',
    kind: 'ingreso',
    currency: 'CUP',
    amountCents: 44000_00,
    method: 'transfermovil',
    categoryId: 'v',
    categoryName: 'Ventas',
  }),
  mv({
    date: '2026-11-03',
    kind: 'gasto',
    amountUsdCents: 50_00,
    categoryId: 'm',
    categoryName: 'Mercancía',
    supplierName: 'Importadora Isla Bella',
    note: 'Pollo; 20 cajas',
  }),
];

describe('buildMonthlyReport', () => {
  const r = buildMonthlyReport(data, '2026-11', 'USD');

  it('totales del mes y comparación con el anterior', () => {
    expect(r.totals.income).toBe(200_00);
    expect(r.totals.expense).toBe(50_00);
    expect(r.previous.net).toBe(200_00);
    expect(r.netChangePct).toBeCloseTo(-25);
    expect(r.marginPct).toBeCloseTo(75);
  });

  it('desglosa por categoría, método y moneda original', () => {
    expect(r.byCategoryIncome.map((c) => [c.name, c.total])).toEqual([['Ventas', 200_00]]);
    expect(r.byCategoryExpense.map((c) => [c.name, c.total])).toEqual([['Mercancía', 50_00]]);
    expect(r.byMethod.find((m) => m.method === 'zelle')).toMatchObject({
      label: 'Zelle',
      income: 100_00,
    });
    expect(r.byOriginalCurrency.find((c) => c.currency === 'CUP')).toEqual({
      currency: 'CUP',
      income: 44000_00,
      expense: 0,
    });
  });

  it('top clientes del mes', () => {
    expect(r.topClients[0]?.name).toBe('Paladar La Habanera');
  });
});

describe('csvRows', () => {
  it('ordena por fecha y usa coma decimal', () => {
    const rows = csvRows(data, csvDecimal);
    expect(rows.map((r) => r[0])).toEqual(['2026-10-10', '2026-11-01', '2026-11-02', '2026-11-03']);
    expect(rows[3]).toEqual([
      '2026-11-03',
      'Gasto',
      'Mercancía',
      'Importadora Isla Bella',
      'Efectivo',
      'USD',
      '100,00',
      '440,0000',
      '50,00',
      '44000,00',
      'Pollo; 20 cajas',
    ]);
  });
});

describe('reportFilename', () => {
  it('genera un nombre de archivo seguro', () => {
    expect(reportFilename('Distribuidora Del Valle', '2026-11', 'pdf')).toBe(
      'distribuidora-del-valle-2026-11.pdf',
    );
    expect(reportFilename('Cafetería Ñoño & Cía.', '2026-01', 'csv')).toBe(
      'cafeteria-nono-cia-2026-01.csv',
    );
  });
});
