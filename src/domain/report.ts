/**
 * Datos del informe mensual (PDF) y de la exportación CSV. Puro y testeable:
 * la capa de presentación (jsPDF, CSV) solo da formato.
 */
import { totals, type Totals } from './consolidation';
import {
  PAYMENT_METHOD_LABELS,
  type Currency,
  type MovementKind,
  type PaymentMethod,
  type ReportCurrency,
} from './currency';
import {
  expensesByCategory,
  groupByMonth,
  netMargin,
  percentChange,
  topClients,
  type CategorySlice,
  type DashboardMovement,
  type TopClient,
} from './dashboard';
import { addMonths, type IsoDate, type YearMonth } from './dates';
import { fromCents, type Cents } from './money';

export interface ReportMovement extends DashboardMovement {
  amountCents: Cents;
  currency: Currency;
  method: PaymentMethod;
  supplierName: string | null;
  note: string | null;
  rateCupUsd: number | null;
}

export interface MonthlyReport {
  month: YearMonth;
  currency: ReportCurrency;
  totals: Totals;
  previous: Totals;
  netChangePct: number | null;
  marginPct: number | null;
  byCategoryExpense: CategorySlice[];
  byCategoryIncome: CategorySlice[];
  topClients: TopClient[];
  byMethod: { method: PaymentMethod; label: string; income: Cents; expense: Cents }[];
  byOriginalCurrency: { currency: Currency; income: Cents; expense: Cents }[];
}

export function buildMonthlyReport(
  movements: readonly ReportMovement[],
  month: YearMonth,
  currency: ReportCurrency,
): MonthlyReport {
  const grouped = groupByMonth(movements);
  const current = grouped.get(month) ?? [];
  const prev = grouped.get(addMonths(month, -1)) ?? [];
  const t = totals(current, currency);
  const p = totals(prev, currency);

  const methods = new Map<PaymentMethod, { income: Cents; expense: Cents }>();
  const original = new Map<Currency, { income: Cents; expense: Cents }>();
  for (const m of current) {
    const v = currency === 'USD' ? m.amountUsdCents : m.amountCupCents;
    if (v !== null) {
      const b = methods.get(m.method) ?? { income: 0, expense: 0 };
      if (m.kind === 'ingreso') b.income += v;
      else b.expense += v;
      methods.set(m.method, b);
    }
    const o = original.get(m.currency) ?? { income: 0, expense: 0 };
    if (m.kind === 'ingreso') o.income += m.amountCents;
    else o.expense += m.amountCents;
    original.set(m.currency, o);
  }

  // Para la tabla de ingresos reutilizamos la función de gastos invirtiendo el tipo.
  const asExpense = current
    .filter((m) => m.kind === 'ingreso')
    .map((m) => ({ ...m, kind: 'gasto' as MovementKind }));

  return {
    month,
    currency,
    totals: t,
    previous: p,
    netChangePct: percentChange(t.net, p.net),
    marginPct: netMargin(t),
    byCategoryExpense: expensesByCategory(current, currency, 20),
    byCategoryIncome: expensesByCategory(asExpense, currency, 20),
    topClients: topClients(current, currency, 5),
    byMethod: [...methods.entries()]
      .map(([method, v]) => ({ method, label: PAYMENT_METHOD_LABELS[method], ...v }))
      .sort((a, b) => b.income + b.expense - (a.income + a.expense)),
    byOriginalCurrency: [...original.entries()].map(([c, v]) => ({ currency: c, ...v })),
  };
}

export const CSV_HEADERS = [
  'Fecha',
  'Tipo',
  'Categoría',
  'Cliente / Proveedor',
  'Método',
  'Moneda',
  'Monto',
  'Tasa USD (CUP)',
  'Monto USD',
  'Monto CUP',
  'Nota',
] as const;

/** Filas del CSV para el contador, en orden cronológico. */
export function csvRows(
  movements: readonly ReportMovement[],
  dec: (n: number | null | undefined, decimals?: number) => string,
): (string | null)[][] {
  return [...movements]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((m) => [
      m.date,
      m.kind === 'ingreso' ? 'Ingreso' : 'Gasto',
      m.categoryName,
      m.clientName ?? m.supplierName,
      PAYMENT_METHOD_LABELS[m.method],
      m.currency,
      dec(fromCents(m.amountCents)),
      dec(m.rateCupUsd, 4),
      dec(m.amountUsdCents === null ? null : fromCents(m.amountUsdCents)),
      dec(m.amountCupCents === null ? null : fromCents(m.amountCupCents)),
      m.note,
    ]);
}

export function reportFilename(businessName: string, month: YearMonth, ext: 'pdf' | 'csv'): string {
  const slug = businessName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${month}.${ext}`;
}

export type { IsoDate };
