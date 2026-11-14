import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  formatDate,
  formatYearMonth,
  isIsoDate,
  lastMonths,
  monthRange,
  todayInHavana,
} from '../dates';

describe('fechas ISO', () => {
  it('valida fechas reales', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('26-2-1')).toBe(false);
  });

  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-11-14')).toBe(13);
    expect(diffDays('2026-11-14', '2026-11-01')).toBe(-13);
  });

  it('suma meses', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(lastMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('rango y días de un mes', () => {
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(daysInMonth('2026-04')).toHaveLength(30);
  });

  it('hoy en La Habana (UTC-5 en noviembre)', () => {
    // 03:00 UTC del 15 = 22:00 del 14 en La Habana
    expect(todayInHavana(new Date('2026-11-15T03:00:00Z'))).toBe('2026-11-14');
  });

  it('formatea en español', () => {
    expect(formatYearMonth('2026-10')).toBe('octubre 2026');
    expect(formatYearMonth('2026-10', true)).toBe('oct 26');
    expect(formatDate('2026-03-05')).toBe('05/03/2026');
    expect(formatDate('2026-03-05', 'long')).toBe('5 de marzo de 2026');
  });
});
