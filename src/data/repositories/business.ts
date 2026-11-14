import { supabase, unwrap } from '../supabase';
import type { Tables } from '../database.types';

export type Business = Tables<'businesses'>;
export type MemberRole = Tables<'business_members'>['role'];

export interface Membership {
  business: Business;
  role: MemberRole;
}

/** Primer negocio del usuario (la demo tiene uno solo). */
export async function fetchMyBusiness(): Promise<Membership | null> {
  const rows = unwrap(
    await supabase
      .from('business_members')
      .select('role, business:businesses(*)')
      .order('created_at')
      .limit(1),
  );
  const first = rows[0];
  if (!first?.business) return null;
  return { business: first.business, role: first.role };
}

export async function updateBusiness(
  id: string,
  patch: Partial<Pick<Business, 'name' | 'municipality' | 'phone_whatsapp' | 'alert_days_before'>>,
): Promise<void> {
  unwrap(await supabase.from('businesses').update(patch).eq('id', id));
}
