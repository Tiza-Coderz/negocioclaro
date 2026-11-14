import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Field';
import { humanizeError } from '@/components/ui/States';
import { useDeleteRate, useSaveRate } from '@/data/hooks/useRates';
import type { ForeignCurrency, RateRow } from '@/data/repositories/rates';
import { isIsoDate, todayInHavana } from '@/domain/dates';

export function RateDialog({
  initial,
  existing,
  onClose,
}: {
  initial: { date: string; currency: ForeignCurrency; value?: number };
  existing: RateRow | null;
  onClose: () => void;
}) {
  const [date, setDate] = useState(initial.date);
  const [currency, setCurrency] = useState<ForeignCurrency>(initial.currency);
  const [value, setValue] = useState(initial.value ? String(initial.value) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<{ date?: string; value?: string }>({});
  const save = useSaveRate();
  const remove = useDeleteRate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(value.replace(',', '.'));
    const next: typeof errors = {};
    if (!isIsoDate(date)) next.date = 'Indique una fecha válida.';
    else if (date > todayInHavana()) next.date = 'No se pueden registrar tasas de días futuros.';
    if (!Number.isFinite(parsed) || parsed <= 0)
      next.value = 'Indique cuántos CUP vale 1 unidad (mayor que 0).';
    else if (parsed > 100_000) next.value = 'El valor parece demasiado alto. Revíselo.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    save.mutate({ date, currency, cupPerUnit: parsed, note: note.trim() }, { onSuccess: onClose });
  }

  const error = save.error ?? remove.error;

  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? 'Corregir tasa' : 'Registrar tasa'}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto text-red-700"
              loading={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    '¿Eliminar esta tasa? Los movimientos de esa fecha usarán la tasa anterior.',
                  )
                )
                  remove.mutate(existing.id, { onSuccess: onClose });
              }}
            >
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="rate-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="rate-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={date}
            max={todayInHavana()}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Select
            label="Moneda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as ForeignCurrency)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="MLC">MLC</option>
          </Select>
        </div>
        <Input
          label={`CUP por 1 ${currency}`}
          inputMode="decimal"
          placeholder="Ej. 440"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.value}
          hint="Al guardar, los movimientos desde esta fecha se recalculan con la nueva tasa."
          autoFocus
        />
        <Input
          label="Nota (opcional)"
          placeholder="Ej. tasa informal de la mañana"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
