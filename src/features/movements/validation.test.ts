import { describe, expect, it } from 'vitest';
import { validateMovement, type MovementFormValues } from './validation';

const base: MovementFormValues = {
  kind: 'ingreso',
  date: '2026-11-14',
  amount: '1500',
  currency: 'CUP',
  method: 'efectivo',
  categoryId: 'cat-1',
  clientId: 'cli-1',
  supplierId: 'sup-1',
  note: '  Pedido semanal  ',
};

describe('validateMovement', () => {
  it('acepta un ingreso válido y normaliza campos', () => {
    const r = validateMovement(base, '2026-11-14');
    expect(r).toEqual({
      ok: true,
      value: {
        kind: 'ingreso',
        date: '2026-11-14',
        amountCents: 150000,
        currency: 'CUP',
        method: 'efectivo',
        categoryId: 'cat-1',
        clientId: 'cli-1',
        supplierId: null, // un ingreso no tiene proveedor
        note: 'Pedido semanal',
      },
    });
  });

  it('un gasto descarta el cliente', () => {
    const r = validateMovement({ ...base, kind: 'gasto' }, '2026-11-14');
    expect(r.ok && r.value.clientId).toBe(null);
    expect(r.ok && r.value.supplierId).toBe('sup-1');
  });

  it('acepta coma decimal', () => {
    const r = validateMovement({ ...base, amount: '25,50' }, '2026-11-14');
    expect(r.ok && r.value.amountCents).toBe(2550);
  });

  it.each([
    ['', 'Indique el monto.'],
    ['abc', 'Escriba solo números, p. ej. 1500 o 25,50.'],
    ['0', 'El monto debe ser mayor que cero.'],
    ['-5', 'El monto debe ser mayor que cero.'],
    ['1000000000', 'El monto es demasiado alto. Revise si sobra un cero.'],
  ])('monto "%s" → %s', (amount, message) => {
    const r = validateMovement({ ...base, amount }, '2026-11-14');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.amount).toBe(message);
  });

  it('rechaza fechas futuras (con 1 día de margen por zona horaria)', () => {
    expect(validateMovement({ ...base, date: '2026-11-15' }, '2026-11-14').ok).toBe(true);
    expect(validateMovement({ ...base, date: '2026-11-16' }, '2026-11-14').ok).toBe(false);
  });

  it('rechaza combinaciones moneda/método que no existen (Zelle en CUP)', () => {
    const r = validateMovement({ ...base, method: 'zelle' }, '2026-11-14');
    expect(!r.ok && r.errors.method).toMatch(/CUP/);
  });

  it('rechaza moneda desconocida', () => {
    const r = validateMovement({ ...base, currency: 'BTC' }, '2026-11-14');
    expect(!r.ok && r.errors.currency).toBeTruthy();
  });

  it('categoría vacía queda como null', () => {
    const r = validateMovement({ ...base, categoryId: '' }, '2026-11-14');
    expect(r.ok && r.value.categoryId).toBeNull();
  });
});
