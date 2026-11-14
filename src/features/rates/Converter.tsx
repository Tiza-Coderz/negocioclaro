import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { CURRENCIES, type Currency } from '@/domain/currency';
import { convert } from '@/domain/consolidation';
import { formatMoney, toCents } from '@/domain/money';
import type { RateTable } from '@/domain/rates';
import { todayInHavana } from '@/domain/dates';

/** Calculadora rápida con la tasa vigente hoy. */
export function Converter({ table }: { table: RateTable }) {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState<Currency>('USD');
  const [to, setTo] = useState<Currency>('CUP');

  let result: string;
  try {
    const cents = toCents(amount || '0');
    const out = convert(cents, from, to, todayInHavana(), table);
    result = out === null ? 'Falta una tasa' : formatMoney(out, to);
  } catch {
    result = 'Monto inválido';
  }

  return (
    <Card>
      <CardHeader title="Calculadora" subtitle="Con la tasa vigente hoy" />
      <div className="space-y-3">
        <Input
          label="Monto"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Select label="De" value={from} onChange={(e) => setFrom(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="text-brand-700 hover:bg-brand-50 mb-1 rounded-full p-2"
            aria-label="Intercambiar monedas"
          >
            ⇄
          </button>
          <Select label="A" value={to} onChange={(e) => setTo(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <output
          className="tabular bg-brand-50 text-brand-800 block rounded-xl px-4 py-3 text-center text-xl font-bold"
          aria-live="polite"
        >
          {result}
        </output>
      </div>
    </Card>
  );
}
