import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/Money';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, humanizeError, LoadingBlock } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { useRates } from '@/data/hooks/useRates';
import { queryKeys } from '@/data/queryKeys';
import {
  fetchPayrollRun,
  fetchWorkers,
  payPayroll,
  preparePayroll,
  reopenPayroll,
  updatePayrollItem,
  type PayrollItemView,
  type Worker,
} from '@/data/repositories/payroll';
import type { Currency } from '@/domain/currency';
import {
  formatDate,
  formatYearMonth,
  monthRange,
  todayInHavana,
  toYearMonth,
} from '@/domain/dates';
import { centsToDecimalString, toCents } from '@/domain/money';
import {
  netPay,
  payrollTotalIn,
  payrollTotalsByCurrency,
  validatePayrollLine,
} from '@/domain/payroll';
import { WorkerDialog } from './WorkerDialog';

export default function PayrollPage() {
  const [tab, setTab] = useState<'nomina' | 'trabajadores'>('nomina');
  return (
    <>
      <PageHeader title="Trabajadores y nómina" />
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
        {(
          [
            ['nomina', 'Nómina mensual'],
            ['trabajadores', 'Trabajadores'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'rounded-lg py-2 text-sm font-semibold',
              tab === value ? 'text-brand-700 bg-white shadow-sm' : 'text-slate-600',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'nomina' ? <PayrollTab /> : <WorkersTab />}
    </>
  );
}

function WorkersTab() {
  const businessId = useBusinessId();
  const query = useQuery({
    queryKey: queryKeys.workers(businessId),
    queryFn: () => fetchWorkers(businessId),
  });
  const [editing, setEditing] = useState<Worker | 'new' | null>(null);

  if (query.isPending) return <LoadingBlock rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
          Nuevo trabajador
        </Button>
      </div>
      {query.data.length === 0 ? (
        <EmptyState title="Aún no hay trabajadores" />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {query.data.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setEditing(w)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50',
                  !w.active && 'opacity-60',
                )}
              >
                <span
                  className="bg-brand-50 text-brand-700 flex size-10 items-center justify-center rounded-full font-semibold"
                  aria-hidden
                >
                  {w.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">{w.full_name}</span>
                  <span className="block text-xs text-slate-500">
                    {w.position} · desde {formatDate(w.hired_on)}
                    {!w.active && ' · inactivo'}
                  </span>
                </span>
                <MoneyText
                  cents={toCents(w.base_salary)}
                  currency={w.salary_currency}
                  className="text-sm font-semibold"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <WorkerDialog
          worker={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function PayrollTab() {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  const [period, setPeriod] = useState(toYearMonth(todayInHavana()));
  const { table } = useRates();
  const key = [...queryKeys.payroll(businessId), period];
  const query = useQuery({ queryKey: key, queryFn: () => fetchPayrollRun(businessId, period) });

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.payroll(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.movements(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) }),
    ]);
  const prepare = useMutation({
    mutationFn: () => preparePayroll(businessId, period),
    onSuccess: invalidate,
  });
  const lastDay = monthRange(period).to;
  const payDate = lastDay < todayInHavana() ? lastDay : todayInHavana();
  const pay = useMutation({
    mutationFn: (runId: string) => payPayroll(runId, payDate),
    onSuccess: invalidate,
  });
  const reopen = useMutation({ mutationFn: reopenPayroll, onSuccess: invalidate });

  const run = query.data;
  const totals = run ? payrollTotalsByCurrency(run.items) : {};
  const totalUsd = run ? payrollTotalIn(run.items, 'USD', run.paidOn ?? payDate, table) : null;
  const totalCup = run ? payrollTotalIn(run.items, 'CUP', run.paidOn ?? payDate, table) : null;
  const error = prepare.error ?? pay.error ?? reopen.error;

  return (
    <>
      <MonthPicker value={period} onChange={setPeriod} />
      <div className="mt-4">
        {query.isPending ? (
          <LoadingBlock rows={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !run ? (
          <EmptyState
            icon="🗓️"
            title={`No hay nómina de ${formatYearMonth(period)}`}
            description="Se preparará con el salario base de los trabajadores activos. Luego puede añadir bonificaciones o descuentos."
            action={
              <Button loading={prepare.isPending} onClick={() => prepare.mutate()}>
                Preparar nómina
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="p-0">
              <div className="p-4 pb-0">
                <CardHeader
                  title={`Nómina de ${formatYearMonth(period)}`}
                  subtitle={
                    run.status === 'pagada'
                      ? `Pagada el ${formatDate(run.paidOn ?? '')}`
                      : 'Borrador: puede editar bonificaciones y descuentos'
                  }
                />
              </div>
              <ul className="divide-y divide-slate-100">
                {run.items.map((item) => (
                  <PayrollItemRow
                    key={item.id}
                    item={item}
                    readOnly={run.status === 'pagada'}
                    onSaved={invalidate}
                  />
                ))}
              </ul>
            </Card>
            <Card className="h-fit space-y-3">
              <CardHeader title="Total a pagar" />
              {(Object.entries(totals) as [Currency, number][]).map(([c, v]) => (
                <div key={c} className="flex justify-between text-sm">
                  <span className="text-slate-500">En {c}</span>
                  <MoneyText cents={v} currency={c} className="font-semibold" />
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 text-sm">
                <p className="text-slate-500">Costo total equivalente</p>
                <p className="font-bold text-slate-900">
                  <MoneyText cents={totalUsd} currency="USD" /> ·{' '}
                  <MoneyText cents={totalCup} currency="CUP" />
                </p>
              </div>
              {run.status === 'borrador' ? (
                <Button
                  block
                  loading={pay.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Registrar el pago de la nómina con fecha ${formatDate(payDate)}? Se crearán los gastos correspondientes.`,
                      )
                    )
                      pay.mutate(run.id);
                  }}
                >
                  Marcar como pagada
                </Button>
              ) : (
                <Button
                  block
                  variant="secondary"
                  loading={reopen.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        '¿Reabrir la nómina? Se eliminarán los gastos de nómina generados.',
                      )
                    )
                      reopen.mutate(run.id);
                  }}
                >
                  Reabrir para corregir
                </Button>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {humanizeError(error)}
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function PayrollItemRow({
  item,
  readOnly,
  onSaved,
}: {
  item: PayrollItemView;
  readOnly: boolean;
  onSaved: () => Promise<unknown>;
}) {
  const [bonus, setBonus] = useState(centsToDecimalString(item.bonusCents));
  const [deductions, setDeductions] = useState(centsToDecimalString(item.deductionsCents));
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: ({ b, d }: { b: number; d: number }) => updatePayrollItem(item.id, b, d),
    onSuccess: onSaved,
  });

  function commit() {
    try {
      const b = toCents(bonus || '0');
      const d = toCents(deductions || '0');
      if (b === item.bonusCents && d === item.deductionsCents) return;
      const msg = validatePayrollLine({ ...item, bonusCents: b, deductionsCents: d });
      setError(msg);
      if (!msg) save.mutate({ b, d });
    } catch {
      setError('Importe inválido.');
    }
  }

  return (
    <li className="grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_110px_110px_130px]">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate font-medium text-slate-900">{item.workerName}</p>
        <p className="text-xs text-slate-500">
          {item.position} · base <MoneyText cents={item.baseCents} currency={item.currency} />
        </p>
      </div>
      <label className="text-xs text-slate-500">
        Bonificación
        <input
          inputMode="decimal"
          value={bonus}
          disabled={readOnly}
          onChange={(e) => setBonus(e.target.value)}
          onBlur={commit}
          className="tabular mt-0.5 block h-9 w-full rounded-lg border-0 px-2 text-sm ring-1 ring-slate-300 disabled:bg-slate-50"
        />
      </label>
      <label className="text-xs text-slate-500">
        Descuentos
        <input
          inputMode="decimal"
          value={deductions}
          disabled={readOnly}
          onChange={(e) => setDeductions(e.target.value)}
          onBlur={commit}
          className="tabular mt-0.5 block h-9 w-full rounded-lg border-0 px-2 text-sm ring-1 ring-slate-300 disabled:bg-slate-50"
        />
      </label>
      <p className="col-span-2 text-right sm:col-span-1">
        <span className="block text-xs text-slate-500">Neto</span>
        <MoneyText cents={netPay(item)} currency={item.currency} className="font-semibold" />
      </p>
      {(error ?? save.error) && (
        <p role="alert" className="col-span-full text-xs text-red-700">
          {error ?? humanizeError(save.error)}
        </p>
      )}
    </li>
  );
}
