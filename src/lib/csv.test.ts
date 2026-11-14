import { describe, expect, it } from 'vitest';
import { BOM, csvDecimal, escapeCsv, toCsv } from './csv';

describe('escapeCsv', () => {
  it.each([
    ['simple', 'simple'],
    ['con;punto y coma', '"con;punto y coma"'],
    ['con "comillas"', '"con ""comillas"""'],
    ['dos\nlíneas', '"dos\nlíneas"'],
    [null, ''],
    [12.5, '12.5'],
  ])('%s → %s', (input, expected) => {
    expect(escapeCsv(input)).toBe(expected);
  });

  it('neutraliza fórmulas de Excel en textos', () => {
    expect(escapeCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsv('-5 cajas')).toBe("'-5 cajas");
  });
});

describe('csvDecimal', () => {
  it('usa coma decimal', () => {
    expect(csvDecimal(1234.5)).toBe('1234,50');
    expect(csvDecimal(365.5, 4)).toBe('365,5000');
    expect(csvDecimal(null)).toBe('');
  });
});

describe('toCsv', () => {
  it('añade BOM, separa con ; y termina en CRLF', () => {
    const csv = toCsv(['Fecha', 'Nota'], [['2026-11-14', 'Pollo; aceite']]);
    expect(csv).toBe(BOM + 'Fecha;Nota\r\n2026-11-14;"Pollo; aceite"\r\n');
  });
});
