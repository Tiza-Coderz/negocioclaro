/**
 * Fechas de calendario como strings ISO "YYYY-MM-DD".
 *
 * Los movimientos y las tasas son "del día", no instantes: trabajar con strings
 * evita los desfases de zona horaria de `Date` (UTC vs. America/Havana).
 */
export type IsoDate = string; // YYYY-MM-DD
export type YearMonth = string; // YYYY-MM

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Fecha de hoy en La Habana. */
export function todayInHavana(now: Date = new Date()): IsoDate {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Havana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function toYearMonth(date: IsoDate): YearMonth {
  return date.slice(0, 7);
}

function toUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Días desde `from` hasta `to` (positivo si `to` es posterior). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export function addMonths(ym: YearMonth, months: number): YearMonth {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Lista de meses terminando en `last`, en orden cronológico. */
export function lastMonths(last: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, i) => addMonths(last, i - count + 1));
}

export function monthRange(ym: YearMonth): { from: IsoDate; to: IsoDate } {
  const from = `${ym}-01`;
  const to = addDays(`${addMonths(ym, 1)}-01`, -1);
  return { from, to };
}

export function daysInMonth(ym: YearMonth): IsoDate[] {
  const { from, to } = monthRange(ym);
  const n = diffDays(from, to) + 1;
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatYearMonth(ym: YearMonth, short = false): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const name = MONTHS_ES[m - 1] ?? '';
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
}

export function formatDate(date: IsoDate, style: 'short' | 'long' = 'short'): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  if (style === 'short') return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return `${d} de ${MONTHS_ES[m - 1] ?? ''} de ${y}`;
}
