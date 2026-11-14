/**
 * Informe mensual en PDF (A4). Este módulo se carga con import() solo cuando el
 * usuario pulsa "Descargar PDF": jsPDF no pesa en la carga inicial.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DebtAlert } from '@/domain/debts';
import { dueLabel } from '@/domain/debts';
import { formatDate, formatYearMonth } from '@/domain/dates';
import { formatMoney, formatNumber, NARROW_NBSP } from '@/domain/money';
import type { MonthlyReport } from '@/domain/report';

const BRAND: [number, number, number] = [15, 76, 117];
const MUTED: [number, number, number] = [100, 116, 139];

// jsPDF con fuentes estándar no tiene el espacio fino ni el signo menos tipográfico.
const pdfText = (s: string) => s.replaceAll(NARROW_NBSP, ' ').replace(/−/g, '-');

export function renderMonthlyReportPdf(input: {
  report: MonthlyReport;
  businessName: string;
  municipality: string | null;
  alerts: DebtAlert[];
  generatedOn: string;
  rateNote: string;
}): Blob {
  const { report: r, businessName, municipality, alerts } = input;
  const money = (c: number) => pdfText(formatMoney(c, r.currency));
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;

  // Cabecera
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName, M, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Informe financiero · ${formatYearMonth(r.month)}${municipality ? ` · ${municipality}, La Habana` : ''}`,
    M,
    19,
  );
  doc.text(`Montos en ${r.currency}`, W - M, 12, { align: 'right' });
  doc.text(`Generado el ${formatDate(input.generatedOn)}`, W - M, 19, { align: 'right' });

  // KPI
  let y = 38;
  const kpis: [string, string][] = [
    ['Ingresos', money(r.totals.income)],
    ['Gastos', money(r.totals.expense)],
    ['Ganancia neta', money(r.totals.net)],
    ['Margen', r.marginPct === null ? '—' : `${pdfText(formatNumber(r.marginPct, 1, 0))} %`],
  ];
  const boxW = (W - M * 2 - 9) / 4;
  kpis.forEach(([label, value], i) => {
    const x = M + i * (boxW + 3);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'S');
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(label, x + 3, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(value, x + 3, y + 14);
    doc.setFont('helvetica', 'normal');
  });
  y += 26;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const change =
    r.netChangePct === null
      ? 'Sin datos del mes anterior para comparar.'
      : `La ganancia neta ${r.netChangePct >= 0 ? 'subió' : 'bajó'} ${pdfText(formatNumber(Math.abs(r.netChangePct), 1, 0))} % respecto ${r.previousUptoDay ? `al 1–${r.previousUptoDay} del mes anterior` : 'al mes anterior'} (${money(r.previous.net)}).`;
  doc.text(change, M, y);
  y += 5;
  doc.text(pdfText(input.rateNote), M, y);
  if (r.totals.missingRate > 0) {
    y += 5;
    doc.setTextColor(180, 83, 9);
    doc.text(
      `Atención: ${r.totals.missingRate} movimiento(s) sin tasa de cambio no se incluyen en los totales.`,
      M,
      y,
    );
  }
  y += 6;

  const pageH = doc.internal.pageSize.getHeight();
  const align = (i: number) => (i === 0 ? 'left' : 'right') as 'left' | 'right';
  const table = (title: string, head: string[], body: string[][], foot?: string[]) => {
    // Evita dejar el título y la cabecera huérfanos al pie de la página.
    if (y > pageH - 45) {
      doc.addPage();
      y = 16;
    }
    autoTable(doc, {
      startY: y,
      head: [
        [
          {
            content: title,
            colSpan: head.length,
            styles: {
              fillColor: [255, 255, 255],
              textColor: BRAND,
              fontSize: 11,
              fontStyle: 'bold',
              cellPadding: { top: 4, bottom: 2, left: 0 },
            },
          },
        ],
        head.map((content, i) => ({ content, styles: { halign: align(i) } })),
      ],
      body,
      ...(foot
        ? { foot: [foot.map((content, i) => ({ content, styles: { halign: align(i) } }))] }
        : {}),
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: Object.fromEntries(
        head.map((_, i) => [i, { halign: i === 0 ? 'left' : 'right' }]),
      ),
      theme: 'plain',
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  };

  const pct = (s: number) => `${pdfText(formatNumber(s * 100, 1, 0))} %`;
  table(
    'Ingresos por categoría',
    ['Categoría', 'Monto', '%'],
    r.byCategoryIncome.map((c) => [c.name, money(c.total), pct(c.share)]),
    ['Total', money(r.totals.income), '100 %'],
  );
  table(
    'Gastos por categoría',
    ['Categoría', 'Monto', '%'],
    r.byCategoryExpense.map((c) => [c.name, money(c.total), pct(c.share)]),
    ['Total', money(r.totals.expense), '100 %'],
  );
  table(
    'Por método de pago',
    ['Método', 'Entradas', 'Salidas'],
    r.byMethod.map((m) => [m.label, money(m.income), money(m.expense)]),
  );
  table(
    'Por moneda original (sin convertir)',
    ['Moneda', 'Entradas', 'Salidas'],
    r.byOriginalCurrency.map((c) => [
      c.currency,
      pdfText(formatMoney(c.income, c.currency)),
      pdfText(formatMoney(c.expense, c.currency)),
    ]),
  );
  if (r.topClients.length) {
    table(
      'Mejores clientes',
      ['Cliente', 'Compras', 'Monto'],
      r.topClients.map((c) => [c.name, String(c.count), money(c.total)]),
    );
  }
  if (alerts.length) {
    table(
      'Cuentas vencidas o por vencer',
      ['Contraparte', 'Concepto', 'Vencimiento', 'Pendiente'],
      alerts.map(({ debt, state }) => [
        `${debt.direction === 'por_cobrar' ? 'Cobrar · ' : 'Pagar · '}${debt.counterpartyName ?? ''}`,
        debt.concept,
        dueLabel(state),
        pdfText(formatMoney(state.pendingCents, debt.currency)),
      ]),
    );
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text('Generado con NegocioClaro', M, h - 8);
    doc.text(`Página ${i} de ${pages}`, W - M, h - 8, { align: 'right' });
  }

  return doc.output('blob');
}
