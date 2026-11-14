/** Monedas que maneja una mipyme cubana. */
export const CURRENCIES = ['USD', 'CUP', 'EUR', 'MLC'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Monedas en las que se presentan los totales consolidados. */
export type ReportCurrency = Extract<Currency, 'USD' | 'CUP'>;

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'Dólar estadounidense',
  CUP: 'Peso cubano',
  EUR: 'Euro',
  MLC: 'Moneda libremente convertible',
};

export const PAYMENT_METHODS = [
  'efectivo',
  'transferencia',
  'zelle',
  'tropipay',
  'transfermovil',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  tropipay: 'TropiPay',
  transfermovil: 'Transfermóvil',
};

export const MOVEMENT_KINDS = ['ingreso', 'gasto'] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}
