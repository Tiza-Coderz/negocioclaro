import { useMemo, useState } from 'react';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { CurrencyBadge } from '@/components/ui/Money';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { useRates } from '@/data/hooks/useRates';
import type { ForeignCurrency, RateRow } from '@/data/repositories/rates';
import { formatDate, todayInHavana } from '@/domain/dates';
import { formatNumber } from '@/domain/money';
import { rateChangePct } from '@/domain/rates';
import { Converter } from './Converter';
import { RateDialog } from './RateDialog';
import { Sparkline } from './Sparkline';

const FOREIGN: ForeignCurrency[] = ['USD', 'EUR', 'MLC'];
const fmt = (n: number) => formatNumber(n, 2, 0);

interface DayRow {
  date: string;
  rates: Partial<Record<ForeignCurrency, RateRow>>;
}

export default function RatesPage() {
  const { role } = useBusiness();
  const { data, isPending, isError, error, refetch, table } = useRates();
  const [editing, setEditing] = useState<{
    date: string;
    currency: ForeignCurrency;
    value?: number;
  } | null>(null);
  const today = todayInHavana();

  const days = useMemo<DayRow[]>(() => {
    const map = new Map<string, DayRow>();
    for (const r of data ?? []) {
      const row = map.get(r.date) ?? { date: r.date, rates: {} };
      row.rates[r.currency as ForeignCurrency] = r;
      map.set(r.date, row);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data]);

  const usdHistory = useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.currency === 'USD')
        .slice(0, 30)
        .reverse()
        .map((r) => Number(r.cup_per_unit)),
    [data],
  );

  if (isPending) return <LoadingBlock rows={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Tasas de cambio"
        subtitle="Cada movimiento se convierte con la tasa de su día. Si un día no tiene tasa, se usa la última anterior."
        actions={
          <Button
            icon={<Icon name="plus" />}
            onClick={() => setEditing({ date: today, currency: 'USD' })}
          >
            Registrar tasa
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {FOREIGN.map((c) => {
          const current = (data ?? []).filter((r) => r.currency === c);
          const last = current[0];
          const prev = current[1];
          const change =
            last && prev
              ? rateChangePct(Number(prev.cup_per_unit), Number(last.cup_per_unit))
              : null;
          const stale = last && last.date !== today;
          return (
            <Card key={c} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <CurrencyBadge currency={c} />
                {change !== null && (
                  <span
                    className={
                      change >= 0
                        ? 'text-expense text-xs font-semibold'
                        : 'text-income text-xs font-semibold'
                    }
                    title="Variación respecto a la tasa anterior"
                  >
                    {change >= 0 ? '▲' : '▼'} {fmt(Math.abs(change))} %
                  </span>
                )}
              </div>
              <p className="tabular text-2xl font-bold text-slate-900">
                {last ? fmt(Number(last.cup_per_unit)) : '—'}{' '}
                <span className="text-sm font-medium text-slate-500">CUP</span>
              </p>
              <p className="text-xs text-slate-500">
                {last ? `Vigente desde el ${formatDate(last.date)}` : 'Sin tasa registrada'}
              </p>
              {stale && (
                <button
                  type="button"
                  className="text-brand-700 mt-1 self-start text-xs font-semibold underline"
                  onClick={() =>
                    setEditing({ date: today, currency: c, value: Number(last.cup_per_unit) })
                  }
                >
                  Actualizar la de hoy
                </button>
              )}
              {c === 'USD' && usdHistory.length > 2 && (
                <Sparkline values={usdHistory} className="mt-2 h-10 w-full" />
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-0">
          <div className="p-4 pb-2">
            <CardHeader
              title="Historial"
              subtitle="Toque una tasa para corregirla. Los movimientos de esa fecha se recalculan solos."
            />
          </div>
          {days.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Aún no hay tasas"
                description="Registre la tasa del USD de hoy para empezar."
              />
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Tasas de cambio por fecha, en CUP por unidad</caption>
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">
                      Fecha
                    </th>
                    {FOREIGN.map((c) => (
                      <th key={c} scope="col" className="px-4 py-2 text-right font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {days.map((day) => (
                    <tr key={day.date}>
                      <th scope="row" className="px-4 py-2 text-left font-medium text-slate-700">
                        {formatDate(day.date)}
                      </th>
                      {FOREIGN.map((c) => {
                        const r = day.rates[c];
                        return (
                          <td key={c} className="px-2 py-1 text-right">
                            <button
                              type="button"
                              className="tabular hover:bg-brand-50 w-full rounded-lg px-2 py-1 text-right disabled:hover:bg-transparent"
                              onClick={() =>
                                setEditing({
                                  date: day.date,
                                  currency: c,
                                  ...(r ? { value: Number(r.cup_per_unit) } : {}),
                                })
                              }
                              aria-label={`${r ? 'Editar' : 'Añadir'} tasa ${c} del ${formatDate(day.date)}`}
                              disabled={role !== 'dueno' && role !== 'contador'}
                            >
                              {r ? (
                                fmt(Number(r.cup_per_unit))
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Converter table={table} />
      </div>

      {editing && (
        <RateDialog
          initial={editing}
          existing={
            (data ?? []).find((r) => r.date === editing.date && r.currency === editing.currency) ??
            null
          }
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
