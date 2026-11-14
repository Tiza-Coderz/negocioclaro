import { Icon } from '@/components/ui/Icon';
import { CurrencyBadge, MoneyText } from '@/components/ui/Money';
import type { Movement } from '@/data/repositories/movements';
import { PAYMENT_METHOD_LABELS } from '@/domain/currency';

export function MovementRow({
  movement: m,
  onClick,
}: {
  movement: Movement;
  onClick?: () => void;
}) {
  const title =
    m.clientName ??
    m.supplierName ??
    m.categoryName ??
    (m.kind === 'ingreso' ? 'Ingreso' : 'Gasto');
  const subtitle = [
    m.categoryName !== title ? m.categoryName : null,
    PAYMENT_METHOD_LABELS[m.method],
    m.note,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus-visible:bg-slate-50"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${m.categoryColor ?? '#64748b'}1a` }}
        aria-hidden
      >
        {m.categoryIcon ?? (m.kind === 'ingreso' ? '↘' : '↗')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-slate-900">{title}</span>
          {m.attachmentPath && <Icon name="paperclip" className="size-3.5 text-slate-400" />}
          {m.source === 'rapido' && (
            <span
              className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500"
              title="Registro rápido"
            >
              ⚡
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="flex items-center gap-1.5">
          <MoneyText
            cents={m.amountCents}
            currency={m.currency}
            kind={m.kind}
            className="font-semibold"
          />
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          {m.currency !== 'USD' ? (
            <MoneyText cents={m.amountUsdCents} currency="USD" />
          ) : (
            <MoneyText cents={m.amountCupCents} currency="CUP" />
          )}
          <CurrencyBadge currency={m.currency} className="sr-only" />
        </span>
      </span>
    </button>
  );
}
