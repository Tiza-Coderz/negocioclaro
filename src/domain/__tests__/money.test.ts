import { describe, expect, it } from 'vitest';
import {
  centsToDecimalString,
  divRoundHalfAwayFromZero,
  formatMoney,
  formatNumber,
  parseScaled,
  toCents,
} from '../money';

describe('toCents', () => {
  it.each([
    ['0', 0],
    ['1', 100],
    ['1.5', 150],
    ['1,5', 150],
    ['1234.56', 123456],
    ['0.1', 10],
    ['-12.34', -1234],
    [' 7 500 ', 750000],
  ])('"%s" → %i', (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it('no arrastra errores de coma flotante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1.005)).toBe(101);
  });

  it('redondea el tercer decimal mitad hacia afuera', () => {
    expect(toCents('2.345')).toBe(235);
    expect(toCents('2.344')).toBe(234);
    expect(toCents('-2.345')).toBe(-235);
  });

  it.each(['', 'abc', '1.2.3', '1e5', 'NaN'])('rechaza "%s"', (input) => {
    expect(() => toCents(input)).toThrow(/inválido/);
  });

  it('rechaza Infinity', () => {
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('parseScaled', () => {
  it('escala tasas a 4 decimales', () => {
    expect(parseScaled('365.5', 4)).toBe(3655000n);
    expect(parseScaled('0.00005', 4)).toBe(1n);
  });
});

describe('divRoundHalfAwayFromZero', () => {
  it.each([
    [5n, 2n, 3n],
    [-5n, 2n, -3n],
    [5n, -2n, -3n],
    [4n, 3n, 1n],
    [7n, 3n, 2n],
    [0n, 9n, 0n],
  ])('%i / %i → %i', (n, d, expected) => {
    expect(divRoundHalfAwayFromZero(n, d)).toBe(expected);
  });

  it('falla al dividir por cero', () => {
    expect(() => divRoundHalfAwayFromZero(1n, 0n)).toThrow('División por cero');
  });
});

describe('centsToDecimalString', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [123456, '1234.56'],
    [-1, '-0.01'],
  ])('%i → %s', (cents, expected) => {
    expect(centsToDecimalString(cents)).toBe(expected);
  });
});

describe('formatMoney', () => {
  // Intl usa espacios especiales como separador de miles; normalizamos.
  const norm = (s: string) => s.replace(/\s/g, ' ');

  it('muestra el código ISO de la moneda', () => {
    expect(norm(formatMoney(123456, 'CUP'))).toBe('1 234,56 CUP');
  });

  it('usa signo menos tipográfico y opcionalmente el +', () => {
    expect(norm(formatMoney(-500, 'USD'))).toBe('−5,00 USD');
    expect(norm(formatMoney(500, 'USD', { signed: true }))).toBe('+5,00 USD');
  });

  it('formato compacto para tarjetas en móvil', () => {
    expect(norm(formatMoney(125_000_000, 'CUP', { compact: true }))).toBe('1,3 M CUP');
    expect(norm(formatMoney(1_530_000, 'CUP', { compact: true }))).toBe('15,3 mil CUP');
    expect(norm(formatMoney(950_00, 'USD', { compact: true }))).toBe('950 USD');
  });
});

describe('formatNumber', () => {
  const norm = (s: string) => s.replace(/\s/g, ' ');
  it.each([
    [0, 2, '0,00'],
    [1234567.891, 2, '1 234 567,89'],
    [-0.001, 2, '0,00'],
    [-1500, 0, '−1 500'],
    [365.5, 4, '365,5000'],
  ])('%d (%i dec) → %s', (n, dec, expected) => {
    expect(norm(formatNumber(n, dec))).toBe(expected);
  });

  it('puede recortar ceros finales', () => {
    expect(formatNumber(365.5, 4, 0)).toBe('365,5');
    expect(formatNumber(440, 2, 0)).toBe('440');
  });
});
