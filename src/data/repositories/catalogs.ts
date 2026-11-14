import { supabase, unwrap } from '../supabase';
import type { Tables, TablesInsert } from '../database.types';

export type Category = Tables<'categories'>;
export type Client = Tables<'clients'>;
export type Supplier = Tables<'suppliers'>;

export async function fetchCategories(businessId: string): Promise<Category[]> {
  return unwrap(
    await supabase
      .from('categories')
      .select('*')
      .eq('business_id', businessId)
      .order('kind')
      .order('sort_order'),
  );
}

export async function fetchClients(businessId: string): Promise<Client[]> {
  return unwrap(
    await supabase.from('clients').select('*').eq('business_id', businessId).order('name'),
  );
}

export async function fetchSuppliers(businessId: string): Promise<Supplier[]> {
  return unwrap(
    await supabase.from('suppliers').select('*').eq('business_id', businessId).order('name'),
  );
}

type ContactTable = 'clients' | 'suppliers';
export type ContactInput = Omit<TablesInsert<'suppliers'>, 'business_id' | 'id' | 'created_at'>;

export async function saveContact(
  table: ContactTable,
  businessId: string,
  input: ContactInput,
  id?: string,
): Promise<void> {
  const base = {
    name: input.name,
    contact_name: input.contact_name ?? null,
    phone: input.phone ?? null,
    municipality: input.municipality ?? null,
    notes: input.notes ?? null,
  };
  if (table === 'clients') {
    if (id) unwrap(await supabase.from('clients').update(base).eq('id', id));
    else unwrap(await supabase.from('clients').insert({ ...base, business_id: businessId }));
    return;
  }
  const row = { ...base, products: input.products ?? null };
  if (id) unwrap(await supabase.from('suppliers').update(row).eq('id', id));
  else unwrap(await supabase.from('suppliers').insert({ ...row, business_id: businessId }));
}

export async function deleteContact(table: ContactTable, id: string): Promise<void> {
  unwrap(await supabase.from(table).delete().eq('id', id));
}
