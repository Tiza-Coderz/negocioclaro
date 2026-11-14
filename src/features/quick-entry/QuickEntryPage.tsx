import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { humanizeError } from '@/components/ui/States';
import { useCategories } from '@/data/hooks/useCatalogs';
import { useSaveMovement } from '@/data/hooks/useMovements';
import { useRates } from '@/data/hooks/useRates';
import { CURRENCIES, type Currency, type MovementKind } from '@/domain/currency';
import { todayInHavana } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { ConversionPreview } from '../movements/ConversionPreview';
import { METHODS_BY_CURRENCY, validateMovement } from '../movements/validation';
import { loadQuickPrefs, saveQuickPrefs } from './prefs';

/**
 * Registro rápido desde el móvil: 3 campos (monto, tipo, categoría).
 * Fecha = hoy; moneda y método = los últimos usados (recordados en el dispositivo).
 */
export default function QuickEntryPage() {
  const navigate = useNavigate();
  const prefs = loadQuickPrefs();
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<MovementKind>(prefs.kind);
  const [currency, setCurrency] = useState<Currency>(prefs.currency);
  const [chosenCategory, setCategoryId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const categories = useCategories();
  const { table } = useRates();
  const save = useSaveMovement();

  const cats = (categories.data ?? []).filter((c) => c.kind === kind);

  // Categoría efectiva: la elegida si es de este tipo; si no, la última usada o la primera.
  const categoryId =
    cats.find((c) => c.id === chosenCategory)?.id ??
    cats.find((c) => c.id === prefs.lastCategory[kind])?.id ??
    cats[0]?.id ??
    '';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const method = METHODS_BY_CURRENCY[currency][0] ?? 'efectivo';
    const result = validateMovement({
      kind,
      date: todayInHavana(),
      amount,
      currency,
      method,
      categoryId,
      clientId: '',
      supplierId: '',
      note: '',
    });
    if (!result.ok) {
      setError(result.errors.amount ?? Object.values(result.errors)[0] ?? 'Revise los datos.');
      amountRef.current?.focus();
      return;
    }
    setError(null);
    save.mutate(
      { draft: { ...result.value, source: 'rapido' } },
      {
        onSuccess: () => {
          saveQuickPrefs({
            kind,
            currency,
            lastCategory: { ...prefs.lastCategory, [kind]: categoryId },
          });
          setSaved(
            `${kind === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${formatMoney(result.value.amountCents, currency)} guardado.`,
          );
          setAmount('');
          amountRef.current?.focus();
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Registro rápido</h1>
        <Link to="/movimientos" className="text-brand-700 text-sm font-semibold">
          Ver todos
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {/* 1. Monto */}
        <div>
          <label htmlFor="quick-amount" className="mb-1 block text-sm font-medium text-slate-700">
            ¿Cuánto?
          </label>
          <div className="focus-within:ring-brand-500 flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-300 focus-within:ring-2">
            <input
              ref={amountRef}
              id="quick-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'quick-error' : undefined}
              className="tabular min-w-0 flex-1 border-0 bg-transparent px-4 py-4 text-4xl font-bold text-slate-900 focus:ring-0"
              autoFocus
            />
            <label className="sr-only" htmlFor="quick-currency">
              Moneda
            </label>
            <select
              id="quick-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="text-brand-700 border-0 border-l border-slate-200 bg-slate-50 px-3 text-lg font-bold focus:ring-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {error && (
            <p id="quick-error" role="alert" className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-2">
            <ConversionPreview
              amount={amount}
              currency={currency}
              date={todayInHavana()}
              table={table}
            />
          </div>
        </div>

        {/* 2. Tipo */}
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">
            ¿Entró o salió dinero?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(['ingreso', 'gasto'] as const).map((k) => (
              <label
                key={k}
                className={cn(
                  'has-[:focus-visible]:ring-brand-500 cursor-pointer rounded-2xl py-4 text-center text-lg font-bold ring-1 has-[:focus-visible]:ring-2',
                  kind === k
                    ? k === 'ingreso'
                      ? 'bg-income ring-income text-white'
                      : 'bg-expense ring-expense text-white'
                    : 'bg-white text-slate-600 ring-slate-300',
                )}
              >
                <input
                  type="radio"
                  name="quick-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                {k === 'ingreso' ? '↓ Entró' : '↑ Salió'}
              </label>
            ))}
          </div>
        </fieldset>

        {/* 3. Categoría */}
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">¿De qué?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cats.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'has-[:focus-visible]:ring-brand-500 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ring-1 has-[:focus-visible]:ring-2',
                  categoryId === c.id
                    ? 'bg-brand-50 text-brand-800 ring-brand-500'
                    : 'bg-white text-slate-700 ring-slate-200',
                )}
              >
                <input
                  type="radio"
                  name="quick-cat"
                  value={c.id}
                  checked={categoryId === c.id}
                  onChange={() => setCategoryId(c.id)}
                  className="sr-only"
                />
                <span aria-hidden>{c.icon}</span>
                <span className="truncate">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" block size="lg" loading={save.isPending} className="h-14 text-lg">
          Guardar
        </Button>

        <p aria-live="polite" className="min-h-6 text-center text-sm">
          {saved && <span className="font-medium text-emerald-700">✓ {saved}</span>}
          {save.isError && <span className="text-red-700">{humanizeError(save.error)}</span>}
          {save.isPaused && (
            <span className="text-amber-700">Sin conexión: se guardará al volver la señal.</span>
          )}
        </p>

        <button
          type="button"
          onClick={() => navigate('/movimientos?nuevo=1')}
          className="block w-full text-center text-sm text-slate-500 underline"
        >
          Necesito añadir cliente, nota o foto
        </button>
      </form>
    </div>
  );
}
