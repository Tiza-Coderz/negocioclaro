/**
 * Cuentas por cobrar y por pagar: estado según vencimiento y alertas.
 */
import type { Currency } from './currency';
import { diffDays, type IsoDate } from './dates';
import type { Cents } from './money';

export type DebtDirection = 'por_cobrar' | 'por_pagar';
export type DebtStatus = 'pagada' | 'vencida' | 'vence_hoy' | 'por_vencer' | 'al_dia';

export interface Debt {
  id: string;
  direction: DebtDirection;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  concept: string;
  amountCents: Cents;
  paidCents: Cents;
  currency: Currency;
  issuedOn: IsoDate;
  dueOn: IsoDate;
}

export interface DebtState {
  status: DebtStatus;
  pendingCents: Cents;
  /** Días hasta el vencimiento (negativo = días de atraso). */
  daysToDue: number;
}

export function debtState(d: Debt, today: IsoDate, alertDaysBefore: number): DebtState {
  const pendingCents = Math.max(0, d.amountCents - d.paidCents);
  const daysToDue = diffDays(today, d.dueOn);
  let status: DebtStatus;
  if (pendingCents === 0) status = 'pagada';
  else if (daysToDue < 0) status = 'vencida';
  else if (daysToDue === 0) status = 'vence_hoy';
  else if (daysToDue <= alertDaysBefore) status = 'por_vencer';
  else status = 'al_dia';
  return { status, pendingCents, daysToDue };
}

export const DEBT_STATUS_LABEL: Record<DebtStatus, string> = {
  pagada: 'Pagada',
  vencida: 'Vencida',
  vence_hoy: 'Vence hoy',
  por_vencer: 'Por vencer',
  al_dia: 'Al día',
};

/** Texto humano del vencimiento: "vence en 3 días", "vencida hace 10 días". */
export function dueLabel(state: DebtState): string {
  const n = Math.abs(state.daysToDue);
  const days = n === 1 ? '1 día' : `${n} días`;
  switch (state.status) {
    case 'pagada':
      return 'Pagada';
    case 'vencida':
      return `Vencida hace ${days}`;
    case 'vence_hoy':
      return 'Vence hoy';
    default:
      return `Vence en ${days}`;
  }
}

export interface DebtAlert {
  debt: Debt;
  state: DebtState;
}

/** Cuentas que requieren atención (vencidas, vencen hoy o pronto), más urgentes primero. */
export function debtAlerts(
  debts: readonly Debt[],
  today: IsoDate,
  alertDaysBefore: number,
): DebtAlert[] {
  return debts
    .map((debt) => ({ debt, state: debtState(debt, today, alertDaysBefore) }))
    .filter(
      ({ state }) =>
        state.status === 'vencida' || state.status === 'vence_hoy' || state.status === 'por_vencer',
    )
    .sort((a, b) => a.state.daysToDue - b.state.daysToDue);
}

/** Pendiente total por moneda (no se convierte: una deuda en USD se cobra en USD). */
export function pendingByCurrency(
  debts: readonly Debt[],
  direction: DebtDirection,
): Partial<Record<Currency, Cents>> {
  const out: Partial<Record<Currency, Cents>> = {};
  for (const d of debts) {
    if (d.direction !== direction) continue;
    const pending = Math.max(0, d.amountCents - d.paidCents);
    if (pending > 0) out[d.currency] = (out[d.currency] ?? 0) + pending;
  }
  return out;
}

/** Valida un pago: positivo y no mayor que lo pendiente. */
export function validatePayment(d: Debt, paymentCents: Cents): string | null {
  const pending = d.amountCents - d.paidCents;
  if (paymentCents <= 0) return 'El pago debe ser mayor que cero.';
  if (paymentCents > pending) return 'El pago no puede ser mayor que lo pendiente.';
  return null;
}

/** Mensaje de WhatsApp para recordar un cobro, con trato de usted. */
export function reminderMessage(
  d: Debt,
  state: DebtState,
  businessName: string,
  formatted: string,
): string {
  const when =
    state.status === 'vencida'
      ? `venció el ${d.dueOn.split('-').reverse().join('/')}`
      : `vence el ${d.dueOn.split('-').reverse().join('/')}`;
  return `Buenas, le saluda ${businessName}. Le recordamos que la ${d.concept} por ${formatted} ${when}. ¿Cuándo podríamos coordinar el pago? Muchas gracias.`;
}
