import type { Currency, MovementKind, PaymentMethod } from '@/domain/currency';
import type { ConsolidatedMovement } from '@/domain/consolidation';
import type { IsoDate } from '@/domain/dates';
import { centsToDecimalString, toCents, type Cents } from '@/domain/money';
import { supabase, unwrap } from '../supabase';
import type { Tables } from '../database.types';

type Row = Tables<'movements'>;

/** Movimiento listo para la UI: montos en centavos y nombres relacionados. */
export interface Movement extends ConsolidatedMovement {
  id: string;
  amountCents: Cents;
  currency: Currency;
  method: PaymentMethod;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  clientId: string | null;
  clientName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  debtId: string | null;
  note: string | null;
  attachmentPath: string | null;
  source: Row['source'];
  rateCupUsd: number | null;
  rateDate: IsoDate | null;
  missingRate: boolean;
}

const SELECT = `
  id, kind, date, amount, currency, method, note, attachment_path, source, debt_id,
  category_id, client_id, supplier_id,
  rate_date, rate_cup_usd, amount_usd, amount_cup, missing_rate,
  category:categories(name, color, icon),
  client:clients(name),
  supplier:suppliers(name)
` as const;

type SelectedRow = Pick<
  Row,
  | 'id'
  | 'kind'
  | 'date'
  | 'amount'
  | 'currency'
  | 'method'
  | 'note'
  | 'attachment_path'
  | 'source'
  | 'debt_id'
  | 'category_id'
  | 'client_id'
  | 'supplier_id'
  | 'rate_date'
  | 'rate_cup_usd'
  | 'amount_usd'
  | 'amount_cup'
  | 'missing_rate'
> & {
  category: { name: string; color: string; icon: string | null } | null;
  client: { name: string } | null;
  supplier: { name: string } | null;
};

const cents = (v: number | null): Cents | null => (v === null ? null : toCents(v));

export function mapMovement(r: SelectedRow): Movement {
  return {
    id: r.id,
    kind: r.kind,
    date: r.date,
    amountCents: toCents(r.amount),
    currency: r.currency,
    method: r.method,
    categoryId: r.category_id,
    categoryName: r.category?.name ?? null,
    categoryColor: r.category?.color ?? null,
    categoryIcon: r.category?.icon ?? null,
    clientId: r.client_id,
    clientName: r.client?.name ?? null,
    supplierId: r.supplier_id,
    supplierName: r.supplier?.name ?? null,
    debtId: r.debt_id,
    note: r.note,
    attachmentPath: r.attachment_path,
    source: r.source,
    rateCupUsd: r.rate_cup_usd,
    rateDate: r.rate_date,
    amountUsdCents: cents(r.amount_usd),
    amountCupCents: cents(r.amount_cup),
    missingRate: r.missing_rate,
  };
}

export interface MovementFilters {
  from: IsoDate;
  to: IsoDate;
  kind?: MovementKind | undefined;
  currency?: Currency | undefined;
  categoryId?: string | undefined;
}

export async function fetchMovements(businessId: string, f: MovementFilters): Promise<Movement[]> {
  let q = supabase
    .from('movements')
    .select(SELECT)
    .eq('business_id', businessId)
    .gte('date', f.from)
    .lte('date', f.to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2000);
  if (f.kind) q = q.eq('kind', f.kind);
  if (f.currency) q = q.eq('currency', f.currency);
  if (f.categoryId) q = q.eq('category_id', f.categoryId);
  const rows = unwrap(await q) as unknown as SelectedRow[];
  return rows.map(mapMovement);
}

export interface MovementDraft {
  kind: MovementKind;
  date: IsoDate;
  amountCents: Cents;
  currency: Currency;
  method: PaymentMethod;
  categoryId: string | null;
  clientId?: string | null;
  supplierId?: string | null;
  debtId?: string | null;
  note?: string | null;
  attachmentPath?: string | null;
  source?: Row['source'];
}

function toRow(businessId: string, d: MovementDraft) {
  return {
    business_id: businessId,
    kind: d.kind,
    date: d.date,
    // Enviamos el decimal como string exacto: PostgREST lo castea a numeric sin pasar por float.
    amount: centsToDecimalString(d.amountCents) as unknown as number,
    currency: d.currency,
    method: d.method,
    category_id: d.categoryId,
    client_id: d.kind === 'ingreso' ? (d.clientId ?? null) : null,
    supplier_id: d.kind === 'gasto' ? (d.supplierId ?? null) : null,
    debt_id: d.debtId ?? null,
    note: d.note?.trim() || null,
    attachment_path: d.attachmentPath ?? null,
    source: d.source ?? 'completo',
  };
}

export async function createMovement(businessId: string, d: MovementDraft): Promise<Movement> {
  const row = unwrap(
    await supabase.from('movements').insert(toRow(businessId, d)).select(SELECT).single(),
  ) as unknown as SelectedRow;
  return mapMovement(row);
}

export async function updateMovement(
  businessId: string,
  id: string,
  d: MovementDraft,
): Promise<void> {
  unwrap(await supabase.from('movements').update(toRow(businessId, d)).eq('id', id));
}

export async function deleteMovement(id: string, attachmentPath: string | null): Promise<void> {
  unwrap(await supabase.from('movements').delete().eq('id', id));
  if (attachmentPath) await supabase.storage.from('comprobantes').remove([attachmentPath]);
}

// ------------------------------------------------------------------ Adjuntos

export async function uploadAttachment(businessId: string, file: Blob): Promise<string> {
  const path = `${businessId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from('comprobantes')
    .upload(path, file, { contentType: file.type || 'image/webp', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
