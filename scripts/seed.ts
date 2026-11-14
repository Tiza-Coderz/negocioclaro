/**
 * Siembra la demo: crea (o reutiliza) el usuario admin@demo.cu y genera 6 meses
 * de datos para "Distribuidora Del Valle".
 *
 * Uso:   npm run seed           (lee .env.local)
 * Necesita VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. La service role key es
 * secreta: solo se usa aquí, nunca en el frontend.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.VITE_DEMO_EMAIL ?? 'admin@demo.cu';
const password = process.env.VITE_DEMO_PASSWORD ?? 'demo1234';

if (!url || !serviceKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUserId(): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let userId = await findUserId();
  if (userId) {
    // Asegura la contraseña demo por si alguien la cambió.
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    console.info(`Usuario demo existente: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Carlos del Valle' },
    });
    if (error) throw error;
    userId = data.user.id;
    console.info(`Usuario demo creado: ${email}`);
  }

  const { data: businessId, error } = await admin.rpc('ensure_demo_business', { p_user: userId });
  if (error) throw error;

  const { count } = await admin
    .from('movements')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId as string);
  console.info(`Demo lista: negocio ${String(businessId)} con ${count ?? 0} movimientos.`);
}

main().catch((err: unknown) => {
  console.error('Error al sembrar la demo:', err);
  process.exit(1);
});
