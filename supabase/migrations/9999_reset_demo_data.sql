-- Reset de datos demo — borrar SOLO filas con is_demo = true.
--
-- ⚠️  POR SEGURIDAD ESTE SCRIPT NO BORRA NADA POR DEFECTO.
--
-- Workflow de 2 pasos para evitar borrados accidentales:
--
--   PASO 1 (dry-run, default):
--     Pega y ejecuta este script tal cual. Solo correran los SELECTs y
--     veras counts de lo que SE BORRARIA + chequeo de inconsistencias.
--     Nada se modifica.
--
--   PASO 2 (apply, requiere edicion manual):
--     Si los counts del dry-run son lo esperado, descomenta el bloque
--     marcado "-- ↓ DESCOMENTAR PARA APLICAR ↓" y vuelve a ejecutar.
--     Cada DELETE corre en su propia transaccion atomica.
--
-- Cuando estes listo para pasar a produccion real:
--   1. Verifica que LAPERLA_MODE=production esta seteado en Vercel
--   2. Ejecuta el dry-run de este script
--   3. Si los counts cuadran, descomenta el bloque APPLY y re-ejecuta

-- ============================================================================
-- DRY-RUN: counts y chequeo de inconsistencias (no modifica nada)
-- ============================================================================

do $$
declare
  s_demo int;
  s_real int;
  i_demo int;
  c_demo int;
  c_real int;
  -- Inconsistency: commissions reales (is_demo=false) cuyo sale es demo.
  -- Si existe, el cascade ON DELETE borraria comisiones reales.
  c_orphan_real int;
  -- Inconsistency: commissions demo cuyo sale ya no es demo.
  c_orphan_demo int;
begin
  select count(*) into s_demo from public.sales where is_demo = true;
  select count(*) into s_real from public.sales where is_demo = false;
  select count(*) into i_demo
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where s.is_demo = true;
  select count(*) into c_demo from public.commissions where is_demo = true;
  select count(*) into c_real from public.commissions where is_demo = false;

  select count(*) into c_orphan_real
    from public.commissions c
    join public.sales s on s.id = c.sale_id
    where c.is_demo = false and s.is_demo = true;

  select count(*) into c_orphan_demo
    from public.commissions c
    join public.sales s on s.id = c.sale_id
    where c.is_demo = true and s.is_demo = false;

  raise notice E'\n=== DRY-RUN: counts actuales ===';
  raise notice 'sales.is_demo=true (se borrarian):   %', s_demo;
  raise notice 'sales.is_demo=false (intactos):      %', s_real;
  raise notice 'sale_items en sales demo (cascade):  %', i_demo;
  raise notice 'commissions.is_demo=true:            %', c_demo;
  raise notice 'commissions.is_demo=false (intactos): %', c_real;

  raise notice E'\n=== Chequeo de inconsistencias ===';
  if c_orphan_real > 0 then
    raise warning '⚠️  HAY % commissions REALES (is_demo=false) cuyo sale es DEMO. El cascade ON DELETE las borraria. Revisa estos casos antes de aplicar:', c_orphan_real;
    raise warning '    SELECT c.id, c.sale_id, c.amount_cop FROM commissions c JOIN sales s ON s.id=c.sale_id WHERE c.is_demo=false AND s.is_demo=true;';
  else
    raise notice 'OK: 0 commissions reales orfanas en sales demo';
  end if;

  if c_orphan_demo > 0 then
    raise warning '⚠️  HAY % commissions DEMO cuyo sale ya es REAL. Estas no se borrarian con DELETE FROM sales — habria que limpiarlas a parte.', c_orphan_demo;
  else
    raise notice 'OK: 0 commissions demo en sales reales';
  end if;

  raise notice E'\n=== Para aplicar ===';
  raise notice 'Si los counts son correctos Y no hay inconsistencias,';
  raise notice 'descomenta el bloque "DESCOMENTAR PARA APLICAR" abajo y re-ejecuta.';
end $$;

-- ============================================================================
-- ↓ APPLY BLOCK — desde "BEGIN APPLY BLOCK" hasta "END APPLY BLOCK" ↓
--
-- INSTRUCCIONES PARA APLICAR:
--   1. Selecciona TODO el bloque entre los marcadores "BEGIN APPLY BLOCK" y
--      "END APPLY BLOCK" (incluye begin, DO block, los DELETE y commit).
--   2. Quita el "-- " (con espacio) del inicio de CADA linea seleccionada.
--      En la mayoria de editores: Find/Replace con regex sobre la seleccion,
--      buscar `^-- ?` y reemplazar por nada.
--   3. Re-ejecuta el script completo.
--
-- ⚠️  Si descomentas SOLO PARTE del bloque (ej: solo los DELETE pero no el
--     DO block o el commit), Postgres lanzara syntax error o ejecutara una
--     transaccion incompleta. Descomentar TODO o nada.
-- ============================================================================

-- BEGIN APPLY BLOCK
-- begin;
--
-- -- Pre-check OBLIGATORIO: si hay commissions reales (is_demo=false) cuyo sale
-- -- es demo (is_demo=true), ON DELETE CASCADE las borraria silenciosamente.
-- -- RAISE EXCEPTION aborta la transaccion → rollback automatico → datos a salvo.
-- do $$
-- declare
--   c_orphan_real int;
--   c_orphan_demo int;
-- begin
--   select count(*) into c_orphan_real
--     from public.commissions c
--     join public.sales s on s.id = c.sale_id
--     where c.is_demo = false and s.is_demo = true;
--
--   select count(*) into c_orphan_demo
--     from public.commissions c
--     join public.sales s on s.id = c.sale_id
--     where c.is_demo = true and s.is_demo = false;
--
--   -- ABORT solo cuando hay riesgo REAL de perder datos:
--   -- commissions reales (is_demo=false) cuyo sale es demo (is_demo=true).
--   -- El DELETE FROM sales is_demo=true cascadearia y las borraria.
--   if c_orphan_real > 0 then
--     raise exception 'ABORTANDO: % commissions REALES estan ligadas a sales DEMO. ON DELETE CASCADE las borraria. Resuelve primero: UPDATE sales SET is_demo=false donde corresponda, o UPDATE commissions SET is_demo=true. Luego re-corre.', c_orphan_real;
--   end if;
--
--   -- WARNING (no aborta) cuando hay commissions demo en sales reales:
--   -- el siguiente DELETE FROM commissions WHERE is_demo=true las limpia
--   -- sin tocar la sale real. Es cleanup valido, no perdida de datos.
--   if c_orphan_demo > 0 then
--     raise notice '⚠️  % commissions DEMO estan ligadas a sales REALES. Se limpiaran (DELETE WHERE is_demo=true) sin tocar las sales reales. OK.', c_orphan_demo;
--   end if;
-- end $$;
--
-- -- Borrar EXPLICITAMENTE commissions is_demo=true (no depender del cascade).
-- delete from public.commissions where is_demo = true;
--
-- -- Borrar sale_items demo explicitamente (aunque cascade lo haria, para que
-- -- el log de afectados sea claro y no dependamos de la FK config).
-- delete from public.sale_items
--   where sale_id in (select id from public.sales where is_demo = true);
--
-- -- Ahora si: borrar sales demo. El pre-check ya garantizo que ningun
-- -- cascade va a tocar commissions reales.
-- delete from public.sales where is_demo = true;
--
-- -- Si los counts post-apply (mira el bloque siguiente) NO son lo esperado,
-- -- ejecuta "rollback;" en lugar de "commit;" abajo. Postgres mantiene la
-- -- transaccion abierta hasta que ejecutas uno u otro.
-- commit;
-- END APPLY BLOCK

-- ============================================================================
-- POST-APPLY: verificacion manual (ejecutar despues del bloque APPLY)
-- ============================================================================

-- select
--   (select count(*) from public.sales where is_demo = true)       as sales_demo_restantes,
--   (select count(*) from public.sales where is_demo = false)      as sales_reales,
--   (select count(*) from public.commissions where is_demo = true) as comm_demo_restantes,
--   (select count(*) from public.commissions where is_demo = false) as comm_reales;
-- -- Esperado: sales_demo_restantes = 0, comm_demo_restantes = 0,
-- --          sales_reales y comm_reales SIN cambios respecto al dry-run.
