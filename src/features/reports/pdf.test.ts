// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { debtState } from '@/domain/debts';
import { buildMonthlyReport, type ReportMovement } from '@/domain/report';
import { renderMonthlyReportPdf } from './pdf';

function mv(p: Partial<ReportMovement> & Pick<ReportMovement, 'date' | 'kind'>): ReportMovement {
  return {
    amountCents: 100_00,
    currency: 'USD',
    method: 'efectivo',
    amountUsdCents: 100_00,
    amountCupCents: 44000_00,
    rateCupUsd: 440,
    categoryId: 'v',
    categoryName: 'Ventas mayoristas',
    categoryColor: '#2a78d6',
    clientId: 'c1',
    clientName: 'Paladar La Habanera',
    supplierName: null,
    note: null,
    ...p,
  };
}

describe('informe mensual en PDF', () => {
  it('genera un PDF válido con varias secciones', async () => {
    const movements = [
      mv({ date: '2026-10-03', kind: 'ingreso' }),
      mv({ date: '2026-11-02', kind: 'ingreso', method: 'zelle' }),
      mv({
        date: '2026-11-03',
        kind: 'ingreso',
        currency: 'CUP',
        amountCents: 44000_00,
        method: 'transfermovil',
      }),
      mv({
        date: '2026-11-04',
        kind: 'gasto',
        amountUsdCents: 60_00,
        categoryId: 'm',
        categoryName: 'Compra de mercancía',
        clientId: null,
        clientName: null,
        supplierName: 'Importadora Isla Bella',
      }),
    ];
    const debt = {
      id: 'd',
      direction: 'por_cobrar' as const,
      counterpartyName: 'Restaurante El Cerro',
      counterpartyPhone: null,
      concept: 'Factura 0151',
      amountCents: 650_00,
      paidCents: 0,
      currency: 'USD' as const,
      issuedOn: '2026-10-25',
      dueOn: '2026-11-12',
    };

    const blob = renderMonthlyReportPdf({
      report: buildMonthlyReport(movements, '2026-11', 'USD', '2026-12-01'),
      businessName: 'Distribuidora Del Valle',
      municipality: 'Boyeros',
      alerts: [{ debt, state: debtState(debt, '2026-11-14', 3) }],
      generatedOn: '2026-11-14',
      rateNote: 'Cada movimiento se convirtió con la tasa de su día. Tasa USD al cierre: 442 CUP.',
    });

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(3000);
  });
});
