import type { Currency, PaymentMethod } from '@/domain/currency';
import type { Debt, DebtDirection } from '@/domain/debts';
import type { IsoDate } from '@/domain/dates';
import { centsToDecimalString, toCents, type Cents } from '@/domain/money';
import { supabase, unwrap } from '../supabase';
import type { Tables } from '../database.types';
import { createMovement } from './movements';

type Row = Tables<'debts'> & {
  client: { name: string; phone: string | null } | null;
  supplier: { name: string; phone: string | null } | null;
};

export interface DebtView extends Debt {
  clientId: string | null;
  supplierId: string | null;
}

function map(r: Row): DebtView {
  const cp = r.client ?? r.supplier;
  return {
    id: r.id,
    direction: r.direction,
    counterpartyName: cp?.name ?? null,
    counterpartyPhone: cp?.phone ?? null,
    concept: r.concept,
    amountCents: toCents(r.amount),
    paidCents: toCents(r.paid_amount),
    currency: r.currency,
    issuedOn: r.issued_on,
    dueOn: r.due_on,
    clientId: r.client_id,
    supplierId: r.supplier_id,
  };
}

export async function fetchDebts(businessId: string): Promise<DebtView[]> {
  const rows = unwrap(
    await supabase
      .from('debts')
      .select('*, client:clients(name, phone), supplier:suppliers(name, phone)')
      .eq('business_id', businessId)
      .order('due_on'),
  ) as unknown as Row[];
  return rows.map(map);
}

export interface DebtDraft {
  direction: DebtDirection;
  counterpartyId: string | null;
  concept: string;
  amountCents: Cents;
  currency: Currency;
  issuedOn: IsoDate;
  dueOn: IsoDate;
}

export async function saveDebt(businessId: string, d: DebtDraft, id?: string): Promise<void> {
  const row = {
    direction: d.direction,
    client_id: d.direction === 'por_cobrar' ? d.counterpartyId : null,
    supplier_id: d.direction === 'por_pagar' ? d.counterpartyId : null,
    concept: d.concept,
    amount: centsToDecimalString(d.amountCents) as unknown as number,
    currency: d.currency,
    issued_on: d.issuedOn,
    due_on: d.dueOn,
  };
  if (id) unwrap(await supabase.from('debts').update(row).eq('id', id));
  else unwrap(await supabase.from('debts').insert({ ...row, business_id: businessId }));
}

export async function deleteDebt(id: string): Promise<void> {
  unwrap(await supabase.from('debts').delete().eq('id', id));
}

/** Registra un pago: crea el movimiento enlazado y la BD actualiza lo pagado. */
export async function registerPayment(
  businessId: string,
  debt: DebtView,
  p: { amountCents: Cents; date: IsoDate; method: PaymentMethod; categoryId: string | null },
): Promise<void> {
  await createMovement(businessId, {
    kind: debt.direction === 'por_cobrar' ? 'ingreso' : 'gasto',
    date: p.date,
    amountCents: p.amountCents,
    currency: debt.currency,
    method: p.method,
    categoryId: p.categoryId,
    clientId: debt.clientId,
    supplierId: debt.supplierId,
    debtId: debt.id,
    note: `Pago · ${debt.concept}`,
    source: 'cuenta',
  });
}
