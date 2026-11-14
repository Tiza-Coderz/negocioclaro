-- NegocioClaro · Nómina mensual
-- Operaciones atómicas como RPC (security invoker: se aplican las políticas RLS).

-- Prepara la nómina del período con el salario base de los trabajadores activos.
create function public.prepare_payroll(p_business uuid, p_period text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_run uuid;
begin
  insert into public.payroll_runs (business_id, period)
  values (p_business, p_period)
  on conflict (business_id, period) do update set period = excluded.period
  returning id into v_run;

  insert into public.payroll_items (run_id, worker_id, base, currency)
  select v_run, w.id, w.base_salary, w.salary_currency
    from public.workers w
   where w.business_id = p_business and w.active
  on conflict (run_id, worker_id) do nothing;

  return v_run;
end $$;

-- Marca la nómina como pagada y crea un gasto por cada moneda.
create function public.pay_payroll(p_run uuid, p_paid_on date) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.payroll_runs;
  v_category uuid;
begin
  select * into r from public.payroll_runs where id = p_run for update;
  if r.id is null then
    raise exception 'Nómina no encontrada' using errcode = 'P0002';
  end if;
  if r.status = 'pagada' then
    raise exception 'Esta nómina ya está pagada.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.payroll_items where run_id = p_run) then
    raise exception 'La nómina no tiene trabajadores.' using errcode = 'P0001';
  end if;

  select id into v_category from public.categories
   where business_id = r.business_id and kind = 'gasto' and name ilike 'n_mina%' limit 1;

  insert into public.movements (business_id, kind, date, amount, currency, method, category_id, payroll_run_id, note, source)
  select r.business_id, 'gasto', p_paid_on, sum(i.net), i.currency, 'efectivo', v_category, p_run,
         'Nómina de ' || r.period, 'nomina'
    from public.payroll_items i
   where i.run_id = p_run
   group by i.currency
  having sum(i.net) > 0;

  update public.payroll_runs set status = 'pagada', paid_on = p_paid_on where id = p_run;
end $$;

-- Deshace el pago (borra los gastos generados) para poder corregir.
create function public.reopen_payroll(p_run uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.movements where payroll_run_id = p_run and source = 'nomina';
  update public.payroll_runs set status = 'borrador', paid_on = null where id = p_run;
end $$;

grant execute on function public.prepare_payroll(uuid, text) to authenticated;
grant execute on function public.pay_payroll(uuid, date) to authenticated;
grant execute on function public.reopen_payroll(uuid) to authenticated;
