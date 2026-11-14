import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { humanizeError } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { useCategories, useClients, useSuppliers } from '@/data/hooks/useCatalogs';
import { useDeleteMovement, useSaveMovement } from '@/data/hooks/useMovements';
import { useRates } from '@/data/hooks/useRates';
import type { Movement } from '@/data/repositories/movements';
import {
  CURRENCIES,
  PAYMENT_METHOD_LABELS,
  type Currency,
  type MovementKind,
} from '@/domain/currency';
import { todayInHavana } from '@/domain/dates';
import { centsToDecimalString } from '@/domain/money';
import { AttachmentField } from './AttachmentField';
import { ConversionPreview } from './ConversionPreview';
import {
  METHODS_BY_CURRENCY,
  validateMovement,
  type MovementFormErrors,
  type MovementFormValues,
} from './validation';

function initialValues(m: Movement | null, kind: MovementKind): MovementFormValues {
  if (!m) {
    return {
      kind,
      date: todayInHavana(),
      amount: '',
      currency: 'CUP',
      method: 'efectivo',
      categoryId: '',
      clientId: '',
      supplierId: '',
      note: '',
    };
  }
  return {
    kind: m.kind,
    date: m.date,
    amount: centsToDecimalString(m.amountCents),
    currency: m.currency,
    method: m.method,
    categoryId: m.categoryId ?? '',
    clientId: m.clientId ?? '',
    supplierId: m.supplierId ?? '',
    note: m.note ?? '',
  };
}

export function MovementDialog({
  movement,
  defaultKind = 'ingreso',
  onClose,
}: {
  movement: Movement | null;
  defaultKind?: MovementKind;
  onClose: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(movement, defaultKind));
  const [errors, setErrors] = useState<MovementFormErrors>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [keepAttachment, setKeepAttachment] = useState(Boolean(movement?.attachmentPath));

  const categories = useCategories();
  const clients = useClients();
  const suppliers = useSuppliers();
  const { table } = useRates();
  const save = useSaveMovement();
  const remove = useDeleteMovement();

  const set = <K extends keyof MovementFormValues>(key: K, value: MovementFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const currency = values.currency as Currency;
  const allowedMethods = METHODS_BY_CURRENCY[currency];

  // Si cambia la moneda y el método deja de tener sentido, elegimos el primero válido.
  function changeCurrency(next: Currency) {
    setValues((v) => {
      const methods = METHODS_BY_CURRENCY[next];
      const method = (methods as string[]).includes(v.method)
        ? v.method
        : (methods[0] ?? 'efectivo');
      return { ...v, currency: next, method };
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateMovement(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(
      {
        ...(movement ? { id: movement.id } : {}),
        draft: {
          ...result.value,
          debtId: movement?.debtId ?? null,
          attachmentPath: keepAttachment ? (movement?.attachmentPath ?? null) : null,
          source: movement?.source ?? 'completo',
        },
        photo,
      },
      { onSuccess: onClose },
    );
  }

  const cats = (categories.data ?? []).filter((c) => c.kind === values.kind);

  return (
    <Dialog
      open
      onClose={onClose}
      title={movement ? 'Editar movimiento' : 'Nuevo movimiento'}
      footer={
        <>
          {movement && (
            <Button
              variant="ghost"
              className="mr-auto text-red-700"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.'))
                  remove.mutate(
                    { id: movement.id, attachmentPath: movement.attachmentPath },
                    { onSuccess: onClose },
                  );
              }}
            >
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="sr-only">Tipo de movimiento</legend>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(['ingreso', 'gasto'] as const).map((k) => (
              <label
                key={k}
                className={cn(
                  'has-[:focus-visible]:ring-brand-500 cursor-pointer rounded-lg py-2 text-center text-sm font-semibold has-[:focus-visible]:ring-2',
                  values.kind === k
                    ? k === 'ingreso'
                      ? 'text-income bg-white shadow-sm'
                      : 'text-expense bg-white shadow-sm'
                    : 'text-slate-500',
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={values.kind === k}
                  onChange={() => setValues((v) => ({ ...v, kind: k, categoryId: '' }))}
                  className="sr-only"
                />
                {k === 'ingreso' ? 'Ingreso' : 'Gasto'}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Input
            label="Monto"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
            autoFocus={!movement}
            className="tabular text-lg font-semibold"
          />
          <Select
            label="Moneda"
            value={values.currency}
            onChange={(e) => changeCurrency(e.target.value as Currency)}
            error={errors.currency}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>

        <ConversionPreview
          amount={values.amount}
          currency={currency}
          date={values.date}
          table={table}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <Select
            label="Método"
            value={values.method}
            onChange={(e) => set('method', e.target.value)}
            error={errors.method}
          >
            {allowedMethods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Categoría"
          value={values.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
        >
          <option value="">Sin categoría</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ''}
              {c.name}
            </option>
          ))}
        </Select>

        {values.kind === 'ingreso' ? (
          <Select
            label="Cliente (opcional)"
            value={values.clientId}
            onChange={(e) => set('clientId', e.target.value)}
          >
            <option value="">— Ninguno —</option>
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            label="Proveedor (opcional)"
            value={values.supplierId}
            onChange={(e) => set('supplierId', e.target.value)}
          >
            <option value="">— Ninguno —</option>
            {(suppliers.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          label="Nota (opcional)"
          value={values.note}
          onChange={(e) => set('note', e.target.value)}
          error={errors.note}
          maxLength={500}
          placeholder="Ej. 20 cajas de pollo"
        />

        <AttachmentField
          existingPath={keepAttachment ? (movement?.attachmentPath ?? null) : null}
          onRemoveExisting={() => setKeepAttachment(false)}
          photo={photo}
          onPhoto={setPhoto}
        />

        {(save.error ?? remove.error) && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(save.error ?? remove.error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
