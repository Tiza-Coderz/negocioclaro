-- NegocioClaro · Seguridad a nivel de fila (RLS)
-- Regla: un usuario solo ve y modifica datos de los negocios de los que es miembro.
-- El rol "contador" puede leer todo pero solo escribir movimientos y tasas.

create function public.is_member(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business and m.user_id = auth.uid()
  );
$$;

create function public.is_owner(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business and m.user_id = auth.uid() and m.role = 'dueno'
  );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.categories enable row level security;
alter table public.clients enable row level security;
alter table public.suppliers enable row level security;
alter table public.workers enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.debts enable row level security;
alter table public.movements enable row level security;

-- Negocio
create policy "miembros leen su negocio" on public.businesses
  for select to authenticated using (public.is_member(id));
create policy "dueño edita su negocio" on public.businesses
  for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));

create policy "ver mis membresías" on public.business_members
  for select to authenticated using (user_id = auth.uid());

-- Lectura para miembros, escritura para miembros (movimientos y tasas)
create policy "miembros leen" on public.exchange_rates
  for select to authenticated using (public.is_member(business_id));
create policy "miembros escriben" on public.exchange_rates
  for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy "miembros leen" on public.movements
  for select to authenticated using (public.is_member(business_id));
create policy "miembros escriben" on public.movements
  for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));

-- Lectura para miembros, escritura solo para el dueño
create policy "miembros leen" on public.categories
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.categories
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));

create policy "miembros leen" on public.clients
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.clients
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));

create policy "miembros leen" on public.suppliers
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.suppliers
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));

create policy "miembros leen" on public.workers
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.workers
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));

create policy "miembros leen" on public.payroll_runs
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.payroll_runs
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));

create policy "miembros leen" on public.payroll_items
  for select to authenticated using (
    exists (select 1 from public.payroll_runs r where r.id = run_id and public.is_member(r.business_id))
  );
create policy "dueño escribe" on public.payroll_items
  for all to authenticated
  using (exists (select 1 from public.payroll_runs r where r.id = run_id and public.is_owner(r.business_id)))
  with check (exists (select 1 from public.payroll_runs r where r.id = run_id and public.is_owner(r.business_id)));

create policy "miembros leen" on public.debts
  for select to authenticated using (public.is_member(business_id));
create policy "dueño escribe" on public.debts
  for all to authenticated using (public.is_owner(business_id)) with check (public.is_owner(business_id));
