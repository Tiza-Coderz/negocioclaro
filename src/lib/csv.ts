/**
 * CSV pensado para el contador que abre el archivo en Excel en español:
 * separador ";" , coma decimal, BOM UTF-8 (para que las tildes se vean bien)
 * y saltos de línea CRLF.
 */
export type CsvValue = string | number | null | undefined;

/** Marca de orden de bytes: Excel la usa para detectar UTF-8. */
export const BOM = String.fromCharCode(0xfeff);

const NEEDS_QUOTES = /[";\r\n]/;

export function escapeCsv(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Evita inyección de fórmulas al abrir en Excel (=, +, -, @ al inicio de un texto).
  if (typeof value === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
  return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Número decimal con coma: 1234.5 → "1234,50". */
export function csvDecimal(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '';
  return value.toFixed(decimals).replace('.', ',');
}

export function toCsv(headers: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsv).join(';'));
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

export function downloadFile(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
