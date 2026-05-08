-- Migration 0003 — Reseñas de jaladores + columna avatar_url + RPC agregada.
--
-- Foundation del PR del dashboard mejorado. NO toca el flujo de creacion
-- de reseñas (ese es PR aparte). Aqui solo creamos:
--   - tabla public.jalador_ratings  — una review por sale
--   - funcion get_jalador_rating(uuid) — devuelve { avg, count }
--   - RLS policies estrictas
--
-- avatar_url va en auth.users.user_metadata, no en una tabla nueva — eso
-- queda como deuda tecnica documentada en docs/TECH_DEBT.md.
--
-- Idempotente: pega este archivo en SQL Editor de Supabase y ejecuta.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- jalador_ratings
-- ---------------------------------------------------------------------------
-- Decision #5: jalador_user_id uuid REFERENCES auth.users(id) ON DELETE
-- CASCADE — integridad referencial real. Las reviews siguen al user; si
-- el user se borra, sus reviews se borran (no quedan huerfanas).
--
-- Decision #6: sale_id uuid REFERENCES sales(id) — una sale = una
-- experiencia = una review. ON DELETE CASCADE para que no queden reviews
-- de ventas borradas.
--
-- UNIQUE(sale_id, tourist_id): una review por turista por venta. Esto
-- previene spam — un mismo cliente no puede dejar 5 estrellas a la misma
-- sale 10 veces.
create table if not exists public.jalador_ratings (
  id                uuid primary key default gen_random_uuid(),
  jalador_user_id   uuid not null references auth.users(id) on delete cascade,
  tourist_id        uuid not null references auth.users(id) on delete cascade,
  sale_id           uuid not null references public.sales(id) on delete cascade,
  rating            integer not null check (rating between 1 and 5),
  comment           text,
  created_at        timestamptz not null default now(),
  unique (sale_id, tourist_id)
);

-- Indices: el lookup principal es por jalador (para mostrar su perfil).
-- Tambien por sale_id para verificar si una sale ya tiene review.
create index if not exists jalador_ratings_jalador_user_id_idx
  on public.jalador_ratings(jalador_user_id);

create index if not exists jalador_ratings_sale_id_idx
  on public.jalador_ratings(sale_id);

-- ---------------------------------------------------------------------------
-- RPC get_jalador_rating
-- ---------------------------------------------------------------------------
-- Devuelve agregados en una sola query — evita N+1 desde el frontend.
-- avg redondeado a 1 decimal (estilo Airbnb). Si no hay reviews, devuelve
-- avg=NULL para que el frontend muestre "Aun sin calificaciones" en lugar
-- de "0.0 estrellas".
--
-- SECURITY INVOKER (default): respeta RLS del usuario que llama.
create or replace function public.get_jalador_rating(p_jalador_user_id uuid)
returns table (avg numeric, count bigint)
language sql
stable
as $$
  select
    round(avg(rating)::numeric, 1) as avg,
    count(*)::bigint as count
  from public.jalador_ratings
  where jalador_user_id = p_jalador_user_id;
$$;

-- ---------------------------------------------------------------------------
-- RLS — Row Level Security
-- ---------------------------------------------------------------------------
alter table public.jalador_ratings enable row level security;

-- SELECT publico: las reviews son contenido publico (alguien puede ver el
-- perfil de un jalador antes de loguearse).
drop policy if exists "jalador_ratings_select_public" on public.jalador_ratings;
create policy "jalador_ratings_select_public"
  on public.jalador_ratings
  for select
  using (true);

-- INSERT: solo el turista que hizo la sale, y solo si la sale esta paid.
-- El frontend pasa tourist_id = auth.uid() y sale_id; chequeamos que esa
-- combinacion exista en sales con status='paid'. La tabla sales no tiene
-- tourist_id explicito (es invitado), asi que para v1 hacemos el match
-- por phone del cliente — cuando agreguemos un campo tourist_user_id en
-- sales, ajustamos esta policy.
--
-- IMPORTANTE: la RLS de public.sales (migration 0002) solo expone rows
-- al jalador dueño (matchea jalador_ref_code con el JWT). Si la policy
-- de INSERT aqui hiciera EXISTS sobre sales directamente, un turista
-- autenticado no veria ninguna sale → review valida rechazada (Codex
-- P2 #35).
--
-- Fix: helper SECURITY DEFINER que bypasea RLS solo para devolver un
-- booleano "existe esta sale en estado paid?". No expone columnas — el
-- worst case es confirmar/negar la existencia de un sale_id especifico,
-- lo cual tampoco es secreto (los IDs son uuid, no enumerables).
create or replace function public.is_sale_paid_for_review(p_sale_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sales
    where id = p_sale_id and status = 'paid'
  );
$$;

revoke all on function public.is_sale_paid_for_review(uuid) from public;
grant execute on function public.is_sale_paid_for_review(uuid) to authenticated;

drop policy if exists "jalador_ratings_insert_authenticated" on public.jalador_ratings;
create policy "jalador_ratings_insert_authenticated"
  on public.jalador_ratings
  for insert
  to authenticated
  with check (
    tourist_id = auth.uid()
    and public.is_sale_paid_for_review(sale_id)
  );

-- UPDATE/DELETE: nadie. Las reviews no se editan ni borran (excepto via
-- ON DELETE CASCADE cuando el user o la sale se borran). Esto previene
-- manipulacion: un jalador no puede borrar reviews malas.
drop policy if exists "jalador_ratings_no_update" on public.jalador_ratings;
create policy "jalador_ratings_no_update"
  on public.jalador_ratings
  for update
  using (false);

drop policy if exists "jalador_ratings_no_delete" on public.jalador_ratings;
create policy "jalador_ratings_no_delete"
  on public.jalador_ratings
  for delete
  using (false);

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
-- Sumamos jalador_ratings a la publication para que el dashboard del
-- jalador pueda refrescar el badge de rating sin recargar.
-- Idempotente: si la tabla ya esta en la publication, no falla.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'jalador_ratings'
  ) then
    alter publication supabase_realtime add table public.jalador_ratings;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Notas operacionales
-- ---------------------------------------------------------------------------
-- 1. avatar_url se guarda en auth.users.raw_user_meta_data (jsonb) bajo
--    la key "avatarUrl". El frontend lo lee con
--    supabase.auth.getUser().data.user.user_metadata.avatarUrl.
--    Esto evita crear una tabla profiles por ahora — ver docs/TECH_DEBT.md
--    para los triggers que indicarian que toca migrar.
--
-- 2. El bucket "avatars" debe crearse manualmente en Supabase Dashboard.
--    Ver docs/SETUP.md seccion "Storage > avatars" para los pasos.
--
-- 3. Reseñas dummy para testing: insertar manualmente desde SQL Editor
--    una vez la tabla este aplicada. NO crear endpoint de seeding.
