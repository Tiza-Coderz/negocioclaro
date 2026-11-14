import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Field';
import { humanizeError } from '@/components/ui/States';
import { useCategories } from '@/data/hooks/useCatalogs';
import { useRegisterPayment } from '@/data/hooks/useDebts';
import type { DebtView } from '@/data/repositories/debts';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/domain/currency';
import { todayInHavana } from '@/domain/dates';
import { validatePayment } from '@/domain/debts';
import { centsToDecimalString, formatMoney, toCents } from '@/domain/money';
import { METHODS_BY_CURRENCY } from '../movements/validation';

export function PaymentDialog({ debt, onClose }: { debt: DebtView; onClose: () => void }) {
  const pending = debt.amountCents - debt.paidCents;
  const [amount, setAmount] = useState(centsToDecimalString(pending));
  const [date, setDate] = useState(todayInHavana());
  const methods = METHODS_BY_CURRENCY[debt.currency];
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? 'efectivo');
  const [error, setError] = useState<string | null>(null);
  const categories = useCategories();
  const pay = useRegisterPayment();
  const isReceivable = debt.direction === 'por_cobrar';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    let cents: number;
    try {
      cents = toCents(amount);
    } catch {
      setError('Escriba un monto válido.');
      return;
    }
    const msg = validatePayment(debt, cents);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    // Categoría por defecto: ventas mayoristas al cobrar, compra de mercancía al pagar.
    const kind = isReceivable ? 'ingreso' : 'gasto';
    const category = (categories.data ?? []).find((c) => c.kind === kind) ?? null;
    pay.mutate(
      { debt, amountCents: cents, date, method, categoryId: category?.id ?? null },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={isReceivable ? 'Registrar cobro' : 'Registrar pago'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="payment-form" loading={pay.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          {debt.counterpartyName} · {debt.concept}
          <br />
          Pendiente: <strong>{formatMoney(pending, debt.currency)}</strong>
        </p>
        <Input
          label={`Monto (${debt.currency})`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={date}
            max={todayInHavana()}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            label="Método"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-slate-500">
          Se creará un {isReceivable ? 'ingreso' : 'gasto'} enlazado a esta cuenta.
        </p>
        {pay.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(pay.error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
