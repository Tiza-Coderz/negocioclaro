import { useMemo, useState } from 'react';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/Money';
import { MonthPicker } from '@/components/ui/MonthPicker';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, humanizeError, LoadingBlock } from '@/components/ui/States';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { useDebts } from '@/data/hooks/useDebts';
import { useRates } from '@/data/hooks/useRates';
import type { ReportCurrency } from '@/domain/currency';
import { formatYearMonth, monthRange, todayInHavana, toYearMonth } from '@/domain/dates';
import { debtAlerts } from '@/domain/debts';
import { formatMoney, formatNumber } from '@/domain/money';
import { buildMonthlyReport, CSV_HEADERS, csvRows, reportFilename } from '@/domain/report';
import { csvDecimal, downloadFile, toCsv } from '@/lib/csv';
import { useDashboardData } from '../dashboard/useDashboardData';

export default function ReportsPage() {
  const { business } = useBusiness();
  const today = todayInHavana();
  const [month, setMonth] = useState(toYearMonth(today));
  const [currency, setCurrency] = useState<ReportCurrency>('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Reutiliza la consulta del dashboard (6 meses), que ya incluye el mes anterior.
  const { data, isPending, isError, error: loadError, refetch } = useDashboardData(month);
  const debts = useDebts();
  const { table } = useRates();

  const monthMovements = useMemo(() => {
    const { from, to } = monthRange(month);
    return (data ?? []).filter((m) => m.date >= from && m.date <= to);
  }, [data, month]);
  const report = useMemo(
    () => buildMonthlyReport(data ?? [], month, currency),
    [data, month, currency],
  );
  const filenameBase = business.name;

  async function downloadPdf() {
    setBusy(true);
    setError(null);
    try {
      const { renderMonthlyReportPdf } = await import('./pdf');
      const endOfMonth = monthRange(month).to;
      const rate = table.resolveNumber('USD', endOfMonth < today ? endOfMonth : today);
      const blob = renderMonthlyReportPdf({
        report,
        businessName: business.name,
        municipality: business.municipality,
        alerts: debtAlerts(debts.data ?? [], today, business.alert_days_before),
        generatedOn: today,
        rateNote: `Cada movimiento se convirtió con la tasa de su día.${rate ? ` Tasa USD al cierre: ${formatNumber(rate, 2, 0)} CUP.` : ''}`,
      });
      downloadFile(blob, reportFilename(filenameBase, month, 'pdf'), 'application/pdf');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    const csv = toCsv(CSV_HEADERS, csvRows(monthMovements, csvDecimal));
    downloadFile(csv, reportFilename(filenameBase, month, 'csv'), 'text/csv;charset=utf-8');
  }

  const summary = `Resumen de ${formatYearMonth(month)} · ${business.name}\nIngresos: ${formatMoney(report.totals.income, currency)}\nGastos: ${formatMoney(report.totals.expense, currency)}\nGanancia neta: ${formatMoney(report.totals.net, currency)}`;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Informe mensual en PDF y exportación para su contador"
      />
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <MonthPicker value={month} onChange={setMonth} />
        </div>
        <div
          role="group"
          aria-label="Moneda del informe"
          className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"
        >
          {(['USD', 'CUP'] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
              className={
                currency === c
                  ? 'bg-brand-600 rounded-lg px-3 text-sm font-bold text-white'
                  : 'rounded-lg px-3 text-sm font-bold text-slate-600'
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <LoadingBlock rows={3} />
      ) : isError ? (
        <ErrorState error={loadError} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader
              title={`Informe de ${formatYearMonth(month)}`}
              subtitle={`${monthMovements.length} movimientos`}
            />
            <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-500">Ingresos</dt>
                <dd>
                  <MoneyText
                    cents={report.totals.income}
                    currency={currency}
                    compact
                    className="font-semibold"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Gastos</dt>
                <dd>
                  <MoneyText
                    cents={report.totals.expense}
                    currency={currency}
                    compact
                    className="font-semibold"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Neto</dt>
                <dd>
                  <MoneyText
                    cents={report.totals.net}
                    currency={currency}
                    compact
                    className="font-bold"
                  />
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              <Button
                icon={<Icon name="download" />}
                loading={busy}
                onClick={() => void downloadPdf()}
                block
              >
                Descargar PDF
              </Button>
              {business.phone_whatsapp && (
                <WhatsAppButton
                  phone={business.phone_whatsapp}
                  message={summary}
                  label="Enviar resumen por WhatsApp"
                  className="w-full"
                />
              )}
            </div>
            {error !== null && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {humanizeError(error)}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Exportar para el contador"
              subtitle="CSV compatible con Excel (separador ; y coma decimal)"
            />
            <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-slate-600">
              <li>Un movimiento por fila, en orden de fecha</li>
              <li>Monto y moneda originales</li>
              <li>Tasa USD aplicada y equivalentes en USD y CUP</li>
            </ul>
            <Button
              variant="secondary"
              icon={<Icon name="file" />}
              onClick={downloadCsv}
              block
              disabled={monthMovements.length === 0}
            >
              Descargar CSV
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
