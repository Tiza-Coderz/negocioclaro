import {
  addMonths,
  formatYearMonth,
  todayInHavana,
  toYearMonth,
  type YearMonth,
} from '@/domain/dates';

/** Selector de mes con flechas: más cómodo en móvil que un <input type="month">. */
export function MonthPicker({
  value,
  onChange,
}: {
  value: YearMonth;
  onChange: (m: YearMonth) => void;
}) {
  const current = toYearMonth(todayInHavana());
  const isCurrent = value >= current;
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-1 py-1 shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => onChange(addMonths(value, -1))}
        className="text-brand-700 hover:bg-brand-50 rounded-lg px-3 py-2 text-lg"
        aria-label="Mes anterior"
      >
        ‹
      </button>
      <span className="font-semibold text-slate-800 capitalize" aria-live="polite">
        {formatYearMonth(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(addMonths(value, 1))}
        disabled={isCurrent}
        className="text-brand-700 hover:bg-brand-50 rounded-lg px-3 py-2 text-lg disabled:text-slate-300 disabled:hover:bg-transparent"
        aria-label="Mes siguiente"
      >
        ›
      </button>
    </div>
  );
}
