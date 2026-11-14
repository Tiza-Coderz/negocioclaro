-- NegocioClaro · Consolidación multi-moneda en la BD
-- Réplica de src/domain/consolidation.ts. Los mismos casos se prueban en
-- supabase/tests/consolidation.test.sql (generado desde el fixture JSON).
--
-- Regla de la "tasa del día": tasa de esa fecha o, si no hay, la última anterior.
-- Sin tasa anterior → missing_rate = true y montos consolidados en null.

-- Tasa vigente (CUP por unidad). CUP vale 1 y no tiene fecha.
create function public.rate_on(p_business uuid, p_currency public.currency, p_date date)
returns table (rate_date date, cup_per_unit numeric)
language sql stable set search_path = '' as $$
  select null::date, 1::numeric where p_currency = 'CUP'
  union all
  (select r.date, r.cup_per_unit
     from public.exchange_rates r
    where p_currency <> 'CUP'
      and r.business_id = p_business
      and r.currency = p_currency
      and r.date <= p_date
    order by r.date desc
    limit 1);
$$;

create type public.consolidation as (
  rate_date date,
  rate_cup_usd numeric(14, 4),
  amount_usd numeric(14, 2),
  amount_cup numeric(16, 2),
  missing_rate boolean
);

create function public.consolidate(
  p_business uuid, p_date date, p_amount numeric, p_currency public.currency
) returns public.consolidation
language plpgsql stable set search_path = '' as $$
declare
  usd record;
  own record;
  result public.consolidation;
begin
  select * into usd from public.rate_on(p_business, 'USD', p_date);
  select * into own from public.rate_on(p_business, p_currency, p_date);

  if usd.cup_per_unit is null or own.cup_per_unit is null then
    result := (null, null, null, null, true);
    return result;
  end if;

  -- round() sobre numeric redondea mitad hacia afuera del cero, igual que el dominio TS.
  result.rate_date := usd.rate_date;
  result.rate_cup_usd := usd.cup_per_unit;
  result.amount_cup := round(p_amount * own.cup_per_unit, 2);
  result.amount_usd := case
    when p_currency = 'USD' then p_amount
    else round(p_amount * own.cup_per_unit / usd.cup_per_unit, 2)
  end;
  result.missing_rate := false;
  return result;
end $$;

-- Al crear/editar un movimiento se recalcula su foto consolidada.
-- Cualquier valor que mande el cliente en estas columnas se ignora.
create function public.movements_consolidate() returns trigger
language plpgsql set search_path = '' as $$
declare
  c public.consolidation;
begin
  c := public.consolidate(new.business_id, new.date, new.amount, new.currency);
  new.rate_date := c.rate_date;
  new.rate_cup_usd := c.rate_cup_usd;
  new.amount_usd := c.amount_usd;
  new.amount_cup := c.amount_cup;
  new.missing_rate := c.missing_rate;
  return new;
end $$;

create trigger movements_consolidate
  before insert or update of date, amount, currency, business_id,
    rate_date, rate_cup_usd, amount_usd, amount_cup, missing_rate
  on public.movements
  for each row execute function public.movements_consolidate();

-- Recalcula los movimientos afectados por una tasa desde `p_from`.
-- Si cambió la tasa USD se afectan todas las monedas; si no, solo esa moneda.
create function public.reconsolidate_movements(
  p_business uuid, p_currency public.currency, p_from date
) returns int
language plpgsql set search_path = '' as $$
declare
  affected int;
begin
  -- Basta con "tocar" la columna: el trigger movements_consolidate recalcula.
  update public.movements m
     set missing_rate = m.missing_rate
   where m.business_id = p_business
     and m.date >= p_from
     and (p_currency = 'USD' or m.currency = p_currency);
  get diagnostics affected = row_count;
  return affected;
end $$;

create function public.exchange_rates_reconsolidate() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.reconsolidate_movements(old.business_id, old.currency, old.date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.reconsolidate_movements(new.business_id, new.currency, new.date);
  end if;
  return null;
end $$;

-- Por sentencia sería más eficiente, pero por fila es simple y suficiente:
-- se editan pocas tasas al día.
create trigger exchange_rates_reconsolidate
  after insert or update or delete on public.exchange_rates
  for each row execute function public.exchange_rates_reconsolidate();
