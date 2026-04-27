-- Migration 005: RPC update_booking_status
-- Plan 2: wompi-prod-webhook-idempotente (BKG-01, BKG-02, BKG-03, COM-04)
-- Created: 2026-04-27
--
-- State machine de bookings con transiciones validas:
--
--   pending -> paid -> confirmed -> completed -> reviewed
--      |       |          |            |
--      v       v          v            v
--   canceled refunded canceled    disputed
--
-- Side effects automaticos:
--   pending -> paid: insert accrual en commission_ledger
--   * -> refunded:   insert reversal en commission_ledger (si habia accrual/release)
--
-- SECURITY DEFINER + transaccion garantiza atomicidad.
-- Idempotencia: si el booking ya esta en el estado destino, no hace nada (retorna false).

-- Tabla auxiliar para definir transiciones validas (mas legible que CASE gigante)
CREATE TABLE IF NOT EXISTS booking_status_transitions (
  from_status booking_status NOT NULL,
  to_status   booking_status NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

-- Limpiar y rellenar (idempotente)
TRUNCATE booking_status_transitions;
INSERT INTO booking_status_transitions (from_status, to_status) VALUES
  -- Flujo feliz
  ('pending',   'paid'),
  ('paid',      'confirmed'),
  ('confirmed', 'completed'),
  ('completed', 'reviewed'),
  -- Cancelaciones
  ('pending',   'canceled'),
  ('paid',      'canceled'),
  ('confirmed', 'canceled'),
  -- Refunds
  ('paid',      'refunded'),
  ('confirmed', 'refunded'),
  ('canceled',  'refunded'),
  -- Disputes
  ('completed', 'disputed'),
  ('paid',      'disputed'),
  ('confirmed', 'disputed');

-- ============================================================
-- Funcion principal
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_to_status  booking_status,
  p_actor_id   UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT 'system',
  p_reason     TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status booking_status;
  v_jalador_id     UUID;
  v_jalador_amount NUMERIC(12, 2);
  v_total_accrued  NUMERIC(12, 2);
  v_total_released NUMERIC(12, 2);
  v_to_reverse     NUMERIC(12, 2);
  v_transition_ok  BOOLEAN;
BEGIN
  -- Lock the booking row para evitar race conditions
  SELECT status, jalador_id, jalador_amount
    INTO v_current_status, v_jalador_id, v_jalador_amount
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Booking % no existe', p_booking_id;
  END IF;

  -- Idempotencia: si ya estamos en el estado destino, no hacer nada
  IF v_current_status = p_to_status THEN
    RETURN false;
  END IF;

  -- Validar transicion
  SELECT EXISTS (
    SELECT 1 FROM booking_status_transitions
    WHERE from_status = v_current_status AND to_status = p_to_status
  ) INTO v_transition_ok;

  IF NOT v_transition_ok THEN
    RAISE EXCEPTION 'Transicion invalida: % -> %', v_current_status, p_to_status;
  END IF;

  -- Aplicar el cambio de estado
  UPDATE bookings SET status = p_to_status WHERE id = p_booking_id;

  -- Registrar en history
  INSERT INTO booking_status_history (
    booking_id, from_status, to_status, actor_id, actor_role, reason
  ) VALUES (
    p_booking_id, v_current_status, p_to_status, p_actor_id, p_actor_role, p_reason
  );

  -- Side effects sobre commission_ledger
  IF p_to_status = 'paid' AND v_jalador_id IS NOT NULL AND v_jalador_amount > 0 THEN
    -- Crear accrual entry (jalador acumula comision)
    INSERT INTO commission_ledger (booking_id, jalador_id, entry_type, amount, metadata)
    VALUES (
      p_booking_id, v_jalador_id, 'accrual', v_jalador_amount,
      jsonb_build_object('triggered_by', 'update_booking_status:paid')
    );
  END IF;

  IF p_to_status = 'refunded' AND v_jalador_id IS NOT NULL THEN
    -- Calcular total accrued y released para este booking
    SELECT
      COALESCE(SUM(CASE WHEN entry_type = 'accrual' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN entry_type = 'release' THEN amount ELSE 0 END), 0)
    INTO v_total_accrued, v_total_released
    FROM commission_ledger
    WHERE booking_id = p_booking_id;

    -- El reversal cubre lo que sea mayor: accrued o released
    v_to_reverse := GREATEST(v_total_accrued, v_total_released);

    IF v_to_reverse > 0 THEN
      INSERT INTO commission_ledger (booking_id, jalador_id, entry_type, amount, metadata)
      VALUES (
        p_booking_id, v_jalador_id, 'reversal', v_to_reverse,
        jsonb_build_object(
          'triggered_by', 'update_booking_status:refunded',
          'reverses_accrued', v_total_accrued,
          'reverses_released', v_total_released
        )
      );
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_booking_status IS 'Actualiza estado de booking validando transiciones. Side effects: accrual al pasar a paid, reversal al pasar a refunded.';

GRANT EXECUTE ON FUNCTION public.update_booking_status TO authenticated, service_role;
