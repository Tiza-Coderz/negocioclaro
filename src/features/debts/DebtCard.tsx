import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/Money';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { cn } from '@/components/ui/cn';
import type { DebtView } from '@/data/repositories/debts';
import { formatDate } from '@/domain/dates';
import { DEBT_STATUS_LABEL, dueLabel, reminderMessage, type DebtState } from '@/domain/debts';
import { formatMoney } from '@/domain/money';

const STATUS_STYLE: Record<DebtState['status'], string> = {
  vencida: 'bg-red-100 text-red-800',
  vence_hoy: 'bg-orange-100 text-orange-800',
  por_vencer: 'bg-amber-100 text-amber-800',
  al_dia: 'bg-slate-100 text-slate-700',
  pagada: 'bg-emerald-100 text-emerald-800',
};

export function DebtCard({
  debt,
  state,
  businessName,
  onPay,
  onEdit,
}: {
  debt: DebtView;
  state: DebtState;
  businessName: string;
  onPay: () => void;
  onEdit: () => void;
}) {
  const progress = debt.amountCents === 0 ? 0 : debt.paidCents / debt.amountCents;
  const isReceivable = debt.direction === 'por_cobrar';

  return (
    <Card
      className={cn('flex h-full flex-col gap-3', state.status === 'vencida' && 'ring-red-200')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {debt.counterpartyName ?? 'Sin contacto'}
          </p>
          <p className="truncate text-sm text-slate-500">{debt.concept}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
            STATUS_STYLE[state.status],
          )}
        >
          {DEBT_STATUS_LABEL[state.status]}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <MoneyText
            cents={state.pendingCents}
            currency={debt.currency}
            className="text-xl font-bold text-slate-900"
          />
          <span className="text-xs text-slate-500">
            de <MoneyText cents={debt.amountCents} currency={debt.currency} />
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Porcentaje pagado"
        >
          <div className="bg-income h-full rounded-full" style={{ width: `${progress * 100}%` }} />
        </div>
        <p
          className={cn(
            'mt-1.5 text-xs',
            state.status === 'vencida' ? 'font-semibold text-red-700' : 'text-slate-500',
          )}
        >
          {dueLabel(state)} · {formatDate(debt.dueOn)}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {state.status !== 'pagada' && (
          <Button size="sm" onClick={onPay}>
            {isReceivable ? 'Registrar cobro' : 'Registrar pago'}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Editar
        </Button>
        {isReceivable && state.status !== 'pagada' && (
          <WhatsAppButton
            size="sm"
            phone={debt.counterpartyPhone}
            label="Recordar"
            message={reminderMessage(
              debt,
              state,
              businessName,
              formatMoney(state.pendingCents, debt.currency),
            )}
          />
        )}
      </div>
    </Card>
  );
}
