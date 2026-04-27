-- Migration 001: Schema base canonico para La Perla
-- Plan 1: db-foundation-schema-and-rls
-- Created: 2026-04-27
--
-- Este archivo crea las 5 tablas core que sostienen el flujo de plata:
--   1. bookings              - reservas (state machine)
--   2. booking_status_history - audit trail de cambios de estado
--   3. commissions            - configuracion % comision por tour
--   4. commission_ledger      - libro inmutable accrual/release/reversal
--   5. webhook_events         - idempotencia de Wompi webhooks
--
-- IMPORTANTE: este migration corre antes que 002 (RLS). Sin RLS habilitado,
-- estas tablas quedan abiertas. NO deployar a prod sin correr 002 inmediatamente.

-- ============================================================
-- Extensions requeridas
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUM types
-- ============================================================

-- Estados del booking state machine
-- Ver Plan 2 para diagrama de transiciones validas
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending',     -- creado, esperando pago
    'paid',        -- Wompi confirmo pago via webhook
    'confirmed',   -- operador confirmo cupo
    'completed',   -- tour ejecutado, listo para review
    'reviewed',    -- turista dejo review
    'canceled',    -- turista u operador cancelo antes del tour
    'refunded',    -- pago reversado a tarjeta/cuenta
    'disputed'     -- en cola admin para resolucion manual
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tipos de entrada del ledger de comisiones (append-only)
DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM (
    'accrual',   -- comision acumulada al pagar el booking
    'release',   -- liberada despues del hold-period (cron 24h post-tour)
    'reversal'   -- reverso por refund (puede dejar saldo negativo)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- Tabla: bookings
-- ============================================================
-- Una reserva de tour por un turista, opcionalmente atribuida a un jalador
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id         UUID NOT NULL,
  tourist_id      UUID NOT NULL,                -- referencia a auth.users
  operator_id     UUID NOT NULL,                -- operador del tour
  jalador_id      UUID,                         -- nullable: booking sin jalador (web directo)
  jalador_ref_id  TEXT,                         -- refCode capturado en URL `/j/[refCode]/...`
  status          booking_status NOT NULL DEFAULT 'pending',
  payment_status  TEXT,                         -- raw status desde Wompi para debugging
  total_amount    NUMERIC(12, 2) NOT NULL,      -- precio final pagado (incluye platform fee)
  subtotal        NUMERIC(12, 2) NOT NULL,      -- precio del tour (sin platform fee)
  platform_fee    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  jalador_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  operator_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tour_date       DATE NOT NULL,
  party_size      INTEGER NOT NULL DEFAULT 1,
  party_children  INTEGER NOT NULL DEFAULT 0,
  invoice_id      TEXT,                         -- ID de factura DIAN (Alegra/Siigo)
  invoice_pdf_url TEXT,                         -- URL del PDF de factura
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT party_size_positive CHECK (party_size > 0),
  CONSTRAINT children_le_party CHECK (party_children <= party_size),
  CONSTRAINT amounts_non_negative CHECK (
    total_amount >= 0 AND subtotal >= 0 AND platform_fee >= 0
    AND jalador_amount >= 0 AND operator_amount >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_tourist ON bookings(tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_operator ON bookings(operator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_jalador ON bookings(jalador_id) WHERE jalador_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_date ON bookings(tour_date);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Tabla: booking_status_history (BKG-03)
-- ============================================================
-- Audit trail de cada transicion de estado del booking
-- Append-only conceptualmente (validado por RLS en 002)
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,                  -- NULL si es el estado inicial
  to_status   booking_status NOT NULL,
  actor_id    UUID,                            -- quien hizo el cambio (NULL si fue automatic)
  actor_role  TEXT,                            -- 'system' | 'tourist' | 'operator' | 'admin' | 'wompi-webhook'
  reason      TEXT,                            -- texto opcional para auditoria
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON booking_status_history(created_at DESC);

-- ============================================================
-- Tabla: commissions (COM-01)
-- ============================================================
-- Configuracion de % comision por tour. Reemplaza el 20% hardcoded.
-- effective_from permite cambiar % sin afectar bookings pasados.
CREATE TABLE IF NOT EXISTS commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id         UUID NOT NULL,
  jalador_pct     NUMERIC(5, 4) NOT NULL,      -- ej: 0.2000 = 20%
  platform_pct    NUMERIC(5, 4) NOT NULL,      -- fee La Perla (default 0.08 = 8%)
  operator_pct    NUMERIC(5, 4) NOT NULL,      -- el resto (calculado)
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pct_in_range CHECK (
    jalador_pct >= 0 AND jalador_pct <= 1
    AND platform_pct >= 0 AND platform_pct <= 1
    AND operator_pct >= 0 AND operator_pct <= 1
  ),
  CONSTRAINT pct_sum_one CHECK (
    abs((jalador_pct + platform_pct + operator_pct) - 1.0) < 0.0001
  )
);

CREATE INDEX IF NOT EXISTS idx_commissions_tour ON commissions(tour_id, effective_from DESC);

-- Funcion helper: obtener commission row activa para un tour en una fecha dada
CREATE OR REPLACE FUNCTION get_commission_for(p_tour_id UUID, p_at TIMESTAMPTZ DEFAULT now())
RETURNS commissions AS $$
  SELECT *
  FROM commissions
  WHERE tour_id = p_tour_id AND effective_from <= p_at
  ORDER BY effective_from DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Tabla: commission_ledger (COM-03, COM-04)
-- ============================================================
-- Libro mayor inmutable de comisiones del jalador.
-- Append-only: solo INSERT permitido (validado por RLS en 002).
-- Saldo del jalador = SUM(amount * sign) WHERE jalador_id = X
CREATE TABLE IF NOT EXISTS commission_ledger (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  jalador_id  UUID NOT NULL,
  entry_type  ledger_entry_type NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,        -- siempre positivo; el signo viene del entry_type
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_jalador ON commission_ledger(jalador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_booking ON commission_ledger(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON commission_ledger(entry_type);

-- View: balance del jalador por estado
-- pending  = accrual sin release todavia (esta en hold-period)
-- available = released, listo para retirar
-- paid     = ya retirado (tracked en una futura tabla payouts)
-- net      = available - reversals
CREATE OR REPLACE VIEW jalador_balances AS
SELECT
  jalador_id,
  COALESCE(SUM(CASE WHEN entry_type = 'accrual' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN entry_type = 'release' THEN amount ELSE 0 END), 0) AS pending,
  COALESCE(SUM(CASE WHEN entry_type = 'release' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN entry_type = 'reversal' THEN amount ELSE 0 END), 0) AS available,
  COALESCE(SUM(
    CASE entry_type
      WHEN 'accrual' THEN amount
      WHEN 'reversal' THEN -amount
      ELSE 0
    END
  ), 0) AS net_total
FROM commission_ledger
GROUP BY jalador_id;

-- ============================================================
-- Tabla: webhook_events (Plan 2 dependency, idempotencia Wompi)
-- ============================================================
-- INSERT ON CONFLICT DO NOTHING garantiza exactly-once processing.
-- event_id viene del provider (Wompi), checksum se valida server-side.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id      TEXT PRIMARY KEY,             -- viene del header Wompi
  provider      TEXT NOT NULL DEFAULT 'wompi',
  checksum      TEXT NOT NULL,
  payload       JSONB NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,                  -- NULL = recibido pero procesamiento pending/failed
  error         TEXT                          -- ultimo error si processed_at IS NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON webhook_events(received_at)
  WHERE processed_at IS NULL;

-- ============================================================
-- Comentarios de tabla (documentacion en DB)
-- ============================================================
COMMENT ON TABLE bookings IS 'Reservas de tours. State machine en columna status.';
COMMENT ON TABLE booking_status_history IS 'Audit trail append-only de cambios de status. RLS impide UPDATE/DELETE.';
COMMENT ON TABLE commissions IS 'Configuracion % comision por tour con effective_from. Reemplaza el 20% hardcoded historico.';
COMMENT ON TABLE commission_ledger IS 'Ledger inmutable de comisiones del jalador. RLS impide UPDATE/DELETE excepto service_role.';
COMMENT ON TABLE webhook_events IS 'Idempotencia para webhooks de proveedores externos (Wompi). PRIMARY KEY en event_id garantiza exactly-once.';
