import { useMemo, useState } from 'react';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/Money';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { useDebts } from '@/data/hooks/useDebts';
import type { DebtView } from '@/data/repositories/debts';
import type { Currency } from '@/domain/currency';
import { debtState, pendingByCurrency, type DebtDirection } from '@/domain/debts';
import { todayInHavana } from '@/domain/dates';
import { DebtCard } from './DebtCard';
import { DebtDialog } from './DebtDialog';
import { PaymentDialog } from './PaymentDialog';

type Filter = 'pendientes' | 'vencidas' | 'pagadas';

export default function DebtsPage() {
  const { business } = useBusiness();
  const { data, isPending, isError, error, refetch } = useDebts();
  const [direction, setDirection] = useState<DebtDirection>('por_cobrar');
  const [filter, setFilter] = useState<Filter>('pendientes');
  const [editing, setEditing] = useState<DebtView | 'new' | null>(null);
  const [paying, setPaying] = useState<DebtView | null>(null);
  const today = todayInHavana();

  const list = useMemo(() => {
    return (data ?? [])
      .filter((d) => d.direction === direction)
      .map((d) => ({ debt: d, state: debtState(d, today, business.alert_days_before) }))
      .filter(({ state }) => {
        if (filter === 'pagadas') return state.status === 'pagada';
        if (filter === 'vencidas') return state.status === 'vencida';
        return state.status !== 'pagada';
      })
      .sort((a, b) => a.state.daysToDue - b.state.daysToDue);
  }, [data, direction, filter, today, business.alert_days_before]);

  const pending = pendingByCurrency(data ?? [], direction);

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Lo que le deben y lo que usted debe, con sus vencimientos"
        actions={
          <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
            Nueva cuenta
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Tipo de cuenta"
        className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1"
      >
        {(
          [
            ['por_cobrar', 'Por cobrar'],
            ['por_pagar', 'Por pagar'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={direction === value}
            onClick={() => setDirection(value)}
            className={cn(
              'rounded-lg py-2 text-sm font-semibold',
              direction === value ? 'text-brand-700 bg-white shadow-sm' : 'text-slate-600',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <p className="text-sm text-slate-500">
          {direction === 'por_cobrar' ? 'Total pendiente de cobro' : 'Total pendiente de pago'}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {Object.keys(pending).length === 0 ? (
            <span className="text-lg font-bold text-slate-400">Nada pendiente</span>
          ) : (
            (Object.entries(pending) as [Currency, number][]).map(([c, v]) => (
              <MoneyText
                key={c}
                cents={v}
                currency={c}
                className="text-xl font-bold text-slate-900"
              />
            ))
          )}
        </div>
      </Card>

      <div className="mb-3 flex gap-2" role="group" aria-label="Filtrar cuentas">
        {(['pendientes', 'vencidas', 'pagadas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium capitalize ring-1',
              filter === f
                ? 'bg-brand-600 ring-brand-600 text-white'
                : 'bg-white text-slate-600 ring-slate-300',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isPending ? (
        <LoadingBlock rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="✅"
          title={filter === 'vencidas' ? 'No hay cuentas vencidas' : 'No hay cuentas aquí'}
          description="¡Bien! Cuando registre una factura a crédito aparecerá en esta lista."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map(({ debt, state }) => (
            <li key={debt.id}>
              <DebtCard
                debt={debt}
                state={state}
                businessName={business.name}
                onPay={() => setPaying(debt)}
                onEdit={() => setEditing(debt)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <DebtDialog
          debt={editing === 'new' ? null : editing}
          defaultDirection={direction}
          onClose={() => setEditing(null)}
        />
      )}
      {paying && <PaymentDialog debt={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
