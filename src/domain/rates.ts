/**
 * Tasas de cambio por fecha.
 *
 * Pivote: cada tasa expresa cuántos CUP vale 1 unidad de la moneda en un día.
 *   USD 2026-10-01 → 440   (1 USD = 440 CUP)
 *   EUR 2026-10-01 → 480
 *   MLC 2026-10-01 → 270
 * CUP siempre vale 1. Cualquier conversión A→B = monto · tasa(A) / tasa(B).
 *
 * Regla de la "tasa del día": se usa la tasa con fecha igual a la del
 * movimiento; si ese día no se registró, la última anterior. Si no hay ninguna
 * anterior, no se inventa: el resultado es `null` (movimiento "sin tasa").
 */
import type { Currency } from './currency';
import type { IsoDate } from './dates';
import { parseScaled } from './money';

/** Las tasas se guardan con 4 decimales (numeric(14,4) en la BD). */
export const RATE_SCALE = 4;
const RATE_FACTOR = 10n ** BigInt(RATE_SCALE);

export interface ExchangeRate {
  date: IsoDate;
  currency: Exclude<Currency, 'CUP'>;
  /** CUP por 1 unidad de `currency`. */
  cupPerUnit: number | string;
}

export interface ResolvedRate {
  /** Fecha de la tasa realmente usada (puede ser anterior a la pedida). */
  date: IsoDate | null;
  /** CUP por unidad, escalado por 10^RATE_SCALE. */
  scaled: bigint;
}

const CUP_RATE: ResolvedRate = { date: null, scaled: RATE_FACTOR };

/**
 * Índice de tasas por moneda, ordenado por fecha, con búsqueda binaria.
 * Construirlo una vez y reutilizarlo al consolidar cientos de movimientos.
 */
export class RateTable {
  private readonly byCurrency = new Map<Currency, { date: IsoDate; scaled: bigint }[]>();

  constructor(rates: readonly ExchangeRate[]) {
    for (const r of rates) {
      const scaled = parseScaled(r.cupPerUnit, RATE_SCALE);
      if (scaled <= 0n) throw new Error(`Tasa inválida para ${r.currency} el ${r.date}`);
      const list = this.byCurrency.get(r.currency) ?? [];
      list.push({ date: r.date, scaled });
      this.byCurrency.set(r.currency, list);
    }
    for (const list of this.byCurrency.values()) {
      list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  }

  /** Tasa vigente para `currency` en `date`, o `null` si no hay ninguna anterior. */
  resolve(currency: Currency, date: IsoDate): ResolvedRate | null {
    if (currency === 'CUP') return CUP_RATE;
    const list = this.byCurrency.get(currency);
    if (!list || list.length === 0) return null;

    // Última posición con list[i].date <= date
    let lo = 0;
    let hi = list.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const entry = list[mid];
      if (entry && entry.date <= date) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const hit = list[found];
    return hit ? { date: hit.date, scaled: hit.scaled } : null;
  }

  /** Tasa como número (para mostrar). */
  resolveNumber(currency: Currency, date: IsoDate): number | null {
    const r = this.resolve(currency, date);
    return r ? Number(r.scaled) / Number(RATE_FACTOR) : null;
  }
}

/** Variación porcentual entre dos tasas (para "subió 2,3 % desde ayer"). */
export function rateChangePct(previous: number, current: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
