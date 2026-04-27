-- Migration 004: RPC create_booking
-- Plan 2: wompi-prod-webhook-idempotente (PAY-04, BKG-04, COM-02)
-- Created: 2026-04-27
--
-- Esta funcion es la UNICA forma de crear bookings y entries de accrual.
-- Garantiza atomicidad: si algo falla, ni el booking ni el ledger entry quedan.
-- SECURITY DEFINER permite que se llame con cualquier rol y bypassee RLS.
-- Llamada desde:
--   - Edge Function `wompi-webhook` cuando llega evento de payment_approved
--   - API route `/api/bookings/create` cuando se crea booking en estado pending
--
-- Idempotencia: si ya existe un booking con el mismo wompi_reference, retorna el existente.

CREATE OR REPLACE FUNCTION public.create_booking(
  p_tour_id        UUID,
  p_tourist_id     UUID,
  p_operator_id    UUID,
  p_jalador_id     UUID,
  p_jalador_ref_id TEXT,
  p_subtotal       NUMERIC,
  p_tour_date      DATE,
  p_party_size     INTEGER,
  p_party_children INTEGER,
  p_wompi_reference TEXT,           -- usado para idempotencia
  p_metadata       JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id      UUID;
  v_existing_id     UUID;
  v_commission      commissions;
  v_platform_fee    NUMERIC(12, 2);
  v_jalador_amount  NUMERIC(12, 2);
  v_operator_amount NUMERIC(12, 2);
  v_total           NUMERIC(12, 2);
BEGIN
  -- Idempotency check: si ya existe booking con esta reference, retornarlo
  SELECT id INTO v_existing_id
  FROM bookings
  WHERE metadata->>'wompi_reference' = p_wompi_reference
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Validaciones basicas
  IF p_party_size <= 0 THEN
    RAISE EXCEPTION 'party_size debe ser > 0, got %', p_party_size;
  END IF;
  IF p_party_children > p_party_size THEN
    RAISE EXCEPTION 'party_children (%) no puede exceder party_size (%)', p_party_children, p_party_size;
  END IF;
  IF p_subtotal < 0 THEN
    RAISE EXCEPTION 'subtotal no puede ser negativo, got %', p_subtotal;
  END IF;

  -- Obtener config de comision activa para este tour
  v_commission := public.get_commission_for(p_tour_id, now());

  IF v_commission.id IS NULL THEN
    -- Fallback a defaults si no hay config (no deberia pasar en prod)
    v_platform_fee    := round(p_subtotal * 0.08, 0);
    v_jalador_amount  := round(p_subtotal * 0.20, 0);
    v_operator_amount := p_subtotal - v_jalador_amount;
  ELSE
    v_platform_fee    := round(p_subtotal * v_commission.platform_pct, 0);
    v_jalador_amount  := round(p_subtotal * v_commission.jalador_pct, 0);
    v_operator_amount := round(p_subtotal * v_commission.operator_pct, 0);
  END IF;

  v_total := p_subtotal + v_platform_fee;

  -- Insertar el booking en estado pending
  INSERT INTO bookings (
    tour_id, tourist_id, operator_id, jalador_id, jalador_ref_id,
    status, total_amount, subtotal, platform_fee, jalador_amount, operator_amount,
    tour_date, party_size, party_children, metadata
  ) VALUES (
    p_tour_id, p_tourist_id, p_operator_id, p_jalador_id, p_jalador_ref_id,
    'pending', v_total, p_subtotal, v_platform_fee, v_jalador_amount, v_operator_amount,
    p_tour_date, p_party_size, p_party_children,
    p_metadata || jsonb_build_object('wompi_reference', p_wompi_reference)
  )
  RETURNING id INTO v_booking_id;

  -- Registrar el estado inicial en el history
  INSERT INTO booking_status_history (booking_id, from_status, to_status, actor_role, reason)
  VALUES (v_booking_id, NULL, 'pending', 'system', 'Booking creado via create_booking RPC');

  -- NO insertamos en commission_ledger todavia. El accrual se crea cuando
  -- el webhook de Wompi confirma el pago (status -> paid en update_booking_status).

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_booking IS 'Crea un booking en estado pending. Idempotente por p_wompi_reference. Calcula comisiones segun tabla commissions activa.';

-- Permitir ejecucion desde authenticated y service_role
GRANT EXECUTE ON FUNCTION public.create_booking TO authenticated, service_role;
