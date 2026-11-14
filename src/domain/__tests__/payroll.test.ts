import { describe, expect, it } from 'vitest';
import {
  netPay,
  payrollTotalIn,
  payrollTotalsByCurrency,
  validatePayrollLine,
  type PayrollLine,
} from '../payroll';
import { RateTable } from '../rates';

const lines: PayrollLine[] = [
  { workerId: 'a', baseCents: 9000_00, bonusCents: 1000_00, deductionsCents: 0, currency: 'CUP' },
  { workerId: 'b', baseCents: 8000_00, bonusCents: 0, deductionsCents: 500_00, currency: 'CUP' },
  { workerId: 'c', baseCents: 120_00, bonusCents: 20_00, deductionsCents: 0, currency: 'USD' },
];

describe('nómina', () => {
  it('neto = base + bono − descuentos', () => {
    expect(netPay(lines[0]!)).toBe(10000_00);
    expect(netPay(lines[1]!)).toBe(7500_00);
  });

  it('totales por moneda', () => {
    expect(payrollTotalsByCurrency(lines)).toEqual({ CUP: 17500_00, USD: 140_00 });
  });

  it('total consolidado en CUP y USD', () => {
    const rates = new RateTable([{ date: '2026-10-31', currency: 'USD', cupPerUnit: 400 }]);
    expect(payrollTotalIn(lines, 'CUP', '2026-10-31', rates)).toBe(17500_00 + 56000_00);
    expect(payrollTotalIn(lines, 'USD', '2026-10-31', rates)).toBe(4375 + 140_00);
  });

  it('sin tasa devuelve null', () => {
    expect(payrollTotalIn(lines, 'USD', '2026-10-31', new RateTable([]))).toBeNull();
  });

  it('valida descuentos excesivos', () => {
    expect(validatePayrollLine({ ...lines[0]!, deductionsCents: 20000_00 })).toMatch(/descuentos/);
    expect(validatePayrollLine(lines[0]!)).toBeNull();
  });
});
