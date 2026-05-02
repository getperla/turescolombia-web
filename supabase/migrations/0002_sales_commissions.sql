-- Migration 0002 — tablas para ventas y comisiones del agente.
-- Pega este archivo en el SQL Editor de Supabase y ejecuta.
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y CREATE INDEX IF NOT EXISTS.
--
-- Modelo:
--   sales        — una venta = N tours del itinerario para 1 cliente
--   sale_items   — los tours dentro de una venta (1:N)
--   commissions  — ledger de comisiones del jalador (1:1 con sales)
--
-- Realtime: las tres tablas estan en supabase_realtime publication para que
-- el dashboard del jalador refresque solo cuando entre una venta nueva.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id                  uuid primary key default gen_random_uuid(),
  jalador_ref_code    text not null,
  client_name         text not null,
  client_phone        text not null,
  client_email        text,
  people              integer not null default 1,
  total_cop           integer not null,
  commission_cop      integer not null,
  status              text not null default 'pending'
                       check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  payment_reference   text not null unique,
  payment_provider    text not null default 'wompi',
  payment_url         text,
  is_demo             boolean not null default true,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists sales_jalador_idx on public.sales (jalador_ref_code);
create index if not exists sales_status_idx on public.sales (status);
create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists sales_is_demo_idx on public.sales (is_demo);

-- ---------------------------------------------------------------------------
-- sale_items
-- ---------------------------------------------------------------------------
create table if not exists public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales(id) on delete cascade,
  tour_id     bigint not null,
  tour_name   text not null,
  tour_slug   text not null,
  price_cop   integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);
create index if not exists sale_items_tour_idx on public.sale_items (tour_id);

-- ---------------------------------------------------------------------------
-- commissions
-- ---------------------------------------------------------------------------
create table if not exists public.commissions (
  id                  uuid primary key default gen_random_uuid(),
  jalador_ref_code    text not null,
  sale_id             uuid not null unique references public.sales(id) on delete cascade,
  amount_cop          integer not null,
  status              text not null default 'pending'
                       check (status in ('pending', 'available', 'paid_out')),
  is_demo             boolean not null default true,
  created_at          timestamptz not null default now(),
  paid_out_at         timestamptz
);

create index if not exists commissions_jalador_idx on public.commissions (jalador_ref_code);
create index if not exists commissions_status_idx on public.commissions (status);
create index if not exists commissions_is_demo_idx on public.commissions (is_demo);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Las inserciones/updates las hace el server con SUPABASE_SERVICE_ROLE_KEY
-- (bypass RLS). El cliente solo lee a traves de endpoints autenticados.
-- Por defecto cerramos lectura publica para proteger datos del cliente.
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.commissions enable row level security;

-- Los jaladores autenticados ven SOLO sus propias ventas (filtro por
-- ref_code). Si quieres realtime en el dashboard del jalador, este policy
-- es lo que lo permite.
drop policy if exists "jalador ve sus ventas" on public.sales;
create policy "jalador ve sus ventas"
  on public.sales for select
  using (auth.jwt() ->> 'ref_code' = jalador_ref_code);

drop policy if exists "jalador ve sus items" on public.sale_items;
create policy "jalador ve sus items"
  on public.sale_items for select
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and s.jalador_ref_code = auth.jwt() ->> 'ref_code'
    )
  );

drop policy if exists "jalador ve sus comisiones" on public.commissions;
create policy "jalador ve sus comisiones"
  on public.commissions for select
  using (auth.jwt() ->> 'ref_code' = jalador_ref_code);

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
-- Permite que el dashboard del jalador se suscriba a cambios en sus ventas
-- y comisiones. Las RLS de arriba aseguran que solo recibe lo suyo.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

-- alter publication ... add table no acepta IF NOT EXISTS, asi que envolvemos
-- cada add en un guard para que el SQL sea re-ejecutable sin errores.
do $$
declare
  t text;
begin
  foreach t in array array['sales', 'sale_items', 'commissions']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Verificacion: deberia listar las 3 tablas.
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime'
--   and tablename in ('sales', 'sale_items', 'commissions');
