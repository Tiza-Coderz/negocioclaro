-- NegocioClaro · Pagos de cuentas por cobrar/pagar
-- Un pago es un movimiento con debt_id. paid_amount se mantiene solo:
-- suma de los movimientos de esa cuenta en su misma moneda (tope: el importe).

create function public.recalc_debt_paid(p_debt uuid) returns void
language sql set search_path = '' as $$
  update public.debts d
     set paid_amount = least(d.amount, coalesce((
       select sum(m.amount) from public.movements m
        where m.debt_id = d.id and m.currency = d.currency
     ), 0))
   where d.id = p_debt;
$$;

create function public.movements_debt_paid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.debt_id is not null then
    perform public.recalc_debt_paid(old.debt_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.debt_id is not null then
    perform public.recalc_debt_paid(new.debt_id);
  end if;
  return null;
end $$;

create trigger movements_debt_paid
  after insert or update of debt_id, amount, currency or delete on public.movements
  for each row execute function public.movements_debt_paid();

-- Un pago no puede superar lo pendiente ni ir en otra moneda.
create function public.movements_check_debt_payment() returns trigger
language plpgsql set search_path = '' as $$
declare
  d public.debts;
  already numeric;
begin
  if new.debt_id is null then
    return new;
  end if;
  select * into d from public.debts where id = new.debt_id;
  if d.currency <> new.currency then
    raise exception 'El pago debe hacerse en la moneda de la cuenta (%).', d.currency using errcode = '23514';
  end if;
  if (d.direction = 'por_cobrar' and new.kind <> 'ingreso') or (d.direction = 'por_pagar' and new.kind <> 'gasto') then
    raise exception 'Tipo de movimiento incompatible con la cuenta.' using errcode = '23514';
  end if;
  select coalesce(sum(amount), 0) into already from public.movements
   where debt_id = new.debt_id and id <> new.id;
  if already + new.amount > d.amount then
    raise exception 'El pago supera lo pendiente de la cuenta.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger movements_check_debt_payment
  before insert or update of debt_id, amount, currency, kind on public.movements
  for each row execute function public.movements_check_debt_payment();

-- La demo ya cargó paid_amount a mano; lo recalculamos para que cuadre con los movimientos.
select public.recalc_debt_paid(id) from public.debts;
