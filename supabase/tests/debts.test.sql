-- Reglas de pagos de cuentas por cobrar/pagar (triggers de 20261114000600).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.businesses (id, name) values ('00000000-0000-0000-0000-00000000c001', 'Negocio de prueba');
insert into public.clients (id, business_id, name)
  values ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000c001', 'Cafetería de prueba');
insert into public.debts (id, business_id, direction, client_id, concept, amount, currency, issued_on, due_on)
  values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', 'por_cobrar',
          '00000000-0000-0000-0000-00000000c002', 'Factura de prueba', 1000, 'CUP', '2026-11-01', '2026-11-15');

-- Pago parcial
insert into public.movements (id, business_id, kind, date, amount, currency, debt_id)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c001', 'ingreso',
          '2026-11-05', 400, 'CUP', '00000000-0000-0000-0000-00000000d001');
select is((select paid_amount from public.debts where id = '00000000-0000-0000-0000-00000000d001'),
          400.00::numeric, 'un pago parcial actualiza lo pagado');

select throws_ok(
  $$insert into public.movements (business_id, kind, date, amount, currency, debt_id)
    values ('00000000-0000-0000-0000-00000000c001', 'ingreso', '2026-11-06', 601, 'CUP', '00000000-0000-0000-0000-00000000d001')$$,
  '23514', 'El pago supera lo pendiente de la cuenta.', 'no se puede cobrar más de lo pendiente');

select throws_ok(
  $$insert into public.movements (business_id, kind, date, amount, currency, debt_id)
    values ('00000000-0000-0000-0000-00000000c001', 'ingreso', '2026-11-06', 10, 'USD', '00000000-0000-0000-0000-00000000d001')$$,
  '23514', null, 'el pago debe ir en la moneda de la cuenta');

select throws_ok(
  $$insert into public.movements (business_id, kind, date, amount, currency, debt_id)
    values ('00000000-0000-0000-0000-00000000c001', 'gasto', '2026-11-06', 10, 'CUP', '00000000-0000-0000-0000-00000000d001')$$,
  '23514', 'Tipo de movimiento incompatible con la cuenta.', 'cobrar una cuenta por cobrar es un ingreso, no un gasto');

-- Completar el pago
insert into public.movements (business_id, kind, date, amount, currency, debt_id)
  values ('00000000-0000-0000-0000-00000000c001', 'ingreso', '2026-11-07', 600, 'CUP', '00000000-0000-0000-0000-00000000d001');
select is((select paid_amount from public.debts where id = '00000000-0000-0000-0000-00000000d001'),
          1000.00::numeric, 'dos pagos completan la cuenta');

-- Borrar un pago devuelve el saldo
delete from public.movements where id = '00000000-0000-0000-0000-00000000e001';
select is((select paid_amount from public.debts where id = '00000000-0000-0000-0000-00000000d001'),
          600.00::numeric, 'borrar un pago recalcula lo pagado');

select * from finish();
rollback;
