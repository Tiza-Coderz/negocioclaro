-- NegocioClaro · Esquema base
-- Todas las tablas de negocio llevan business_id para soportar varios clientes (multi-tenant).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Enums
create type public.currency as enum ('USD', 'CUP', 'EUR', 'MLC');
create type public.movement_kind as enum ('ingreso', 'gasto');
create type public.payment_method as enum ('efectivo', 'transferencia', 'zelle', 'tropipay', 'transfermovil');
create type public.debt_direction as enum ('por_cobrar', 'por_pagar');
create type public.member_role as enum ('dueno', 'contador');
create type public.payroll_status as enum ('borrador', 'pagada');
create type public.movement_source as enum ('rapido', 'completo', 'nomina', 'cuenta');

-- ---------------------------------------------------------------- Negocio
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  municipality text,
  province text not null default 'La Habana',
  phone_whatsapp text,
  alert_days_before int not null default 3 check (alert_days_before between 0 and 60),
  is_demo boolean not null default false,
  last_reset_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'dueno',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index on public.business_members (user_id);

-- ---------------------------------------------------------------- Tasas de cambio
-- cup_per_unit: cuántos CUP vale 1 unidad de `currency` ese día. CUP no se guarda (vale 1).
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  date date not null,
  currency public.currency not null check (currency <> 'CUP'),
  cup_per_unit numeric(14, 4) not null check (cup_per_unit > 0),
  note text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (business_id, currency, date)
);

-- ---------------------------------------------------------------- Catálogos
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  kind public.movement_kind not null,
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text,
  sort_order int not null default 0,
  unique (business_id, kind, name)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  contact_name text,
  phone text,
  municipality text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.clients (business_id, name);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  contact_name text,
  phone text,
  municipality text,
  products text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.suppliers (business_id, name);

-- ---------------------------------------------------------------- Trabajadores y nómina
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  position text not null,
  phone text,
  base_salary numeric(14, 2) not null check (base_salary >= 0),
  salary_currency public.currency not null default 'CUP',
  hired_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status public.payroll_status not null default 'borrador',
  paid_on date,
  created_at timestamptz not null default now(),
  unique (business_id, period)
);

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete restrict,
  base numeric(14, 2) not null check (base >= 0),
  bonus numeric(14, 2) not null default 0 check (bonus >= 0),
  deductions numeric(14, 2) not null default 0 check (deductions >= 0),
  currency public.currency not null,
  net numeric(14, 2) generated always as (base + bonus - deductions) stored,
  unique (run_id, worker_id)
);

-- ---------------------------------------------------------------- Cuentas por cobrar / pagar
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  direction public.debt_direction not null,
  client_id uuid references public.clients (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  concept text not null check (char_length(concept) between 2 and 200),
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency not null,
  issued_on date not null default current_date,
  due_on date not null,
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  created_at timestamptz not null default now(),
  check (due_on >= issued_on),
  check (paid_amount <= amount),
  check (
    (direction = 'por_cobrar' and supplier_id is null)
    or (direction = 'por_pagar' and client_id is null)
  )
);
create index on public.debts (business_id, due_on) where paid_amount < amount;

-- ---------------------------------------------------------------- Movimientos
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.movement_kind not null,
  date date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency not null,
  method public.payment_method not null default 'efectivo',
  category_id uuid references public.categories (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  debt_id uuid references public.debts (id) on delete set null,
  payroll_run_id uuid references public.payroll_runs (id) on delete set null,
  note text check (char_length(note) <= 500),
  attachment_path text,
  source public.movement_source not null default 'completo',

  -- Foto consolidada: la calcula el trigger de 0003 (no se escribe desde el cliente).
  rate_date date,
  rate_cup_usd numeric(14, 4),
  amount_usd numeric(14, 2),
  amount_cup numeric(16, 2),
  missing_rate boolean not null default true,

  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.movements (business_id, date desc);
create index on public.movements (business_id, currency, date);
create index on public.movements (business_id, client_id) where client_id is not null;
create index on public.movements (debt_id) where debt_id is not null;

-- updated_at automático
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger movements_touch before update on public.movements
  for each row execute function public.touch_updated_at();
create trigger exchange_rates_touch before update on public.exchange_rates
  for each row execute function public.touch_updated_at();
