import type { Currency } from '@/domain/currency';
import type { IsoDate } from '@/domain/dates';
import { RateTable, type ExchangeRate } from '@/domain/rates';
import { supabase, unwrap } from '../supabase';
import type { Tables } from '../database.types';

export type RateRow = Tables<'exchange_rates'>;
export type ForeignCurrency = Exclude<Currency, 'CUP'>;

export async function fetchRates(businessId: string): Promise<RateRow[]> {
  return unwrap(
    await supabase
      .from('exchange_rates')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false }),
  );
}

export function toRateTable(rows: readonly RateRow[]): RateTable {
  return new RateTable(
    rows.map<ExchangeRate>((r) => ({
      date: r.date,
      currency: r.currency as ForeignCurrency,
      cupPerUnit: r.cup_per_unit,
    })),
  );
}

/** Crea o actualiza la tasa de una moneda para un día (upsert por fecha+moneda). */
export async function saveRate(input: {
  businessId: string;
  userId: string | null;
  date: IsoDate;
  currency: ForeignCurrency;
  cupPerUnit: number;
  note?: string | null;
}): Promise<void> {
  unwrap(
    await supabase.from('exchange_rates').upsert(
      {
        business_id: input.businessId,
        date: input.date,
        currency: input.currency,
        cup_per_unit: input.cupPerUnit,
        note: input.note ?? null,
        updated_by: input.userId,
      },
      { onConflict: 'business_id,currency,date' },
    ),
  );
}

export async function deleteRate(id: string): Promise<void> {
  unwrap(await supabase.from('exchange_rates').delete().eq('id', id));
}
