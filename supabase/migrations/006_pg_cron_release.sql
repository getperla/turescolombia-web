-- Migration 006: Cron job de liberacion de comisiones
-- Plan 3: commissions-ledger-cron-platform-fee (COM-05)
-- Created: 2026-04-27
--
-- pg_cron job que corre cada hora y libera comisiones de tours completados.
--
-- Politica de hold-period: 24 horas despues de tour_date el accrual
-- pasa a release. Esto da tiempo de que el operador marque el booking
-- como completed y de que el turista tenga ventana para disputar.
--
-- Idempotente: si ya existe un release para el booking, no inserta otro.
-- Solo libera bookings cuyo status ESTE en 'completed' (o 'reviewed').

-- ============================================================
-- Funcion principal: release_due_commissions()
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_due_commissions()
RETURNS TABLE(released_count INTEGER, total_amount NUMERIC)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    INTEGER := 0;
  v_total    NUMERIC := 0;
BEGIN
  WITH eligible_bookings AS (
    SELECT
      b.id AS booking_id,
      b.jalador_id,
      b.jalador_amount
    FROM bookings b
    WHERE b.status IN ('completed', 'reviewed')
      AND b.jalador_id IS NOT NULL
      AND b.jalador_amount > 0
      -- Hold-period: tour_date + 24h en el pasado
      AND (b.tour_date::timestamptz + interval '24 hours') <= now()
      -- Tener al menos un accrual sin release
      AND EXISTS (
        SELECT 1 FROM commission_ledger cl
        WHERE cl.booking_id = b.id AND cl.entry_type = 'accrual'
      )
      AND NOT EXISTS (
        SELECT 1 FROM commission_ledger cl
        WHERE cl.booking_id = b.id AND cl.entry_type = 'release'
      )
  ),
  inserted AS (
    INSERT INTO commission_ledger (booking_id, jalador_id, entry_type, amount, metadata)
    SELECT
      booking_id,
      jalador_id,
      'release'::ledger_entry_type,
      jalador_amount,
      jsonb_build_object(
        'triggered_by', 'release_due_commissions_cron',
        'released_at', now()
      )
    FROM eligible_bookings
    RETURNING amount
  )
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_count, v_total FROM inserted;

  RETURN QUERY SELECT v_count, v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.release_due_commissions IS 'Libera comisiones de bookings con tour_date + 24h pasado. Idempotente. Llamado por pg_cron cada hora.';

-- ============================================================
-- Schedule del cron job
-- ============================================================
-- pg_cron debe estar habilitado (CREATE EXTENSION en migration 001).
-- Si no esta habilitado, este DO se salta sin error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Limpiar job anterior si existe (idempotencia del migration)
    PERFORM cron.unschedule('commission-release')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'commission-release');

    -- Schedulear cada hora en minuto 0
    PERFORM cron.schedule(
      'commission-release',
      '0 * * * *',
      $cron$ SELECT public.release_due_commissions(); $cron$
    );

    RAISE NOTICE 'Cron job commission-release scheduled (hourly @ minute 0)';
  ELSE
    RAISE NOTICE 'pg_cron extension no instalada - skipping schedule. Activarla manual en Supabase Dashboard > Database > Extensions.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- En entornos locales sin pg_cron (CI), no fallar el migration
  RAISE NOTICE 'No se pudo schedulear cron: %. Skipping.', SQLERRM;
END $$;

-- Permitir ejecucion manual desde admin
GRANT EXECUTE ON FUNCTION public.release_due_commissions TO authenticated, service_role;
