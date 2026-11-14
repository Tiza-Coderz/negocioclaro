import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/Money';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { useCategories } from '@/data/hooks/useCatalogs';
import { useMovements } from '@/data/hooks/useMovements';
import type { Movement } from '@/data/repositories/movements';
import { totals } from '@/domain/consolidation';
import { CURRENCIES, isCurrency, type Currency, type MovementKind } from '@/domain/currency';
import { formatDate, monthRange, todayInHavana, toYearMonth } from '@/domain/dates';
import { MovementDialog } from './MovementDialog';
import { MovementRow } from './MovementRow';

export default function MovementsPage() {
  const [params, setParams] = useSearchParams();
  const month = params.get('mes') ?? toYearMonth(todayInHavana());
  const kind = (params.get('tipo') as MovementKind | null) ?? undefined;
  const currencyParam = params.get('moneda');
  const currency: Currency | undefined = isCurrency(currencyParam) ? currencyParam : undefined;
  const categoryId = params.get('categoria') ?? undefined;
  const [search, setSearch] = useState('');
  // ?nuevo=1 abre directamente el formulario (enlace desde el registro rápido).
  const [editing, setEditing] = useState<Movement | 'new' | null>(() =>
    params.get('nuevo') ? 'new' : null,
  );

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const filters = useMemo(
    () => ({ ...monthRange(month), kind, currency, categoryId }),
    [month, kind, currency, categoryId],
  );
  const { data, isPending, isError, error, refetch, isFetching } = useMovements(filters);
  const categories = useCategories();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((m) =>
      [m.note, m.clientName, m.supplierName, m.categoryName].some((t) =>
        t?.toLowerCase().includes(q),
      ),
    );
  }, [data, search]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Movement[]>();
    for (const m of visible) groups.set(m.date, [...(groups.get(m.date) ?? []), m]);
    return [...groups.entries()];
  }, [visible]);

  const sumUsd = totals(visible, 'USD');
  const sumCup = totals(visible, 'CUP');

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Ingresos y gastos en todas las monedas"
        actions={
          <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
            Nuevo
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <MonthPicker value={month} onChange={(m) => setParam('mes', m)} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            label="Tipo"
            hideLabel
            value={kind ?? ''}
            onChange={(e) => setParam('tipo', e.target.value || undefined)}
          >
            <option value="">Ingresos y gastos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="gasto">Solo gastos</option>
          </Select>
          <Select
            label="Moneda"
            hideLabel
            value={currency ?? ''}
            onChange={(e) => setParam('moneda', e.target.value || undefined)}
          >
            <option value="">Todas las monedas</option>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select
            label="Categoría"
            hideLabel
            value={categoryId ?? ''}
            onChange={(e) => setParam('categoria', e.target.value || undefined)}
          >
            <option value="">Todas las categorías</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Icon
              name="search"
              className="pointer-events-none absolute top-3 left-3 size-5 text-slate-400"
            />
            <input
              type="search"
              placeholder="Buscar nota, cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:ring-brand-500 block h-11 w-full rounded-xl border-0 bg-white pr-3 pl-10 text-base shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2"
            />
          </label>
        </div>
      </div>

      {isPending ? (
        <LoadingBlock rows={6} label="Cargando movimientos…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Card className="mb-4 grid grid-cols-3 gap-2 text-center" aria-busy={isFetching}>
            <div>
              <p className="text-xs text-slate-500">Ingresos</p>
              <MoneyText
                cents={sumUsd.income}
                currency="USD"
                compact
                className="text-income font-semibold"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Gastos</p>
              <MoneyText
                cents={sumUsd.expense}
                currency="USD"
                compact
                className="text-expense font-semibold"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500">Neto</p>
              <MoneyText cents={sumUsd.net} currency="USD" compact className="font-bold" />
              <p className="text-[11px] text-slate-500">
                <MoneyText cents={sumCup.net} currency="CUP" compact />
              </p>
            </div>
            {sumUsd.missingRate > 0 && (
              <p className="col-span-3 text-xs text-amber-700">
                {sumUsd.missingRate} movimiento(s) sin tasa no se incluyen en los totales.
              </p>
            )}
          </Card>

          {byDay.length === 0 ? (
            <EmptyState
              title="No hay movimientos con estos filtros"
              description="Cambie el mes o los filtros, o registre un movimiento nuevo."
              action={<Button onClick={() => setEditing('new')}>Registrar movimiento</Button>}
            />
          ) : (
            <div className="space-y-4">
              {byDay.map(([date, items]) => (
                <section key={date} aria-labelledby={`d-${date}`}>
                  <h2
                    id={`d-${date}`}
                    className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                  >
                    {formatDate(date, 'long')}
                  </h2>
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                    {items.map((m) => (
                      <li key={m.id}>
                        <MovementRow movement={m} onClick={() => setEditing(m)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <MovementDialog
          movement={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null);
            setParam('nuevo', undefined);
          }}
        />
      )}
    </>
  );
}
