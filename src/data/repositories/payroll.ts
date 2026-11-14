import type { Currency } from '@/domain/currency';
import type { IsoDate, YearMonth } from '@/domain/dates';
import { centsToDecimalString, toCents, type Cents } from '@/domain/money';
import type { PayrollLine } from '@/domain/payroll';
import { supabase, unwrap } from '../supabase';
import type { Tables } from '../database.types';

export type Worker = Tables<'workers'>;

export async function fetchWorkers(businessId: string): Promise<Worker[]> {
  return unwrap(
    await supabase
      .from('workers')
      .select('*')
      .eq('business_id', businessId)
      .order('active', { ascending: false })
      .order('full_name'),
  );
}

export interface WorkerDraft {
  full_name: string;
  position: string;
  phone: string | null;
  baseSalaryCents: Cents;
  salary_currency: Currency;
  hired_on: IsoDate;
  active: boolean;
}

export async function saveWorker(businessId: string, d: WorkerDraft, id?: string): Promise<void> {
  const row = {
    full_name: d.full_name,
    position: d.position,
    phone: d.phone,
    base_salary: centsToDecimalString(d.baseSalaryCents) as unknown as number,
    salary_currency: d.salary_currency,
    hired_on: d.hired_on,
    active: d.active,
  };
  if (id) unwrap(await supabase.from('workers').update(row).eq('id', id));
  else unwrap(await supabase.from('workers').insert({ ...row, business_id: businessId }));
}

export interface PayrollItemView extends PayrollLine {
  id: string;
  workerName: string;
  position: string;
}

export interface PayrollRunView {
  id: string;
  period: YearMonth;
  status: 'borrador' | 'pagada';
  paidOn: IsoDate | null;
  items: PayrollItemView[];
}

type RunRow = Tables<'payroll_runs'> & {
  items: (Tables<'payroll_items'> & { worker: { full_name: string; position: string } | null })[];
};

export async function fetchPayrollRun(
  businessId: string,
  period: YearMonth,
): Promise<PayrollRunView | null> {
  const rows = unwrap(
    await supabase
      .from('payroll_runs')
      .select('*, items:payroll_items(*, worker:workers(full_name, position))')
      .eq('business_id', businessId)
      .eq('period', period)
      .limit(1),
  ) as unknown as RunRow[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    period: r.period,
    status: r.status,
    paidOn: r.paid_on,
    items: r.items
      .map((i) => ({
        id: i.id,
        workerId: i.worker_id,
        workerName: i.worker?.full_name ?? '—',
        position: i.worker?.position ?? '',
        baseCents: toCents(i.base),
        bonusCents: toCents(i.bonus),
        deductionsCents: toCents(i.deductions),
        currency: i.currency,
      }))
      .sort((a, b) => a.workerName.localeCompare(b.workerName, 'es')),
  };
}

export async function preparePayroll(businessId: string, period: YearMonth): Promise<void> {
  unwrap(await supabase.rpc('prepare_payroll', { p_business: businessId, p_period: period }));
}

export async function updatePayrollItem(
  id: string,
  bonusCents: Cents,
  deductionsCents: Cents,
): Promise<void> {
  unwrap(
    await supabase
      .from('payroll_items')
      .update({
        bonus: centsToDecimalString(bonusCents) as unknown as number,
        deductions: centsToDecimalString(deductionsCents) as unknown as number,
      })
      .eq('id', id),
  );
}

export async function payPayroll(runId: string, paidOn: IsoDate): Promise<void> {
  unwrap(await supabase.rpc('pay_payroll', { p_run: runId, p_paid_on: paidOn }));
}

export async function reopenPayroll(runId: string): Promise<void> {
  unwrap(await supabase.rpc('reopen_payroll', { p_run: runId }));
}
