/**
 * Nómina mensual: neto por trabajador y totales por moneda, con su equivalente
 * consolidado en USD y CUP a la tasa del día de pago.
 */
import { convert } from './consolidation';
import type { Currency, ReportCurrency } from './currency';
import type { IsoDate } from './dates';
import type { Cents } from './money';
import type { RateTable } from './rates';

export interface PayrollLine {
  workerId: string;
  baseCents: Cents;
  bonusCents: Cents;
  deductionsCents: Cents;
  currency: Currency;
}

export function netPay(l: PayrollLine): Cents {
  return l.baseCents + l.bonusCents - l.deductionsCents;
}

export function validatePayrollLine(l: PayrollLine): string | null {
  if (l.baseCents < 0 || l.bonusCents < 0 || l.deductionsCents < 0)
    return 'Los importes no pueden ser negativos.';
  if (netPay(l) < 0) return 'Los descuentos no pueden superar el salario más las bonificaciones.';
  return null;
}

/** Total neto por moneda original (un movimiento de gasto por moneda al pagar). */
export function payrollTotalsByCurrency(
  lines: readonly PayrollLine[],
): Partial<Record<Currency, Cents>> {
  const out: Partial<Record<Currency, Cents>> = {};
  for (const l of lines) out[l.currency] = (out[l.currency] ?? 0) + netPay(l);
  return out;
}

/** Costo total de la nómina expresado en una moneda de reporte. */
export function payrollTotalIn(
  lines: readonly PayrollLine[],
  target: ReportCurrency,
  date: IsoDate,
  rates: RateTable,
): Cents | null {
  let total = 0;
  for (const [currency, cents] of Object.entries(payrollTotalsByCurrency(lines)) as [
    Currency,
    Cents,
  ][]) {
    const v = convert(cents, currency, target, date, rates);
    if (v === null) return null;
    total += v;
  }
  return total;
}
