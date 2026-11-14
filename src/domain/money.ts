/**
 * Aritmética de dinero en centavos enteros.
 *
 * Nunca operamos montos con `number` decimal: 0.1 + 0.2 !== 0.3. Todo monto vive
 * como entero de centavos y las conversiones con tasas se hacen con BigInt y un
 * único redondeo final (mitad hacia afuera del cero, igual que `round()` de
 * Postgres sobre `numeric`).
 */
import type { Currency } from './currency';

/** Entero de centavos (o de la unidad mínima de la moneda). */
export type Cents = number;

/** Espacio fino no separable (separador de miles). */
export const NARROW_NBSP = String.fromCharCode(0x202f);

const DECIMAL_RE = /^(-)?(\d+)(?:[.,](\d+))?$/;

/**
 * Convierte un decimal (string o number) a un entero escalado por 10^scale,
 * redondeando mitad hacia afuera del cero. Acepta coma o punto decimal.
 */
export function parseScaled(input: string | number, scale: number): bigint {
  const raw = typeof input === 'number' ? numberToPlainString(input) : input.trim();
  const match = DECIMAL_RE.exec(raw.replace(/\s/g, ''));
  if (!match) throw new Error(`Monto inválido: "${String(input)}"`);
  const [, sign, intPart = '0', fracPart = ''] = match;
  const padded = (fracPart + '0'.repeat(scale + 1)).slice(0, scale + 1);
  let scaled = BigInt(intPart + padded.slice(0, scale));
  if (Number(padded[scale]) >= 5) scaled += 1n;
  return sign ? -scaled : scaled;
}

function numberToPlainString(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`Monto inválido: ${n}`);
  // toFixed(10) evita la notación exponencial en números pequeños/grandes.
  return n.toFixed(10);
}

/** "1234.56" → 123456 */
export function toCents(input: string | number): Cents {
  const value = parseScaled(input, 2);
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('Monto fuera de rango');
  }
  return Number(value);
}

/** 123456 → 1234.56 (solo para presentar o enviar a la BD). */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

/** 123456 → "1234.56" exacto, sin pasar por float. */
export function centsToDecimalString(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const int = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${int}.${frac}`;
}

/**
 * División entera con redondeo mitad hacia afuera del cero.
 * Equivale a `round(numerator / denominator)` de Postgres para `numeric`.
 */
export function divRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('División por cero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (d * 2n);
  return negative ? -q : q;
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Formato numérico propio, sin depender del ICU del navegador (muchos no traen
 * "es-CU" y caen a inglés): miles con espacio fino no separable y coma decimal.
 *   1234.5 → "1 234,50"
 */
export function formatNumber(value: number, decimals = 2, minDecimals = decimals): string {
  const fixed = Math.abs(value).toFixed(decimals);
  let [int = '0', frac = ''] = fixed.split('.');
  frac = frac.replace(/0+$/, '').padEnd(minDecimals, '0');
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : '';
  return `${sign}${int}${frac ? `,${frac}` : ''}`;
}

/** 1 250 000 → "1,3 M"; 15 300 → "15,3 mil". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, 1, 0)} M`;
  if (abs >= 10_000) return `${sign}${formatNumber(abs / 1_000, 1, 0)} mil`;
  return `${sign}${formatNumber(abs, 0, 0)}`;
}

/**
 * Formatea un monto: "1 234,56 USD". Usamos el código ISO detrás del número en
 * lugar del símbolo porque "$" es ambiguo en Cuba (¿CUP o USD?).
 */
export function formatMoney(
  cents: Cents,
  currency: Currency,
  options: { compact?: boolean; signed?: boolean } = {},
): string {
  const { compact = false, signed = false } = options;
  const abs = fromCents(Math.abs(cents));
  const value = compact ? formatCompact(abs) : formatNumber(abs);
  const sign = cents < 0 ? '−' : signed && cents > 0 ? '+' : '';
  return `${sign}${value} ${currency}`;
}
