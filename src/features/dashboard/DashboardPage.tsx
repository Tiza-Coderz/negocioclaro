import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Card, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/Money';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { ErrorState, LoadingBlock, Skeleton } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { useDebts } from '@/data/hooks/useDebts';
import { useRates } from '@/data/hooks/useRates';
import type { ReportCurrency } from '@/domain/currency';
import {
  dailyCashflow,
  expensesByCategory,
  groupByMonth,
  monthlySeries,
  netMargin,
  comparablePrevious,
  percentChange,
  topClients,
} from '@/domain/dashboard';
import { formatDate, formatYearMonth, todayInHavana, toYearMonth } from '@/domain/dates';
import { debtAlerts, dueLabel } from '@/domain/debts';
import { formatNumber } from '@/domain/money';
import { useDashboardData } from './useDashboardData';

// Recharts pesa ~100 KB gzip: va en su propio chunk y se carga tras pintar los KPI.
const Charts = lazy(() => import('./Charts'));

const CURRENCY_KEY = 'negocioclaro:dashboard-currency';

function loadCurrency(): ReportCurrency {
  try {
    return window.localStorage.getItem(CURRENCY_KEY) === 'CUP' ? 'CUP' : 'USD';
  } catch {
    return 'USD';
  }
}

export default function DashboardPage() {
  const { business } = useBusiness();
  const today = todayInHavana();
  const [month, setMonth] = useState(toYearMonth(today));
  const [currency, setCurrencyState] = useState<ReportCurrency>(loadCurrency);
  const { data, isPending, isError, error, refetch, months } = useDashboardData(month);
  const debts = useDebts();
  const { table } = useRates();

  const setCurrency = (c: ReportCurrency) => {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  };

  const view = useMemo(() => {
    const movements = data ?? [];
    const series = monthlySeries(movements, months, currency);
    const current = series.at(-1);
    const previous = comparablePrevious(movements, month, today, currency);
    const thisMonth = groupByMonth(movements).get(month) ?? [];
    return {
      series,
      current,
      previous,
      change: current ? percentChange(current.net, previous.totals.net) : null,
      margin: current ? netMargin(current) : null,
      categories: expensesByCategory(thisMonth, currency),
      cashflow: dailyCashflow(movements, month, currency, today),
      clients: topClients(thisMonth, currency),
    };
  }, [data, months, month, currency, today]);

  const alerts = useMemo(
    () => debtAlerts(debts.data ?? [], today, business.alert_days_before),
    [debts.data, today, business.alert_days_before],
  );
  const usdToday = table.resolveNumber('USD', today);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resumen</h1>
          <p className="text-sm text-slate-500">
            {business.name}
            {usdToday !== null && (
              <>
                {' · '}
                <Link
                  to="/tasas"
                  className="text-brand-700 font-medium underline-offset-2 hover:underline"
                >
                  1 USD = {formatNumber(usdToday, 2, 0)} CUP
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="flex-1 sm:w-64">
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <div
            role="group"
            aria-label="Moneda de los totales"
            className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"
          >
            {(['USD', 'CUP'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                onClick={() => setCurrency(c)}
                className={cn(
                  'rounded-lg px-3 text-sm font-bold',
                  currency === c ? 'bg-brand-600 text-white' : 'text-slate-600',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          {/* KPI */}
          <section
            aria-label="Indicadores del mes"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <Card className="bg-brand-700 col-span-2 text-white ring-0 lg:col-span-1">
              <p className="text-brand-100 text-sm">Ganancia neta · {formatYearMonth(month)}</p>
              {isPending || !view.current ? (
                <Skeleton className="bg-brand-500 mt-2 h-9 w-40" />
              ) : (
                <>
                  <MoneyText
                    cents={view.current.net}
                    currency={currency}
                    className="mt-1 block text-3xl font-bold"
                  />
                  <p className="text-brand-100 mt-1 text-sm">
                    {view.change === null ? (
                      'Sin mes anterior para comparar'
                    ) : (
                      <>
                        <span aria-hidden>{view.change >= 0 ? '▲' : '▼'}</span>{' '}
                        {formatNumber(Math.abs(view.change), 1, 0)} %{' '}
                        {view.change >= 0 ? 'más' : 'menos'} que{' '}
                        {view.previous.uptoDay
                          ? `el 1–${view.previous.uptoDay} de ${formatYearMonth(view.previous.month, true)}`
                          : formatYearMonth(view.previous.month, true)}
                      </>
                    )}
                  </p>
                </>
              )}
            </Card>
            <Kpi
              label="Ingresos"
              loading={isPending}
              cents={view.current?.income ?? 0}
              currency={currency}
            />
            <Kpi
              label="Gastos"
              loading={isPending}
              cents={view.current?.expense ?? 0}
              currency={currency}
            />
            <Card className="col-span-2 lg:col-span-1">
              <p className="text-sm text-slate-500">Margen neto</p>
              {isPending ? (
                <Skeleton className="mt-2 h-8 w-20" />
              ) : (
                <p className="tabular mt-1 text-2xl font-bold text-slate-900">
                  {view.margin === null ? '—' : `${formatNumber(view.margin, 1, 0)} %`}
                </p>
              )}
              <p className="text-xs text-slate-500">{view.current?.count ?? 0} movimientos</p>
            </Card>
          </section>

          {(view.current?.missingRate ?? 0) > 0 && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <Icon name="alert" className="mr-1 inline size-4" /> {view.current?.missingRate}{' '}
              movimiento(s) de este mes no tienen tasa y no se incluyen.{' '}
              <Link to="/tasas" className="font-semibold underline">
                Registrar tasas
              </Link>
            </p>
          )}

          {/* Alertas de cuentas */}
          {alerts.length > 0 && (
            <Card className="ring-red-200">
              <CardHeader
                title={`Cuentas que requieren atención (${alerts.length})`}
                action={
                  <Link to="/cuentas" className="text-brand-700 text-sm font-semibold">
                    Ver todas
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {alerts.slice(0, 4).map(({ debt, state }) => (
                  <li key={debt.id} className="flex items-center gap-3 py-2">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        state.status === 'vencida'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800',
                      )}
                      aria-hidden
                    >
                      <Icon name="alert" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {debt.direction === 'por_cobrar' ? 'Cobrar a ' : 'Pagar a '}
                        {debt.counterpartyName}
                      </p>
                      <p
                        className={cn(
                          'text-xs',
                          state.status === 'vencida'
                            ? 'font-semibold text-red-700'
                            : 'text-slate-500',
                        )}
                      >
                        {dueLabel(state)} · {formatDate(debt.dueOn)}
                      </p>
                    </div>
                    <MoneyText
                      cents={state.pendingCents}
                      currency={debt.currency}
                      className="text-sm font-semibold"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isPending ? (
            <LoadingBlock rows={3} label="Cargando gráficos…" />
          ) : (
            <Suspense fallback={<LoadingBlock rows={3} label="Cargando gráficos…" />}>
              <Charts
                currency={currency}
                month={month}
                series={view.series}
                categories={view.categories}
                cashflow={view.cashflow}
                clients={view.clients}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  cents,
  currency,
  loading,
}: {
  label: string;
  cents: number;
  currency: ReportCurrency;
  loading: boolean;
}) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <MoneyText
          cents={cents}
          currency={currency}
          compact
          className="mt-1 block text-2xl font-bold text-slate-900"
        />
      )}
    </Card>
  );
}
