import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Field';
import { humanizeError } from '@/components/ui/States';
import { useClients, useSuppliers } from '@/data/hooks/useCatalogs';
import { useDeleteDebt, useSaveDebt } from '@/data/hooks/useDebts';
import type { DebtView } from '@/data/repositories/debts';
import { CURRENCIES, type Currency } from '@/domain/currency';
import { addDays, isIsoDate, todayInHavana } from '@/domain/dates';
import type { DebtDirection } from '@/domain/debts';
import { centsToDecimalString, toCents } from '@/domain/money';

export function DebtDialog({
  debt,
  defaultDirection,
  onClose,
}: {
  debt: DebtView | null;
  defaultDirection: DebtDirection;
  onClose: () => void;
}) {
  const today = todayInHavana();
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? defaultDirection);
  const [counterpartyId, setCounterpartyId] = useState(debt?.clientId ?? debt?.supplierId ?? '');
  const [concept, setConcept] = useState(debt?.concept ?? '');
  const [amount, setAmount] = useState(debt ? centsToDecimalString(debt.amountCents) : '');
  const [currency, setCurrency] = useState<Currency>(debt?.currency ?? 'CUP');
  const [issuedOn, setIssuedOn] = useState(debt?.issuedOn ?? today);
  const [dueOn, setDueOn] = useState(debt?.dueOn ?? addDays(today, 15));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clients = useClients();
  const suppliers = useSuppliers();
  const save = useSaveDebt();
  const remove = useDeleteDebt();
  const contacts = direction === 'por_cobrar' ? clients.data : suppliers.data;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    let cents = 0;
    try {
      cents = toCents(amount);
      if (cents <= 0) next.amount = 'El importe debe ser mayor que cero.';
      else if (debt && cents < debt.paidCents) next.amount = 'No puede ser menor que lo ya pagado.';
    } catch {
      next.amount = 'Escriba un importe válido.';
    }
    if (concept.trim().length < 2) next.concept = 'Describa la cuenta (p. ej. número de factura).';
    if (!isIsoDate(issuedOn)) next.issuedOn = 'Fecha inválida.';
    if (!isIsoDate(dueOn)) next.dueOn = 'Fecha inválida.';
    else if (dueOn < issuedOn) next.dueOn = 'El vencimiento no puede ser anterior a la emisión.';
    if (!counterpartyId)
      next.counterparty = direction === 'por_cobrar' ? 'Elija el cliente.' : 'Elija el proveedor.';
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      {
        draft: {
          direction,
          counterpartyId,
          concept: concept.trim(),
          amountCents: cents,
          currency,
          issuedOn,
          dueOn,
        },
        ...(debt ? { id: debt.id } : {}),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={debt ? 'Editar cuenta' : 'Nueva cuenta'}
      footer={
        <>
          {debt && (
            <Button
              variant="ghost"
              className="mr-auto text-red-700"
              loading={remove.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    '¿Eliminar esta cuenta? Los pagos registrados se conservan como movimientos.',
                  )
                )
                  remove.mutate(debt.id, { onSuccess: onClose });
              }}
            >
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="debt-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="debt-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Select
          label="Tipo"
          value={direction}
          disabled={Boolean(debt)}
          onChange={(e) => {
            setDirection(e.target.value as DebtDirection);
            setCounterpartyId('');
          }}
        >
          <option value="por_cobrar">Por cobrar (un cliente me debe)</option>
          <option value="por_pagar">Por pagar (le debo a un proveedor)</option>
        </Select>
        <Select
          label={direction === 'por_cobrar' ? 'Cliente' : 'Proveedor'}
          value={counterpartyId}
          onChange={(e) => setCounterpartyId(e.target.value)}
          error={errors.counterparty}
        >
          <option value="">— Elija —</option>
          {(contacts ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          label="Concepto"
          placeholder="Ej. Factura 0163 · pollo y aceite"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          error={errors.concept}
          maxLength={200}
        />
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Input
            label="Importe"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
          />
          <Select
            label="Moneda"
            value={currency}
            disabled={Boolean(debt && debt.paidCents > 0)}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Emitida"
            type="date"
            value={issuedOn}
            onChange={(e) => setIssuedOn(e.target.value)}
            error={errors.issuedOn}
          />
          <Input
            label="Vence"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            error={errors.dueOn}
          />
        </div>
        {(save.error ?? remove.error) && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(save.error ?? remove.error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
