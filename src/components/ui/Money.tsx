import type { Currency, MovementKind } from '@/domain/currency';
import { formatMoney, type Cents } from '@/domain/money';
import { cn } from './cn';

const CURRENCY_STYLES: Record<Currency, string> = {
  USD: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CUP: 'bg-sky-50 text-sky-800 ring-sky-200',
  EUR: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  MLC: 'bg-amber-50 text-amber-800 ring-amber-200',
};

export function CurrencyBadge({ currency, className }: { currency: Currency; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide ring-1 ring-inset',
        CURRENCY_STYLES[currency],
        className,
      )}
    >
      {currency}
    </span>
  );
}

/** Monto formateado; si se indica `kind`, colorea ingreso/gasto y añade signo. */
export function MoneyText({
  cents,
  currency,
  kind,
  compact,
  className,
}: {
  cents: Cents | null;
  currency: Currency;
  kind?: MovementKind;
  compact?: boolean;
  className?: string;
}) {
  if (cents === null) {
    return (
      <span className={cn('text-slate-400', className)} title="Falta la tasa de cambio de ese día">
        sin tasa
      </span>
    );
  }
  const signed = kind === 'gasto' ? -Math.abs(cents) : cents;
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        kind === 'ingreso' && 'text-income',
        kind === 'gasto' && 'text-expense',
        className,
      )}
    >
      {formatMoney(signed, currency, { compact: compact ?? false, signed: kind === 'ingreso' })}
    </span>
  );
}
