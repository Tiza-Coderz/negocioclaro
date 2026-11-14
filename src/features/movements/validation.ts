import {
  isCurrency,
  PAYMENT_METHODS,
  type Currency,
  type MovementKind,
  type PaymentMethod,
} from '@/domain/currency';
import { addDays, isIsoDate, todayInHavana } from '@/domain/dates';
import { toCents, type Cents } from '@/domain/money';

export interface MovementFormValues {
  kind: MovementKind;
  date: string;
  amount: string;
  currency: string;
  method: string;
  categoryId: string;
  clientId: string;
  supplierId: string;
  note: string;
}

export type MovementFormErrors = Partial<Record<keyof MovementFormValues, string>>;

export interface ValidMovement {
  kind: MovementKind;
  date: string;
  amountCents: Cents;
  currency: Currency;
  method: PaymentMethod;
  categoryId: string | null;
  clientId: string | null;
  supplierId: string | null;
  note: string | null;
}

/** Límite de seguridad contra errores de tecleo (un cero de más). */
export const MAX_AMOUNT_CENTS = 100_000_000_00; // 100 millones

/** Métodos que tienen sentido para cada moneda (evita "Zelle en CUP"). */
export const METHODS_BY_CURRENCY: Record<Currency, PaymentMethod[]> = {
  CUP: ['efectivo', 'transferencia', 'transfermovil'],
  USD: ['efectivo', 'zelle', 'tropipay', 'transferencia'],
  EUR: ['efectivo', 'tropipay', 'transferencia'],
  MLC: ['transferencia', 'transfermovil'],
};

export function validateMovement(
  v: MovementFormValues,
  today: string = todayInHavana(),
): { ok: true; value: ValidMovement } | { ok: false; errors: MovementFormErrors } {
  const errors: MovementFormErrors = {};

  let amountCents = 0;
  try {
    amountCents = toCents(v.amount);
    if (amountCents <= 0) errors.amount = 'El monto debe ser mayor que cero.';
    else if (amountCents > MAX_AMOUNT_CENTS)
      errors.amount = 'El monto es demasiado alto. Revise si sobra un cero.';
  } catch {
    errors.amount = v.amount.trim()
      ? 'Escriba solo números, p. ej. 1500 o 25,50.'
      : 'Indique el monto.';
  }

  if (!isCurrency(v.currency)) errors.currency = 'Elija la moneda.';

  if (!isIsoDate(v.date)) errors.date = 'Indique una fecha válida.';
  else if (v.date > addDays(today, 1)) errors.date = 'La fecha no puede ser futura.';

  const method = v.method as PaymentMethod;
  if (!(PAYMENT_METHODS as readonly string[]).includes(v.method))
    errors.method = 'Elija cómo se pagó.';
  else if (isCurrency(v.currency) && !METHODS_BY_CURRENCY[v.currency].includes(method))
    errors.method = `No es habitual pagar en ${v.currency} por este método.`;

  if (v.note.length > 500) errors.note = 'La nota no puede pasar de 500 caracteres.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: v.kind,
      date: v.date,
      amountCents,
      currency: v.currency as Currency,
      method,
      categoryId: v.categoryId || null,
      clientId: v.kind === 'ingreso' ? v.clientId || null : null,
      supplierId: v.kind === 'gasto' ? v.supplierId || null : null,
      note: v.note.trim() || null,
    },
  };
}
