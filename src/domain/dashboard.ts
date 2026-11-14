/**
 * Agregados del dashboard, calculados sobre movimientos ya consolidados.
 * Funciones puras: se prueban sin red ni BD y sirven igual para el PDF.
 */
import {
  amountIn,
  signedAmount,
  totals,
  type ConsolidatedMovement,
  type Totals,
} from './consolidation';
import type { ReportCurrency } from './currency';
import {
  addMonths,
  daysInMonth,
  monthRange,
  toYearMonth,
  type IsoDate,
  type YearMonth,
} from './dates';
import type { Cents } from './money';

export interface DashboardMovement extends ConsolidatedMovement {
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  clientId: string | null;
  clientName: string | null;
}

export interface MonthSummary extends Totals {
  month: YearMonth;
}

export function groupByMonth<T extends ConsolidatedMovement>(
  movements: readonly T[],
): Map<YearMonth, T[]> {
  const map = new Map<YearMonth, T[]>();
  for (const m of movements) {
    const key = toYearMonth(m.date);
    const list = map.get(key);
    if (list) list.push(m);
    else map.set(key, [m]);
  }
  return map;
}

/** Resumen por mes para la lista de meses dada (los meses sin datos salen en 0). */
export function monthlySeries(
  movements: readonly ConsolidatedMovement[],
  months: readonly YearMonth[],
  currency: ReportCurrency,
): MonthSummary[] {
  const grouped = groupByMonth(movements);
  return months.map((month) => ({ month, ...totals(grouped.get(month) ?? [], currency) }));
}

/** Variación porcentual; null si no hay base de comparación. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Margen neto sobre ingresos (%). */
export function netMargin(t: Totals): number | null {
  return t.income === 0 ? null : (t.net / t.income) * 100;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  total: Cents;
  share: number; // 0..1
}

/**
 * Gastos por categoría, de mayor a menor. Más allá de `maxSlices` se agrupan en
 * "Otros" para que la dona siga siendo legible en un móvil.
 */
export function expensesByCategory(
  movements: readonly DashboardMovement[],
  currency: ReportCurrency,
  maxSlices = 6,
): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  let grand = 0;
  for (const m of movements) {
    if (m.kind !== 'gasto') continue;
    const v = amountIn(m, currency);
    if (v === null) continue;
    grand += v;
    const key = m.categoryId ?? '∅';
    const slice = map.get(key) ?? {
      categoryId: m.categoryId,
      name: m.categoryName ?? 'Sin categoría',
      color: m.categoryColor ?? '#94a3b8',
      total: 0,
      share: 0,
    };
    slice.total += v;
    map.set(key, slice);
  }
  const sorted = [...map.values()].sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  if (rest.length > 0) {
    head.push({
      categoryId: null,
      name: 'Otros',
      color: '#cbd5e1',
      total: rest.reduce((s, x) => s + x.total, 0),
      share: 0,
    });
  }
  return head.map((s) => ({ ...s, share: grand === 0 ? 0 : s.total / grand }));
}

export interface CashflowPoint {
  date: IsoDate;
  income: Cents;
  expense: Cents;
  /** Saldo acumulado del mes hasta ese día. */
  balance: Cents;
}

/** Flujo de caja diario del mes (acumulado). Si es el mes en curso, corta en `today`. */
export function dailyCashflow(
  movements: readonly ConsolidatedMovement[],
  month: YearMonth,
  currency: ReportCurrency,
  today: IsoDate,
): CashflowPoint[] {
  const byDay = new Map<IsoDate, { income: Cents; expense: Cents }>();
  for (const m of movements) {
    if (toYearMonth(m.date) !== month) continue;
    const v = amountIn(m, currency);
    if (v === null) continue;
    const day = byDay.get(m.date) ?? { income: 0, expense: 0 };
    if (m.kind === 'ingreso') day.income += v;
    else day.expense += v;
    byDay.set(m.date, day);
  }
  let balance = 0;
  return daysInMonth(month)
    .filter((d) => d <= today)
    .map((date) => {
      const day = byDay.get(date) ?? { income: 0, expense: 0 };
      balance += day.income - day.expense;
      return { date, income: day.income, expense: day.expense, balance };
    });
}

export interface TopClient {
  clientId: string;
  name: string;
  total: Cents;
  count: number;
}

export function topClients(
  movements: readonly DashboardMovement[],
  currency: ReportCurrency,
  limit = 5,
): TopClient[] {
  const map = new Map<string, TopClient>();
  for (const m of movements) {
    if (m.kind !== 'ingreso' || !m.clientId) continue;
    const v = amountIn(m, currency);
    if (v === null) continue;
    const c = map.get(m.clientId) ?? {
      clientId: m.clientId,
      name: m.clientName ?? 'Cliente',
      total: 0,
      count: 0,
    };
    c.total += v;
    c.count += 1;
    map.set(m.clientId, c);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

/** Saldo neto de una lista (para el KPI "flujo del mes"). */
export function netOf(movements: readonly ConsolidatedMovement[], currency: ReportCurrency): Cents {
  return movements.reduce((s, m) => s + signedAmount(m, currency), 0);
}

/**
 * Totales del mes anterior para comparar de forma justa: si `month` es el mes en
 * curso, solo se cuentan los mismos días transcurridos (1 al día de hoy). Así el
 * día 14 no se compara medio mes contra un mes completo.
 */
export function comparablePrevious(
  movements: readonly ConsolidatedMovement[],
  month: YearMonth,
  today: IsoDate,
  currency: ReportCurrency,
): { totals: Totals; month: YearMonth; uptoDay: number | null } {
  const prevMonth = addMonths(month, -1);
  const inProgress = toYearMonth(today) === month;
  const lastDay = Number(monthRange(prevMonth).to.slice(8));
  const uptoDay = inProgress ? Math.min(Number(today.slice(8)), lastDay) : null;
  const subset = movements.filter(
    (m) =>
      toYearMonth(m.date) === prevMonth && (uptoDay === null || Number(m.date.slice(8)) <= uptoDay),
  );
  return { totals: totals(subset, currency), month: prevMonth, uptoDay };
}
