-- Migration 008: Cola de facturas pendientes
-- Plan 4: compliance-dian-rnt-habeas-data (CMP-01)
-- Created: 2026-04-27
--
-- Encolar invoice DIAN despues de pago confirmado, sin bloquear el webhook < 3s.
-- Edge Function issue-invoice procesa esta tabla cada 5 min via pg_cron.
--
-- Status: pending -> processing -> issued | failed
-- Retry exponencial con cap (max_attempts) para fallas transient de Alegra/Siigo.

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('pending', 'processing', 'issued', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS pending_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status          invoice_status NOT NULL DEFAULT 'pending',
  provider        TEXT NOT NULL DEFAULT 'alegra',           -- 'alegra' | 'siigo'
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),       -- backoff exponencial
  error           TEXT,
  alegra_invoice_id TEXT,                                    -- ID de invoice en Alegra una vez issued
  invoice_pdf_url TEXT,                                      -- URL del PDF
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pending_invoices_unique_booking UNIQUE (booking_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_pending_invoices_status_next ON pending_invoices(status, next_attempt_at)
  WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS pending_invoices_set_updated_at ON pending_invoices;
CREATE TRIGGER pending_invoices_set_updated_at
  BEFORE UPDATE ON pending_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pending_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invoices FORCE ROW LEVEL SECURITY;

-- Solo admin lee directo. service_role escribe via Edge Functions.
CREATE POLICY "admin_select_pending_invoices"
  ON pending_invoices FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- Funcion: enqueue_invoice(booking_id)
-- ============================================================
-- Llamada desde wompi-webhook despues de marcar booking como 'paid'.
-- Idempotente: ON CONFLICT DO NOTHING.
CREATE OR REPLACE FUNCTION public.enqueue_invoice(
  p_booking_id UUID,
  p_provider   TEXT DEFAULT 'alegra'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO pending_invoices (booking_id, provider)
  VALUES (p_booking_id, p_provider)
  ON CONFLICT (booking_id, provider) DO NOTHING
  RETURNING id INTO v_id;

  -- Si ya existia, devolver el id existente
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM pending_invoices
    WHERE booking_id = p_booking_id AND provider = p_provider;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.enqueue_invoice TO authenticated, service_role;

-- ============================================================
-- Cron: procesar invoices pendientes cada 5 minutos
-- ============================================================
-- El cron solo dispara la Edge Function, que es la que tiene la logica de Alegra.
-- Aqui solo dejamos la funcion para que Edge Function la pueda usar para tomar batch.
CREATE OR REPLACE FUNCTION public.claim_pending_invoices(p_limit INTEGER DEFAULT 10)
RETURNS SETOF pending_invoices
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE pending_invoices
  SET status = 'processing',
      attempts = attempts + 1,
      last_attempt_at = now()
  WHERE id IN (
    SELECT id FROM pending_invoices
    WHERE status = 'pending'
      AND next_attempt_at <= now()
      AND attempts < max_attempts
    ORDER BY next_attempt_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION public.claim_pending_invoices TO service_role;

COMMENT ON TABLE pending_invoices IS 'Cola de facturas DIAN pendientes de emitir. Procesada por Edge Function issue-invoice cada 5 min.';
