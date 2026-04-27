-- Migration 007: Refund flow + saldo negativo del jalador
-- Plan 3: commissions-ledger-cron-platform-fee (COM-06, COM-08)
-- Created: 2026-04-27
--
-- process_refund() es el wrapper de alto nivel para refunds:
--   1. Llama update_booking_status(booking_id, 'refunded') -> esto crea reversal automaticamente
--   2. Calcula saldo actual del jalador
--   3. Si el saldo es < -50.000 COP, suspende al jalador
--
-- Limite negativo: -$50.000 COP (configurable en commission_config)
-- Cuando se excede, el jalador queda suspendido hasta que el saldo vuelva a 0+
-- via futuras ventas.

-- ============================================================
-- Tabla de configuracion de comisiones (futuro: mas params)
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defaults
INSERT INTO commission_config (key, value, description) VALUES
  ('negative_balance_limit_cop', '50000', 'Limite negativo permitido del jalador (en COP, sin signo)'),
  ('hold_period_hours', '24', 'Horas despues de tour_date para liberar comision'),
  ('platform_fee_default_pct', '0.08', 'Fee La Perla por defecto si no hay row en commissions table')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Tabla: jalador_status (suspensiones, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS jalador_status (
  jalador_id          UUID PRIMARY KEY,
  is_suspended        BOOLEAN NOT NULL DEFAULT false,
  suspended_reason    TEXT,
  suspended_at        TIMESTAMPTZ,
  suspended_until     TIMESTAMPTZ,             -- NULL = indefinido (hasta que cubra saldo)
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jalador_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalador_status FORCE ROW LEVEL SECURITY;

-- Jalador ve su propio status
CREATE POLICY "jalador_select_own_status"
  ON jalador_status FOR SELECT
  USING (jalador_id = auth.uid());

-- Admin ve y modifica todo
CREATE POLICY "admin_full_jalador_status"
  ON jalador_status FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- Funcion: get_jalador_balance(jalador_id)
-- ============================================================
-- Suma del ledger por jalador. Negativo = debe a la plataforma.
CREATE OR REPLACE FUNCTION public.get_jalador_balance(p_jalador_id UUID)
RETURNS NUMERIC
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE entry_type
      WHEN 'accrual'  THEN amount
      WHEN 'release'  THEN 0       -- release no afecta net (es transicion pending->available)
      WHEN 'reversal' THEN -amount
      ELSE 0
    END
  ), 0)
  FROM commission_ledger
  WHERE jalador_id = p_jalador_id;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_jalador_balance TO authenticated, service_role;

-- ============================================================
-- Funcion principal: process_refund(booking_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_refund(
  p_booking_id UUID,
  p_actor_id   UUID DEFAULT NULL,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jalador_id     UUID;
  v_booking_status booking_status;
  v_balance        NUMERIC;
  v_limit          NUMERIC;
  v_was_suspended  BOOLEAN;
  v_status_changed BOOLEAN;
BEGIN
  -- Lock booking para evitar race
  SELECT jalador_id, status INTO v_jalador_id, v_booking_status
  FROM bookings WHERE id = p_booking_id FOR UPDATE;

  IF v_booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking % no existe', p_booking_id;
  END IF;

  -- 1) Cambiar estado a refunded (esto ya crea el reversal en migration 005)
  v_status_changed := public.update_booking_status(
    p_booking_id,
    'refunded',
    p_actor_id,
    'system',
    COALESCE(p_reason, 'Refund procesado via process_refund()')
  );

  -- Si el booking no tenia jalador, terminamos aqui
  IF v_jalador_id IS NULL THEN
    RETURN jsonb_build_object(
      'booking_id', p_booking_id,
      'status_changed', v_status_changed,
      'jalador_action', 'none',
      'message', 'Booking sin jalador, no aplica check de saldo'
    );
  END IF;

  -- 2) Calcular saldo actual del jalador
  v_balance := public.get_jalador_balance(v_jalador_id);

  -- 3) Leer limite negativo de la config
  SELECT (value::NUMERIC) INTO v_limit
  FROM commission_config WHERE key = 'negative_balance_limit_cop';

  IF v_limit IS NULL THEN
    v_limit := 50000;
  END IF;

  -- 4) Si saldo < -limite, suspender al jalador
  IF v_balance < -v_limit THEN
    -- Verificar si ya estaba suspendido
    SELECT is_suspended INTO v_was_suspended
    FROM jalador_status WHERE jalador_id = v_jalador_id;

    INSERT INTO jalador_status (jalador_id, is_suspended, suspended_reason, suspended_at)
    VALUES (
      v_jalador_id,
      true,
      format('Saldo negativo excedio limite: %s (limite: -%s)', v_balance, v_limit),
      now()
    )
    ON CONFLICT (jalador_id) DO UPDATE SET
      is_suspended = true,
      suspended_reason = EXCLUDED.suspended_reason,
      suspended_at = now(),
      updated_at = now();

    RETURN jsonb_build_object(
      'booking_id', p_booking_id,
      'status_changed', v_status_changed,
      'jalador_id', v_jalador_id,
      'jalador_action', 'suspended',
      'balance', v_balance,
      'limit', v_limit,
      'was_suspended_already', COALESCE(v_was_suspended, false)
    );
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'status_changed', v_status_changed,
    'jalador_id', v_jalador_id,
    'jalador_action', 'none',
    'balance', v_balance,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.process_refund IS 'Refund de booking + check de saldo negativo del jalador. Suspende si excede limite.';

GRANT EXECUTE ON FUNCTION public.process_refund TO authenticated, service_role;
