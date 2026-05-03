-- Reset de datos demo — borrar SOLO filas con is_demo = true.
--
-- Cuando estes listo para pasar a produccion real:
--   1. Verifica que LAPERLA_MODE=production esta seteado en Vercel
--   2. Pega este script en SQL Editor de Supabase
--   3. Ejecuta dentro de un BEGIN/COMMIT (lo hacemos abajo)
--   4. Las ventas/comisiones/items reales (is_demo=false) quedan intactos
--
-- Numeracion 9999 a proposito — este script no es parte de la secuencia
-- de migrations 0001, 0002, etc. Es una accion puntual, una sola vez.

begin;

-- 1. Snapshot ANTES — para que veas que vas a borrar
do $$
declare
  s_demo int;
  s_real int;
  i_demo int;
  c_demo int;
  c_real int;
begin
  select count(*) into s_demo from public.sales where is_demo = true;
  select count(*) into s_real from public.sales where is_demo = false;
  select count(*) into i_demo
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where s.is_demo = true;
  select count(*) into c_demo from public.commissions where is_demo = true;
  select count(*) into c_real from public.commissions where is_demo = false;

  raise notice E'\n=== Snapshot ANTES del reset ===';
  raise notice 'sales.is_demo=true:        %', s_demo;
  raise notice 'sales.is_demo=false (real): %', s_real;
  raise notice 'sale_items demo:           %', i_demo;
  raise notice 'commissions.is_demo=true:  %', c_demo;
  raise notice 'commissions.is_demo=false (real): %', c_real;
end $$;

-- 2. Borrar comisiones demo (no tienen FK chica, se borran primero por
-- claridad — aunque sale_id ON DELETE CASCADE las borraria igual)
delete from public.commissions where is_demo = true;

-- 3. Borrar sales demo. Como sale_items tiene ON DELETE CASCADE en sale_id,
-- los items demo se borran automaticamente cuando se borra la sale.
delete from public.sales where is_demo = true;

-- 4. Snapshot DESPUES — confirma que solo queda lo real
do $$
declare
  s_demo int;
  s_real int;
  i_demo int;
  c_demo int;
  c_real int;
begin
  select count(*) into s_demo from public.sales where is_demo = true;
  select count(*) into s_real from public.sales where is_demo = false;
  select count(*) into i_demo
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where s.is_demo = true;
  select count(*) into c_demo from public.commissions where is_demo = true;
  select count(*) into c_real from public.commissions where is_demo = false;

  raise notice E'\n=== Snapshot DESPUES del reset ===';
  raise notice 'sales.is_demo=true (deberia ser 0):       %', s_demo;
  raise notice 'sales.is_demo=false (intacto):            %', s_real;
  raise notice 'sale_items demo (deberia ser 0):          %', i_demo;
  raise notice 'commissions.is_demo=true (deberia ser 0): %', c_demo;
  raise notice 'commissions.is_demo=false (intacto):      %', c_real;
end $$;

commit;

-- Si el snapshot DESPUES no es lo que esperabas, cambia "commit;" por
-- "rollback;" en la linea anterior y vuelve a ejecutar — todos los
-- DELETE quedan revertidos.
