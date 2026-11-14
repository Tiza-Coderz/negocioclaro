import { describe, expect, it } from 'vitest';
import {
  debtAlerts,
  debtState,
  dueLabel,
  pendingByCurrency,
  reminderMessage,
  validatePayment,
  type Debt,
} from '../debts';

const TODAY = '2026-11-14';

function debt(partial: Partial<Debt>): Debt {
  return {
    id: 'd',
    direction: 'por_cobrar',
    counterpartyName: 'Paladar La Habanera',
    counterpartyPhone: '52134567',
    concept: 'Factura 0142',
    amountCents: 100_00,
    paidCents: 0,
    currency: 'USD',
    issuedOn: '2026-11-01',
    dueOn: '2026-11-20',
    ...partial,
  };
}

describe('debtState', () => {
  it.each([
    [{ dueOn: '2026-11-10' }, 'vencida', -4],
    [{ dueOn: '2026-11-14' }, 'vence_hoy', 0],
    [{ dueOn: '2026-11-17' }, 'por_vencer', 3],
    [{ dueOn: '2026-11-18' }, 'al_dia', 4],
    [{ dueOn: '2026-11-01', paidCents: 100_00 }, 'pagada', -13],
  ] as const)('%o → %s', (partial, status, days) => {
    const s = debtState(debt(partial), TODAY, 3);
    expect(s.status).toBe(status);
    expect(s.daysToDue).toBe(days);
  });

  it('calcula lo pendiente con pagos parciales', () => {
    expect(debtState(debt({ paidCents: 30_00 }), TODAY, 3).pendingCents).toBe(70_00);
  });
});

describe('dueLabel', () => {
  it('textos en español con singular/plural', () => {
    expect(dueLabel(debtState(debt({ dueOn: '2026-11-13' }), TODAY, 3))).toBe('Vencida hace 1 día');
    expect(dueLabel(debtState(debt({ dueOn: '2026-11-04' }), TODAY, 3))).toBe(
      'Vencida hace 10 días',
    );
    expect(dueLabel(debtState(debt({ dueOn: '2026-11-14' }), TODAY, 3))).toBe('Vence hoy');
    expect(dueLabel(debtState(debt({ dueOn: '2026-11-16' }), TODAY, 3))).toBe('Vence en 2 días');
  });
});

describe('debtAlerts', () => {
  it('solo vencidas o próximas, la más atrasada primero', () => {
    const alerts = debtAlerts(
      [
        debt({ id: 'ok', dueOn: '2026-12-30' }),
        debt({ id: 'pronto', dueOn: '2026-11-16' }),
        debt({ id: 'muy-vencida', dueOn: '2026-10-01' }),
        debt({ id: 'pagada', dueOn: '2026-10-01', paidCents: 100_00 }),
        debt({ id: 'vencida', dueOn: '2026-11-10' }),
      ],
      TODAY,
      3,
    );
    expect(alerts.map((a) => a.debt.id)).toEqual(['muy-vencida', 'vencida', 'pronto']);
  });
});

describe('pendingByCurrency', () => {
  it('suma por moneda y dirección sin convertir', () => {
    const r = pendingByCurrency(
      [
        debt({ amountCents: 100_00, paidCents: 40_00 }),
        debt({ amountCents: 50_00 }),
        debt({ currency: 'CUP', amountCents: 10000_00 }),
        debt({ direction: 'por_pagar', amountCents: 999_00 }),
      ],
      'por_cobrar',
    );
    expect(r).toEqual({ USD: 110_00, CUP: 10000_00 });
  });
});

describe('validatePayment', () => {
  it('no permite pagar de más ni cero', () => {
    const d = debt({ amountCents: 100_00, paidCents: 60_00 });
    expect(validatePayment(d, 40_00)).toBeNull();
    expect(validatePayment(d, 40_01)).toMatch(/mayor que lo pendiente/);
    expect(validatePayment(d, 0)).toMatch(/mayor que cero/);
  });
});

describe('reminderMessage', () => {
  it('redacta un recordatorio cortés', () => {
    const d = debt({ dueOn: '2026-11-10' });
    const msg = reminderMessage(d, debtState(d, TODAY, 3), 'Distribuidora Del Valle', '100,00 USD');
    expect(msg).toContain('le saluda Distribuidora Del Valle');
    expect(msg).toContain('venció el 10/11/2026');
    expect(msg).toContain('100,00 USD');
  });
});
