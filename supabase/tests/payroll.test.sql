-- Nómina: preparar, pagar (un gasto por moneda), no pagar dos veces y reabrir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.businesses (id, name) values ('00000000-0000-0000-0000-00000000f001', 'Negocio de prueba');
insert into public.categories (business_id, name, kind) values ('00000000-0000-0000-0000-00000000f001', 'Nómina', 'gasto');
insert into public.workers (business_id, full_name, position, base_salary, salary_currency) values
  ('00000000-0000-0000-0000-00000000f001', 'Trabajador Uno', 'Almacenero', 9000, 'CUP'),
  ('00000000-0000-0000-0000-00000000f001', 'Trabajador Dos', 'Chofer', 8000, 'CUP'),
  ('00000000-0000-0000-0000-00000000f001', 'Trabajadora Tres', 'Vendedora', 120, 'USD');

create temporary table t_run as
  select public.prepare_payroll('00000000-0000-0000-0000-00000000f001', '2026-10') as id;

select is((select count(*) from public.payroll_items where run_id = (select id from t_run)), 3::bigint,
          'prepara una línea por trabajador activo');

update public.payroll_items set bonus = 1000, deductions = 500
 where run_id = (select id from t_run) and base = 9000;

select lives_ok($$select public.pay_payroll((select id from t_run), '2026-10-31')$$, 'paga la nómina');

select results_eq(
  $$select currency::text, amount from public.movements
     where payroll_run_id = (select id from t_run) order by currency$$,
  $$values ('CUP', 17500.00::numeric), ('USD', 120.00::numeric)$$,
  'crea un gasto por moneda con el neto (base + bono − descuentos)');

select throws_ok($$select public.pay_payroll((select id from t_run), '2026-10-31')$$,
                 'P0001', 'Esta nómina ya está pagada.', 'no se puede pagar dos veces');

select lives_ok($$select public.reopen_payroll((select id from t_run))$$, 'reabre la nómina');
select is((select count(*) from public.movements where payroll_run_id = (select id from t_run)), 0::bigint,
          'reabrir elimina los gastos generados');

select * from finish();
rollback;
