/**
 * Consolidación multi-moneda: cada movimiento se expresa en USD y en CUP con la
 * tasa del día del movimiento.
 *
 * Esta lógica está replicada en SQL (supabase/migrations/*_consolidation.sql)
 * para que la BD guarde la foto consolidada. Los casos de
 * `__fixtures__/consolidation-cases.json` se prueban contra ambas.
 */
import type { Currency, MovementKind, ReportCurrency } from './currency';
import type { IsoDate } from './dates';
import { divRoundHalfAwayFromZero, type Cents } from './money';
import { RATE_SCALE, type RateTable } from './rates';

const RATE_FACTOR = 10n ** BigInt(RATE_SCALE);

export interface MovementInput {
  date: IsoDate;
  kind: MovementKind;
  amountCents: Cents;
  currency: Currency;
}

export interface Consolidation {
  amountUsdCents: Cents | null;
  amountCupCents: Cents | null;
  /** Fecha de la tasa USD usada. */
  rateDate: IsoDate | null;
  /** CUP por USD usado. */
  rateCupUsd: number | null;
  missingRate: boolean;
}

const MISSING: Consolidation = {
  amountUsdCents: null,
  amountCupCents: null,
  rateDate: null,
  rateCupUsd: null,
  missingRate: true,
};

/**
 * Convierte `amountCents` de `from` a `to` con las tasas vigentes en `date`.
 * Devuelve `null` si falta alguna tasa necesaria.
 */
export function convert(
  amountCents: Cents,
  from: Currency,
  to: Currency,
  date: IsoDate,
  rates: RateTable,
): Cents | null {
  if (from === to) return amountCents;
  const rFrom = rates.resolve(from, date);
  const rTo = rates.resolve(to, date);
  if (!rFrom || !rTo) return null;
  return Number(divRoundHalfAwayFromZero(BigInt(amountCents) * rFrom.scaled, rTo.scaled));
}

export function consolidate(m: MovementInput, rates: RateTable): Consolidation {
  // Para expresar en USD y CUP siempre hace falta la tasa del USD
  // (aunque el movimiento sea en CUP) y la de la moneda del movimiento.
  const usd = rates.resolve('USD', m.date);
  const own = rates.resolve(m.currency, m.date);
  if (!usd || !own) return MISSING;

  const amount = BigInt(m.amountCents);
  const amountCup = divRoundHalfAwayFromZero(amount * own.scaled, RATE_FACTOR);
  const amountUsd =
    m.currency === 'USD' ? amount : divRoundHalfAwayFromZero(amount * own.scaled, usd.scaled);

  return {
    amountUsdCents: Number(amountUsd),
    amountCupCents: Number(amountCup),
    rateDate: usd.date,
    rateCupUsd: Number(usd.scaled) / Number(RATE_FACTOR),
    missingRate: false,
  };
}

/** Un movimiento ya consolidado (como llega de la BD). */
export interface ConsolidatedMovement {
  date: IsoDate;
  kind: MovementKind;
  amountUsdCents: Cents | null;
  amountCupCents: Cents | null;
}

export function amountIn(m: ConsolidatedMovement, currency: ReportCurrency): Cents | null {
  return currency === 'USD' ? m.amountUsdCents : m.amountCupCents;
}

/** Ingreso suma, gasto resta. */
export function signedAmount(m: ConsolidatedMovement, currency: ReportCurrency): Cents {
  const v = amountIn(m, currency) ?? 0;
  return m.kind === 'ingreso' ? v : -v;
}

export interface Totals {
  income: Cents;
  expense: Cents;
  net: Cents;
  count: number;
  /** Movimientos excluidos de los totales por no tener tasa. */
  missingRate: number;
}

export function totals(
  movements: readonly ConsolidatedMovement[],
  currency: ReportCurrency,
): Totals {
  let income = 0;
  let expense = 0;
  let missingRate = 0;
  for (const m of movements) {
    const v = amountIn(m, currency);
    if (v === null) {
      missingRate++;
      continue;
    }
    if (m.kind === 'ingreso') income += v;
    else expense += v;
  }
  return { income, expense, net: income - expense, count: movements.length, missingRate };
}

/** Totales por moneda original, sin convertir (útil para "¿cuánto efectivo en CUP tengo?"). */
export function totalsByOriginalCurrency(
  movements: readonly (MovementInput & { amountCents: Cents })[],
): Record<Currency, { income: Cents; expense: Cents }> {
  const out: Record<Currency, { income: Cents; expense: Cents }> = {
    USD: { income: 0, expense: 0 },
    CUP: { income: 0, expense: 0 },
    EUR: { income: 0, expense: 0 },
    MLC: { income: 0, expense: 0 },
  };
  for (const m of movements) {
    const bucket = out[m.currency];
    if (m.kind === 'ingreso') bucket.income += m.amountCents;
    else bucket.expense += m.amountCents;
  }
  return out;
}
