import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from './database.types';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Lanza el error de Supabase como Error normal para que TanStack Query lo gestione. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  // En selects sin error, `data` nunca es null; en update/delete se ignora el valor.
  return result.data as T;
}
