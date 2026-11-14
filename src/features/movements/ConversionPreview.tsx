import type { Currency } from '@/domain/currency';
import { consolidate } from '@/domain/consolidation';
import { formatDate } from '@/domain/dates';
import { formatMoney, toCents } from '@/domain/money';
import type { RateTable } from '@/domain/rates';

/** "≈ 3,41 USD · 1 500,00 CUP (tasa 440 del 14/11/2026)" mientras el usuario escribe. */
export function ConversionPreview({
  amount,
  currency,
  date,
  table,
}: {
  amount: string;
  currency: Currency;
  date: string;
  table: RateTable;
}) {
  let cents: number;
  try {
    cents = toCents(amount);
  } catch {
    return null;
  }
  if (cents <= 0) return null;

  const c = consolidate({ date, kind: 'ingreso', amountCents: cents, currency }, table);
  if (c.missingRate) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
        No hay tasa registrada para esa fecha o antes. Se guardará, pero no contará en los totales
        hasta que registre la tasa.
      </p>
    );
  }
  return (
    <p className="tabular rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700" role="status">
      ≈ {currency !== 'USD' && <strong>{formatMoney(c.amountUsdCents ?? 0, 'USD')}</strong>}
      {currency !== 'USD' && currency !== 'CUP' && ' · '}
      {currency !== 'CUP' && <strong>{formatMoney(c.amountCupCents ?? 0, 'CUP')}</strong>}
      <span className="block text-xs text-slate-500">
        Tasa USD {c.rateCupUsd} CUP{c.rateDate ? ` del ${formatDate(c.rateDate)}` : ''}
      </span>
    </p>
  );
}
