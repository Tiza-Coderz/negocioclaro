/** Variables de entorno tipadas y validadas en un solo lugar. */
function read(name: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Falta la variable de entorno ${String(name)}. Revise su .env.local`);
  }
  return value;
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL', 'http://127.0.0.1:55321'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY', 'missing-anon-key'),
  demoMode: read('VITE_DEMO_MODE', 'false') === 'true',
  demoEmail: read('VITE_DEMO_EMAIL', 'admin@demo.cu'),
  demoPassword: read('VITE_DEMO_PASSWORD', 'demo1234'),
  contactWhatsapp: read('VITE_CONTACT_WHATSAPP', ''),
} as const;
