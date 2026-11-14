import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/Money';
import type { ReportCurrency } from '@/domain/currency';
import type { CashflowPoint, CategorySlice, MonthSummary, TopClient } from '@/domain/dashboard';
import { formatDate, formatYearMonth, type YearMonth } from '@/domain/dates';
import { formatCompact, formatMoney, formatNumber, fromCents } from '@/domain/money';

/**
 * Paleta categórica validada (orden fijo, nunca ciclado) — ver docs/arquitectura.md.
 * Ingresos = ranura 1 (azul), gastos = ranura 2 (naranja): pasan CVD y contraste.
 */
const SERIES = { income: '#2a78d6', expense: '#eb6834', balance: '#2a78d6' } as const;
const INK = {
  primary: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  grid: '#e2e8f0',
  surface: '#ffffff',
};

/** Lo único que usamos del tooltip de Recharts (tipado estructural, estable entre versiones). */
interface TooltipArgs {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

const axisTick = { fill: INK.secondary, fontSize: 12 };

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="mb-1 font-semibold text-slate-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-slate-600">
          {r.color && (
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: r.color }}
              aria-hidden
            />
          )}
          <span className="flex-1">{r.label}</span>
          <span className="tabular font-semibold text-slate-900">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export default function Charts({
  currency,
  month,
  series,
  categories,
  cashflow,
  clients,
}: {
  currency: ReportCurrency;
  month: YearMonth;
  series: MonthSummary[];
  categories: CategorySlice[];
  cashflow: CashflowPoint[];
  clients: TopClient[];
}) {
  const money = (cents: number) => formatMoney(cents, currency);
  const tickMoney = (v: number) => formatCompact(v);

  const monthly = series.map((s) => ({
    label: formatYearMonth(s.month, true),
    month: s.month,
    income: fromCents(s.income),
    expense: fromCents(s.expense),
    net: s.net,
  }));
  const flow = cashflow.map((p) => ({
    ...p,
    day: Number(p.date.slice(8)),
    value: fromCents(p.balance),
  }));
  const maxClient = clients[0]?.total ?? 1;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Comparativa mensual */}
      <Card className="lg:col-span-2">
        <CardHeader
          title="Ingresos y gastos, últimos 6 meses"
          subtitle={`En ${currency}, convertidos con la tasa de cada día`}
        />
        <Legend
          items={[
            { label: 'Ingresos', color: SERIES.income },
            { label: 'Gastos', color: SERIES.expense },
          ]}
        />
        <div
          className="h-64"
          role="img"
          aria-label="Gráfico de barras de ingresos y gastos por mes. Los valores están en la tabla de abajo."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthly}
              barGap={2}
              barCategoryGap="24%"
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={tickMoney}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }: TooltipArgs) => {
                  const row = payload?.[0]?.payload as (typeof monthly)[number] | undefined;
                  if (!active || !row) return null;
                  return (
                    <TooltipBox
                      title={formatYearMonth(row.month)}
                      rows={[
                        {
                          label: 'Ingresos',
                          value: formatMoney(Math.round(row.income * 100), currency),
                          color: SERIES.income,
                        },
                        {
                          label: 'Gastos',
                          value: formatMoney(Math.round(row.expense * 100), currency),
                          color: SERIES.expense,
                        },
                        { label: 'Neto', value: money(row.net) },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="income"
                name="Ingresos"
                fill={SERIES.income}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expense"
                name="Gastos"
                fill={SERIES.expense}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-2 text-sm">
          <summary className="text-brand-700 cursor-pointer">Ver como tabla</summary>
          <table className="mt-2 w-full text-right text-xs">
            <thead className="text-slate-500">
              <tr>
                <th scope="col" className="py-1 text-left font-medium">
                  Mes
                </th>
                <th scope="col" className="font-medium">
                  Ingresos
                </th>
                <th scope="col" className="font-medium">
                  Gastos
                </th>
                <th scope="col" className="font-medium">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {series.map((s) => (
                <tr key={s.month} className="border-t border-slate-100">
                  <th scope="row" className="py-1 text-left font-medium capitalize">
                    {formatYearMonth(s.month)}
                  </th>
                  <td>{money(s.income)}</td>
                  <td>{money(s.expense)}</td>
                  <td className="font-semibold">{money(s.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      {/* Gastos por categoría */}
      <Card>
        <CardHeader title="Gastos por categoría" subtitle={formatYearMonth(month)} />
        {categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Sin gastos este mes.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="h-48 w-48 shrink-0"
              role="img"
              aria-label="Gráfico de dona de gastos por categoría. El detalle está en la lista."
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories.map((c) => ({
                      name: c.name,
                      value: fromCents(c.total),
                      color: c.color,
                      share: c.share,
                      total: c.total,
                    }))}
                    dataKey="value"
                    innerRadius="62%"
                    outerRadius="100%"
                    stroke={INK.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {categories.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: TooltipArgs) => {
                      const p = payload?.[0]?.payload as
                        { name: string; total: number; share: number; color: string } | undefined;
                      if (!active || !p) return null;
                      return (
                        <TooltipBox
                          title={p.name}
                          rows={[
                            {
                              label: `${formatNumber(p.share * 100, 1, 0)} %`,
                              value: money(p.total),
                              color: p.color,
                            },
                          ]}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 text-sm">
              {categories.map((c) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: c.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{c.name}</span>
                  <span className="tabular text-xs text-slate-500">
                    {formatNumber(c.share * 100, 0, 0)} %
                  </span>
                  <MoneyText
                    cents={c.total}
                    currency={currency}
                    compact
                    className="w-24 text-right font-semibold text-slate-900"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Flujo de caja */}
      <Card>
        <CardHeader
          title="Flujo de caja del mes"
          subtitle="Saldo acumulado día a día (entradas − salidas)"
        />
        <div
          className="h-48"
          role="img"
          aria-label={`Línea del saldo acumulado del mes. Saldo final: ${money(cashflow.at(-1)?.balance ?? 0)}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis
                dataKey="day"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickFormatter={tickMoney}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <ReferenceLine y={0} stroke={INK.muted} />
              <Tooltip
                cursor={{ stroke: INK.muted, strokeDasharray: '3 3' }}
                content={({ active, payload }: TooltipArgs) => {
                  const p = payload?.[0]?.payload as (typeof flow)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <TooltipBox
                      title={formatDate(p.date, 'long')}
                      rows={[
                        { label: 'Entradas', value: money(p.income) },
                        { label: 'Salidas', value: money(p.expense) },
                        {
                          label: 'Saldo acumulado',
                          value: money(p.balance),
                          color: SERIES.balance,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={SERIES.balance}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: INK.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top clientes */}
      <Card className="lg:col-span-2">
        <CardHeader
          title="Mejores clientes del mes"
          subtitle="Por ingresos registrados a su nombre"
        />
        {clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Aún no hay ventas asociadas a clientes este mes.
          </p>
        ) : (
          <ol className="space-y-3">
            {clients.map((c, i) => (
              <li key={c.clientId}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-slate-800">
                    <span className="mr-2 font-semibold text-slate-400">{i + 1}.</span>
                    {c.name}
                    <span className="ml-2 text-xs text-slate-500">
                      {c.count} {c.count === 1 ? 'compra' : 'compras'}
                    </span>
                  </span>
                  <MoneyText
                    cents={c.total}
                    currency={currency}
                    className="font-semibold text-slate-900"
                  />
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(c.total / maxClient) * 100}%`,
                      backgroundColor: SERIES.income,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
