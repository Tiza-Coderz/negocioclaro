-- NegocioClaro · Datos de demostración
-- Negocio: "Distribuidora Del Valle" (Boyeros, La Habana). Distribuidora mayorista
-- de alimentos y bebidas que vende a bodegas, cafeterías y paladares.
--
-- seed_demo() es determinista (setseed): cada "Restablecer demo" deja exactamente
-- los mismos datos, desplazados para que los últimos 6 meses terminen hoy.

create function public.seed_demo(p_business uuid, p_seed double precision default 0.37) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Havana')::date;
  v_start date := (date_trunc('month', (now() at time zone 'America/Havana')::date) - interval '5 months')::date;
  d date;
  dow int;
  i int;
  n int;
  r double precision;
  v_usd numeric;
  v_rate numeric;
  v_growth numeric;
  v_total_days int;
  v_amount numeric;
  v_currency public.currency;
  v_method public.payment_method;
  v_cat uuid;
  v_client uuid;
  v_supplier uuid;
  v_run uuid;
  v_month date;
  v_debt uuid;
  -- catálogos
  c_wholesale uuid; c_retail uuid; c_other_in uuid;
  c_goods uuid; c_payroll uuid; c_transport uuid; c_rent uuid; c_power uuid;
  c_phone uuid; c_tax uuid; c_maint uuid; c_bank uuid;
  v_clients uuid[];
  v_goods_suppliers uuid[];
  s_transport uuid;
  s_packaging uuid;
  v_products text[] := array[
    'Cajas de cerveza Cristal', 'Cajas de cerveza Bucanero', 'Pollo (cajas de 15 kg)',
    'Aceite de soya 1 L', 'Arroz (sacos de 46 kg)', 'Refrescos de lata', 'Picadillo de pollo',
    'Spaguetti y puré de tomate', 'Jabón y detergente', 'Leche en polvo', 'Café molido',
    'Salchichas', 'Harina de trigo', 'Azúcar refino', 'Malta Bucanero', 'Ron Havana Club 3 años'
  ];
  v_months_es text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
    'septiembre','octubre','noviembre','diciembre'];
  w record;
begin
  perform setseed(p_seed);

  -- Limpieza (el orden respeta las claves foráneas)
  delete from public.movements where business_id = p_business;
  delete from public.payroll_items where run_id in (select id from public.payroll_runs where business_id = p_business);
  delete from public.payroll_runs where business_id = p_business;
  delete from public.debts where business_id = p_business;
  delete from public.workers where business_id = p_business;
  delete from public.clients where business_id = p_business;
  delete from public.suppliers where business_id = p_business;
  delete from public.categories where business_id = p_business;
  delete from public.exchange_rates where business_id = p_business;

  update public.businesses
     set name = 'Distribuidora Del Valle', municipality = 'Boyeros', province = 'La Habana',
         phone_whatsapp = '5352345678', alert_days_before = 3
   where id = p_business;

  -- ------------------------------------------------------------ Categorías
  insert into public.categories (business_id, name, kind, color, icon, sort_order) values
    (p_business, 'Ventas mayoristas', 'ingreso', '#2a78d6', '📦', 1),
    (p_business, 'Ventas minoristas', 'ingreso', '#eb6834', '🛒', 2),
    (p_business, 'Otros ingresos', 'ingreso', '#1baf7a', '➕', 3),
    (p_business, 'Compra de mercancía', 'gasto', '#2a78d6', '🚚', 1),
    (p_business, 'Nómina', 'gasto', '#eb6834', '👷', 2),
    (p_business, 'Transporte y combustible', 'gasto', '#1baf7a', '⛽', 3),
    (p_business, 'Alquiler del almacén', 'gasto', '#eda100', '🏠', 4),
    (p_business, 'Electricidad y agua', 'gasto', '#e87ba4', '💡', 5),
    (p_business, 'Comunicaciones', 'gasto', '#008300', '📱', 6),
    (p_business, 'Impuestos (ONAT)', 'gasto', '#6250d6', '🧾', 7),
    (p_business, 'Mantenimiento', 'gasto', '#e34948', '🔧', 8),
    (p_business, 'Gastos bancarios', 'gasto', '#8a8984', '🏦', 9);

  select id into c_wholesale from public.categories where business_id = p_business and name = 'Ventas mayoristas';
  select id into c_retail from public.categories where business_id = p_business and name = 'Ventas minoristas';
  select id into c_other_in from public.categories where business_id = p_business and name = 'Otros ingresos';
  select id into c_goods from public.categories where business_id = p_business and name = 'Compra de mercancía';
  select id into c_payroll from public.categories where business_id = p_business and name = 'Nómina';
  select id into c_transport from public.categories where business_id = p_business and name = 'Transporte y combustible';
  select id into c_rent from public.categories where business_id = p_business and name = 'Alquiler del almacén';
  select id into c_power from public.categories where business_id = p_business and name = 'Electricidad y agua';
  select id into c_phone from public.categories where business_id = p_business and name = 'Comunicaciones';
  select id into c_tax from public.categories where business_id = p_business and name = 'Impuestos (ONAT)';
  select id into c_maint from public.categories where business_id = p_business and name = 'Mantenimiento';
  select id into c_bank from public.categories where business_id = p_business and name = 'Gastos bancarios';

  -- ------------------------------------------------------------ Clientes
  -- El orden importa: los primeros compran más (top clientes del dashboard).
  insert into public.clients (business_id, name, contact_name, phone, municipality, notes) values
    (p_business, 'Paladar La Habanera', 'Rolando Díaz', '52134567', 'Habana Vieja', 'Pedido fijo los lunes'),
    (p_business, 'Cafetería El Rápido', 'Yudith Morales', '53287654', 'Plaza de la Revolución', null),
    (p_business, 'Restaurante El Cerro', 'Ernesto Valdés', '54321098', 'Cerro', 'Paga por Zelle'),
    (p_business, 'Mini-súper Los Pinos', 'Marlene Ortiz', '55432109', 'Arroyo Naranjo', null),
    (p_business, 'Cafetería Doña Rosa', 'Rosa Hernández', '56543210', 'Centro Habana', null),
    (p_business, 'Bodega La Esquinita', 'Raúl Guerra', '58765432', 'Playa', 'Cliente desde 2023'),
    (p_business, 'Mipyme Sabor Criollo', 'Lázaro Ferrer', '59876543', 'Vedado', null),
    (p_business, 'Tienda Mi Barrio', 'Idalmis Cabrera', '51098765', 'Boyeros', 'Recoge en el almacén'),
    (p_business, 'Paladar San Cristóbal', 'Pedro Almeida', '52109876', 'Centro Habana', null),
    (p_business, 'Dulcería La Gloria', 'Mabel Quintana', '53210987', 'Diez de Octubre', 'Paga en euros por TropiPay');

  -- created_at empata (misma transacción), así que fijamos el orden por nombre.
  select array_agg(c.id order by array_position(array[
    'Paladar La Habanera','Cafetería El Rápido','Restaurante El Cerro','Mini-súper Los Pinos',
    'Cafetería Doña Rosa','Bodega La Esquinita','Mipyme Sabor Criollo','Tienda Mi Barrio',
    'Paladar San Cristóbal','Dulcería La Gloria'], c.name))
    into v_clients from public.clients c where c.business_id = p_business;

  -- ------------------------------------------------------------ Proveedores
  insert into public.suppliers (business_id, name, contact_name, phone, municipality, products) values
    (p_business, 'Importadora Isla Bella', 'Javier Rosales', '52223344', 'Habana del Este', 'Pollo, salchichas, aceite'),
    (p_business, 'Mipyme Granos del Oeste', 'Norberto Pupo', '53334455', 'Marianao', 'Arroz, azúcar, harina'),
    (p_business, 'Comercializadora Ríos', 'Anabel Ríos', '54445566', 'Plaza de la Revolución', 'Cervezas, maltas y refrescos'),
    (p_business, 'Transportes Hermanos Leyva', 'Ariel Leyva', '55556677', 'Boyeros', 'Flete y combustible'),
    (p_business, 'Envases Plásticos El Cotorro', 'Yunior Batista', '56667788', 'Cotorro', 'Envases, nailon, cajas');

  -- Orden fijo: [1] pollo/aceite, [2] granos, [3] bebidas (lo usan las cuentas de abajo).
  select array_agg(id order by array_position(
           array['Importadora Isla Bella', 'Mipyme Granos del Oeste', 'Comercializadora Ríos'], name))
    into v_goods_suppliers from public.suppliers
   where business_id = p_business and name in ('Importadora Isla Bella', 'Mipyme Granos del Oeste', 'Comercializadora Ríos');
  select id into s_transport from public.suppliers where business_id = p_business and name = 'Transportes Hermanos Leyva';
  select id into s_packaging from public.suppliers where business_id = p_business and name = 'Envases Plásticos El Cotorro';

  -- ------------------------------------------------------------ Trabajadores
  insert into public.workers (business_id, full_name, position, phone, base_salary, salary_currency, hired_on) values
    (p_business, 'Yoandry Pérez Castillo', 'Jefe de almacén', '52011223', 9000, 'CUP', '2023-03-01'),
    (p_business, 'Dayana Rodríguez Leyva', 'Contadora', '53022334', 11000, 'CUP', '2023-05-15'),
    (p_business, 'Alexei Fonseca Mora', 'Chofer', '54033445', 8000, 'CUP', '2024-01-10'),
    (p_business, 'Yaimara Suárez Pino', 'Vendedora', '55044556', 120, 'USD', '2024-06-01'),
    (p_business, 'Osmani Garcés Vidal', 'Estibador', '56055667', 6500, 'CUP', '2024-09-02'),
    (p_business, 'Lisandra Hechavarría Toledo', 'Cajera', '58066778', 7000, 'CUP', '2025-02-17');

  -- ------------------------------------------------------------ Tasas de cambio
  -- USD diaria (sin domingos, para ejercitar la regla de "última tasa anterior").
  -- EUR y MLC semanales (lunes). Curva informal ascendente con ruido.
  v_total_days := v_today - v_start;
  d := v_start;
  while d <= v_today loop
    dow := extract(isodow from d);
    v_usd := round((360 + 85 * ((d - v_start)::numeric / greatest(v_total_days, 1))
                    + 4 * sin((d - v_start) / 9.0) + (random() * 4 - 2))::numeric, 0);
    if dow <> 7 or d = v_start then
      insert into public.exchange_rates (business_id, date, currency, cup_per_unit, note)
      values (p_business, d, 'USD', v_usd, null);
    end if;
    if dow = 1 or d = v_start then
      insert into public.exchange_rates (business_id, date, currency, cup_per_unit) values
        (p_business, d, 'EUR', round(v_usd * 1.07, 0)),
        (p_business, d, 'MLC', round(v_usd * 0.64, 0));
    end if;
    d := d + 1;
  end loop;

  -- ------------------------------------------------------------ Movimientos diarios
  d := v_start;
  while d <= v_today loop
    dow := extract(isodow from d);
    -- Los precios en CUP se indexan a la tasa del día (como hacen las mipymes) y
    -- el negocio crece ~5 % al mes, con septiembre-octubre algo flojos (apagones).
    select cup_per_unit into v_rate from public.exchange_rates
     where business_id = p_business and currency = 'USD' and date <= d order by date desc limit 1;
    v_growth := 1 + 0.05 * ((d - v_start) / 30.0)
                - case when extract(month from d) in (9, 10) then 0.07 else 0 end;

    -- Ventas: 2–4 de lunes a sábado, 0–1 el domingo
    n := case when dow = 7 then floor(random() * 2)::int else 2 + floor(random() * 3)::int end;
    for i in 1..n loop
      r := random();
      -- Clientes con peso: los primeros de la lista compran más
      v_client := v_clients[1 + floor(power(random(), 1.7) * array_length(v_clients, 1))::int];
      if r < 0.62 then
        v_currency := 'CUP';
        v_amount := round(((95 + random() * 380) * v_rate * v_growth)::numeric / 100) * 100;
        r := random();
        v_method := case when r < 0.5 then 'efectivo' when r < 0.8 then 'transfermovil' else 'transferencia' end;
        v_cat := case when v_amount > 250 * v_rate then c_wholesale else c_retail end;
      elsif r < 0.86 then
        v_currency := 'USD';
        v_amount := round(((90 + random() * 520) * v_growth)::numeric / 5) * 5;
        v_method := case when random() < 0.6 then 'zelle' else 'efectivo' end;
        v_cat := case when v_amount > 300 then c_wholesale else c_retail end;
      elsif r < 0.94 then
        v_currency := 'EUR';
        v_amount := round((60 + random() * 380)::numeric / 5) * 5;
        v_method := 'tropipay';
        v_cat := c_wholesale;
        v_client := v_clients[10];
      else
        v_currency := 'MLC';
        v_amount := round((120 + random() * 500)::numeric / 5) * 5;
        v_method := 'transferencia';
        v_cat := c_retail;
      end if;
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, client_id, note, source)
      values (p_business, 'ingreso', d, v_amount, v_currency, v_method, v_cat, v_client,
              v_products[1 + floor(random() * array_length(v_products, 1))::int],
              case when random() < 0.25 then 'rapido' else 'completo' end::public.movement_source);
    end loop;

    -- Compra de mercancía: martes y viernes, en USD
    if dow in (2, 5) then
      v_supplier := v_goods_suppliers[1 + floor(random() * array_length(v_goods_suppliers, 1))::int];
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, supplier_id, note)
      values (p_business, 'gasto', d, round(((1200 + random() * 1100) * (1 + 0.02 * ((d - v_start) / 30.0)))::numeric / 10) * 10, 'USD',
              case when random() < 0.55 then 'efectivo' else 'zelle' end::public.payment_method,
              c_goods, v_supplier, v_products[1 + floor(random() * array_length(v_products, 1))::int]);
    end if;

    -- Compra local en CUP (envases, mercancía menuda): miércoles
    if dow = 3 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, supplier_id, note)
      values (p_business, 'gasto', d, round((15000 + random() * 30000)::numeric / 100) * 100, 'CUP',
              'transferencia', c_goods, s_packaging, 'Envases y nailon');
    end if;

    -- Combustible y flete: lunes
    if dow = 1 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, supplier_id, note)
      values (p_business, 'gasto', d, round((9000 + random() * 8000)::numeric / 100) * 100, 'CUP',
              'efectivo', c_transport, s_transport, 'Combustible del camión y flete');
    end if;

    -- Gastos fijos mensuales
    if extract(day from d) = 1 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, 350, 'USD', 'efectivo', c_rent, 'Alquiler del almacén de Boyeros');
    end if;
    if extract(day from d) = 10 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, round((7000 + random() * 4500)::numeric / 10) * 10, 'CUP',
              'transfermovil', c_power, 'Factura eléctrica y agua');
    end if;
    if extract(day from d) = 12 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, round((1200 + random() * 700)::numeric / 10) * 10, 'CUP',
              'transfermovil', c_phone, 'Recargas y datos móviles');
    end if;
    if extract(day from d) = 20 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, round((38000 + random() * 22000)::numeric / 100) * 100, 'CUP',
              'transferencia', c_tax, 'Impuesto sobre ventas y servicios');
    end if;
    if extract(day from d) = 28 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, 350, 'CUP', 'transferencia', c_bank, 'Comisión de la cuenta fiscal');
    end if;

    -- Imprevistos
    if random() < 0.05 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'gasto', d, round((3000 + random() * 14000)::numeric / 100) * 100, 'CUP', 'efectivo',
              c_maint, (array['Reparación del montacargas', 'Ponchera del camión', 'Pintura del almacén',
                              'Cerradura nueva', 'Mantenimiento de la nevera'])[1 + floor(random() * 5)::int]);
    end if;
    if random() < 0.03 then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, note)
      values (p_business, 'ingreso', d, round((8000 + random() * 12000)::numeric / 100) * 100, 'CUP', 'efectivo',
              c_other_in, 'Venta de cajas y envases vacíos');
    end if;

    d := d + 1;
  end loop;

  -- ------------------------------------------------------------ Nómina
  v_month := v_start;
  while v_month <= v_today loop
    insert into public.payroll_runs (business_id, period, status, paid_on)
    values (
      p_business, to_char(v_month, 'YYYY-MM'),
      case when (v_month + interval '1 month' - interval '1 day')::date <= v_today then 'pagada' else 'borrador' end::public.payroll_status,
      case when (v_month + interval '1 month' - interval '1 day')::date <= v_today
           then (v_month + interval '1 month' - interval '1 day')::date end
    ) returning id into v_run;

    for w in select * from public.workers where business_id = p_business and active order by full_name loop
      insert into public.payroll_items (run_id, worker_id, base, bonus, deductions, currency)
      values (v_run, w.id, w.base_salary,
              case when random() < 0.25
                   then case when w.salary_currency = 'USD' then 20 else round((500 + random() * 1500)::numeric / 100) * 100 end
                   else 0 end,
              0, w.salary_currency);
    end loop;

    -- Un movimiento por moneda al pagar la nómina
    if (v_month + interval '1 month' - interval '1 day')::date <= v_today then
      insert into public.movements (business_id, kind, date, amount, currency, method, category_id, payroll_run_id, note, source)
      select p_business, 'gasto', (v_month + interval '1 month' - interval '1 day')::date, sum(pi.net), pi.currency,
             'efectivo', c_payroll, v_run,
             'Nómina de ' || v_months_es[extract(month from v_month)::int] || ' ' || extract(year from v_month),
             'nomina'
        from public.payroll_items pi where pi.run_id = v_run
       group by pi.currency;
    end if;

    v_month := (v_month + interval '1 month')::date;
  end loop;

  -- ------------------------------------------------------------ Cuentas por cobrar y por pagar
  -- Por cobrar
  insert into public.debts (business_id, direction, client_id, concept, amount, currency, issued_on, due_on, paid_amount) values
    (p_business, 'por_cobrar', v_clients[1], 'Factura 0142 · cerveza y refrescos', 85000, 'CUP', v_today - 40, v_today - 10, 30000),
    (p_business, 'por_cobrar', v_clients[3], 'Factura 0151 · pollo y aceite', 650, 'USD', v_today - 20, v_today - 2, 0),
    (p_business, 'por_cobrar', v_clients[5], 'Factura 0157 · pedido quincenal', 120000, 'CUP', v_today - 12, v_today + 2, 0),
    (p_business, 'por_cobrar', v_clients[4], 'Factura 0160 · arroz y granos', 900, 'USD', v_today - 6, v_today + 12, 0),
    (p_business, 'por_cobrar', v_clients[6], 'Factura 0131 · aseo y detergente', 45000, 'CUP', v_today - 60, v_today - 30, 45000),
    (p_business, 'por_cobrar', v_clients[10], 'Factura 0162 · harina, azúcar y leche', 300, 'EUR', v_today - 3, v_today + 5, 0);
  -- Por pagar
  insert into public.debts (business_id, direction, supplier_id, concept, amount, currency, issued_on, due_on, paid_amount) values
    (p_business, 'por_pagar', v_goods_suppliers[1], 'Contenedor de pollo congelado', 4800, 'USD', v_today - 25, v_today + 3, 2000),
    (p_business, 'por_pagar', v_goods_suppliers[2], 'Arroz · 40 sacos', 180000, 'CUP', v_today - 30, v_today - 5, 0),
    (p_business, 'por_pagar', s_packaging, 'Envases para el trimestre', 25000, 'CUP', v_today - 2, v_today + 20, 0),
    (p_business, 'por_pagar', v_goods_suppliers[3], 'Lote de cerveza y malta', 1200, 'USD', v_today - 45, v_today - 15, 1200);

  -- Pagos parciales/totales ya registrados como movimientos
  for v_debt, v_amount, v_currency, v_client, v_supplier, d in
    select id, paid_amount, currency, client_id, supplier_id, issued_on + 7
      from public.debts where business_id = p_business and paid_amount > 0
  loop
    insert into public.movements (business_id, kind, date, amount, currency, method, category_id, client_id, supplier_id, debt_id, note, source)
    values (p_business,
            case when v_client is not null then 'ingreso' else 'gasto' end::public.movement_kind,
            least(d, v_today), v_amount, v_currency, 'transferencia',
            case when v_client is not null then c_wholesale else c_goods end,
            v_client, v_supplier, v_debt, 'Pago de factura', 'cuenta');
  end loop;
end $$;

revoke all on function public.seed_demo(uuid, double precision) from public, anon, authenticated;

-- Crea (o reutiliza) el negocio demo para un usuario y lo siembra.
-- Solo para el script de seed (service_role).
create function public.ensure_demo_business(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
begin
  select id into v_business from public.businesses where is_demo order by created_at limit 1;
  if v_business is null then
    insert into public.businesses (name, municipality, is_demo)
    values ('Distribuidora Del Valle', 'Boyeros', true)
    returning id into v_business;
  end if;
  insert into public.business_members (business_id, user_id, role)
  values (v_business, p_user, 'dueno')
  on conflict do nothing;
  perform public.seed_demo(v_business);
  update public.businesses set last_reset_at = now() where id = v_business;
  return v_business;
end $$;

revoke all on function public.ensure_demo_business(uuid) from public, anon, authenticated;
grant execute on function public.ensure_demo_business(uuid) to service_role;

-- "Restablecer demo": público (botón en el login), limitado a 1 vez por minuto
-- y SOLO sobre el negocio marcado como demo. No puede tocar datos de clientes reales.
create function public.reset_demo() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
  v_last timestamptz;
begin
  select id, last_reset_at into v_business, v_last
    from public.businesses where is_demo order by created_at limit 1
    for update;
  if v_business is null then
    raise exception 'No hay un negocio demo configurado' using errcode = 'P0002';
  end if;
  if v_last is not null and v_last > now() - interval '1 minute' then
    raise exception 'La demo se restableció hace menos de un minuto. Espere un momento.' using errcode = 'P0001';
  end if;
  perform public.seed_demo(v_business);
  update public.businesses set last_reset_at = now() where id = v_business;
end $$;

revoke all on function public.reset_demo() from public;
grant execute on function public.reset_demo() to anon, authenticated;
