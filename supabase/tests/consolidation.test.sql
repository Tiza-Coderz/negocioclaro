-- ARCHIVO GENERADO por scripts/gen-sql-tests.mjs — no editar a mano.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into public.businesses (id, name) values ('00000000-0000-0000-0000-00000000a001', 'Negocio de prueba');
insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('00000000-0000-0000-0000-00000000a001', '2026-05-01', 'USD', 360);
insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('00000000-0000-0000-0000-00000000a001', '2026-05-15', 'USD', 365.5);
insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('00000000-0000-0000-0000-00000000a001', '2026-06-01', 'USD', 370);
insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('00000000-0000-0000-0000-00000000a001', '2026-05-01', 'EUR', 395.25);
insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values ('00000000-0000-0000-0000-00000000a001', '2026-05-10', 'MLC', 250);

select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-01', 100.00, 'USD')).amount_usd, 100.00::numeric, 'USD con tasa del mismo día · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-01', 100.00, 'USD')).amount_cup, 36000.00::numeric, 'USD con tasa del mismo día · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-20', 1000.00, 'CUP')).amount_usd, 2.74::numeric, 'CUP usa la última tasa USD anterior (05-15) y redondea · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-20', 1000.00, 'CUP')).amount_cup, 1000.00::numeric, 'CUP usa la última tasa USD anterior (05-15) y redondea · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-20', 50.00, 'EUR')).amount_usd, 54.07::numeric, 'EUR se convierte vía CUP a USD con un único redondeo · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-20', 50.00, 'EUR')).amount_cup, 19762.50::numeric, 'EUR se convierte vía CUP a USD con un único redondeo · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-05', 10.00, 'MLC')).amount_usd, null::numeric, 'MLC sin tasa previa queda marcado como sin tasa · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-05', 10.00, 'MLC')).amount_cup, null::numeric, 'MLC sin tasa previa queda marcado como sin tasa · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-04-30', 5.00, 'CUP')).amount_usd, null::numeric, 'CUP antes de cualquier tasa USD queda sin tasa · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-04-30', 5.00, 'CUP')).amount_cup, null::numeric, 'CUP antes de cualquier tasa USD queda sin tasa · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-02', 1.80, 'CUP')).amount_usd, 0.01::numeric, 'Medio centavo exacto redondea hacia arriba (0.5 → 1) · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-05-02', 1.80, 'CUP')).amount_cup, 1.80::numeric, 'Medio centavo exacto redondea hacia arriba (0.5 → 1) · CUP');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-06-30', 123.45, 'MLC')).amount_usd, 83.41::numeric, 'MLC con tasa propia y USD de otra fecha · USD');
select is((public.consolidate('00000000-0000-0000-0000-00000000a001', '2026-06-30', 123.45, 'MLC')).amount_cup, 30862.50::numeric, 'MLC con tasa propia y USD de otra fecha · CUP');

insert into public.movements (id, business_id, kind, date, amount, currency)
  values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001', 'gasto', '2026-05-20', 1000.00, 'CUP');
select is((select amount_usd from public.movements where id = '00000000-0000-0000-0000-00000000b001'), 2.74::numeric, 'trigger consolida al insertar');
update public.exchange_rates set cup_per_unit = 400 where business_id = '00000000-0000-0000-0000-00000000a001' and currency = 'USD' and date = '2026-05-15';
select is((select amount_usd from public.movements where id = '00000000-0000-0000-0000-00000000b001'), 2.50::numeric, 'editar la tasa reconsolida el movimiento');

select * from finish();
rollback;
