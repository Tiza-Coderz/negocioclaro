// Genera supabase/tests/consolidation.test.sql a partir del fixture compartido
// src/domain/__fixtures__/consolidation-cases.json, para que la lógica SQL y la
// de TypeScript se prueben con exactamente los mismos casos.
//
// Uso: node scripts/gen-sql-tests.mjs  (también lo ejecuta `npm run db:test`)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(
  readFileSync(resolve(root, 'src/domain/__fixtures__/consolidation-cases.json'), 'utf8'),
);

const q = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const cents = (v) => (v === null ? 'null' : (v / 100).toFixed(2));
const BIZ = '00000000-0000-0000-0000-00000000a001';

const lines = [
  '-- ARCHIVO GENERADO por scripts/gen-sql-tests.mjs — no editar a mano.',
  'begin;',
  'create extension if not exists pgtap with schema extensions;',
  `select plan(${fixture.cases.length * 2 + 2});`,
  '',
  `insert into public.businesses (id, name) values ('${BIZ}', 'Negocio de prueba');`,
  ...fixture.rates.map(
    (r) =>
      `insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('${BIZ}', ${q(r.date)}, ${q(r.currency)}, ${r.cupPerUnit});`,
  ),
  '',
];

for (const c of fixture.cases) {
  const { input: i, expected: e } = c;
  const call = `public.consolidate('${BIZ}', ${q(i.date)}, ${cents(i.amountCents)}, ${q(i.currency)})`;
  lines.push(
    `select is((${call}).amount_usd, ${cents(e.amountUsdCents)}::numeric, ${q(`${c.name} · USD`)});`,
    `select is((${call}).amount_cup, ${cents(e.amountCupCents)}::numeric, ${q(`${c.name} · CUP`)});`,
  );
}

// El trigger aplica la misma función y recalcula al cambiar una tasa.
lines.push(
  '',
  `insert into public.movements (id, business_id, kind, date, amount, currency)`,
  `  values ('00000000-0000-0000-0000-00000000b001', '${BIZ}', 'gasto', '2026-05-20', 1000.00, 'CUP');`,
  `select is((select amount_usd from public.movements where id = '00000000-0000-0000-0000-00000000b001'), 2.74::numeric, 'trigger consolida al insertar');`,
  `update public.exchange_rates set cup_per_unit = 400 where business_id = '${BIZ}' and currency = 'USD' and date = '2026-05-15';`,
  `select is((select amount_usd from public.movements where id = '00000000-0000-0000-0000-00000000b001'), 2.50::numeric, 'editar la tasa reconsolida el movimiento');`,
  '',
  'select * from finish();',
  'rollback;',
  '',
);

const out = resolve(root, 'supabase/tests/consolidation.test.sql');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'));
console.info(`Generado ${out} (${fixture.cases.length} casos)`);
