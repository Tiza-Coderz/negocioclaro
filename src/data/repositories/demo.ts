import { supabase, unwrap } from '../supabase';

/** Restablece la demo (RPC pública con límite de frecuencia en la BD). */
export async function resetDemoPublic(): Promise<void> {
  unwrap(await supabase.rpc('reset_demo'));
}
