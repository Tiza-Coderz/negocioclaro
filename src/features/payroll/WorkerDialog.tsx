import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Field';
import { humanizeError } from '@/components/ui/States';
import { queryKeys } from '@/data/queryKeys';
import { saveWorker, type Worker } from '@/data/repositories/payroll';
import { CURRENCIES, type Currency } from '@/domain/currency';
import { isIsoDate, todayInHavana } from '@/domain/dates';
import { centsToDecimalString, toCents } from '@/domain/money';

export function WorkerDialog({ worker, onClose }: { worker: Worker | null; onClose: () => void }) {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  const [name, setName] = useState(worker?.full_name ?? '');
  const [position, setPosition] = useState(worker?.position ?? '');
  const [phone, setPhone] = useState(worker?.phone ?? '');
  const [salary, setSalary] = useState(
    worker ? centsToDecimalString(toCents(worker.base_salary)) : '',
  );
  const [currency, setCurrency] = useState<Currency>(worker?.salary_currency ?? 'CUP');
  const [hiredOn, setHiredOn] = useState(worker?.hired_on ?? todayInHavana());
  const [active, setActive] = useState(worker?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (salaryCents: number) =>
      saveWorker(
        businessId,
        {
          full_name: name.trim(),
          position: position.trim(),
          phone: phone.trim() || null,
          baseSalaryCents: salaryCents,
          salary_currency: currency,
          hired_on: hiredOn,
          active,
        },
        worker?.id,
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.workers(businessId) });
      onClose();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    let cents = 0;
    try {
      cents = toCents(salary);
      if (cents < 0) next.salary = 'El salario no puede ser negativo.';
    } catch {
      next.salary = 'Indique el salario base.';
    }
    if (name.trim().length < 2) next.name = 'Escriba el nombre completo.';
    if (position.trim().length < 2) next.position = 'Indique el cargo.';
    if (!isIsoDate(hiredOn)) next.hiredOn = 'Fecha inválida.';
    setErrors(next);
    if (!Object.keys(next).length) save.mutate(cents);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={worker ? 'Editar trabajador' : 'Nuevo trabajador'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="worker-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="worker-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre y apellidos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cargo"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            error={errors.position}
          />
          <Input
            label="Teléfono"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Input
            label="Salario base mensual"
            inputMode="decimal"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            error={errors.salary}
          />
          <Select
            label="Moneda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Input
          label="Fecha de alta"
          type="date"
          value={hiredOn}
          onChange={(e) => setHiredOn(e.target.value)}
          error={errors.hiredOn}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="text-brand-600 size-5 rounded border-slate-300"
          />
          Trabajador activo (se incluye en nuevas nóminas)
        </label>
        {save.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(save.error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
