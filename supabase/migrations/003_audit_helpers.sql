-- Migration 003: Audit helpers para verificacion continua
-- Plan 1: db-foundation-schema-and-rls
-- Created: 2026-04-27
--
-- Cubre SEC-04. Provee views y funciones para CI auditar el estado de RLS.
-- El test tests/rls/tenant-isolation.test.ts consume estas views.

-- ============================================================
-- View: rls_audit
-- ============================================================
-- Lista todas las tablas en schema 'public' con su estado de RLS.
-- target_tables_unprotected debe ser 0 en CI.
CREATE OR REPLACE VIEW rls_audit AS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE
    WHEN tablename IN (
      'bookings', 'booking_status_history',
      'commissions', 'commission_ledger', 'webhook_events'
    ) THEN 'core_money_flow'
    ELSE 'other'
  END AS sensitivity,
  -- Lista las policies definidas (0 = sin policies = todo bloqueado por defecto)
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.schemaname = pt.schemaname AND p.tablename = pt.tablename
  ) AS policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
ORDER BY sensitivity DESC, tablename;

COMMENT ON VIEW rls_audit IS 'Audit del estado de RLS por tabla. Consume en CI: SELECT count(*) WHERE NOT rls_enabled AND sensitivity=core_money_flow';

-- ============================================================
-- Funcion: count_unprotected_core_tables()
-- ============================================================
-- Helper para usar en assert de tests CI.
-- Retorna 0 si todas las tablas core tienen RLS habilitado.
CREATE OR REPLACE FUNCTION public.count_unprotected_core_tables()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM rls_audit
  WHERE sensitivity = 'core_money_flow' AND NOT rls_enabled;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- View: ledger_integrity_check
-- ============================================================
-- Detecta entries del ledger sin booking referenciado (no deberia pasar
-- por FK constraint pero en caso de migrations futuras es util).
CREATE OR REPLACE VIEW ledger_integrity_check AS
SELECT
  cl.id AS ledger_id,
  cl.booking_id,
  cl.entry_type,
  cl.amount,
  cl.created_at,
  CASE
    WHEN b.id IS NULL THEN 'orphan_booking'
    WHEN cl.amount < 0 THEN 'negative_amount'  -- nunca deberia pasar por CHECK constraint
    ELSE 'ok'
  END AS issue
FROM commission_ledger cl
LEFT JOIN bookings b ON b.id = cl.booking_id
WHERE b.id IS NULL OR cl.amount < 0;

COMMENT ON VIEW ledger_integrity_check IS 'Filas con problemas de integridad en el ledger. Debe estar vacia en prod.';

-- ============================================================
-- View: webhook_events_summary
-- ============================================================
-- Resumen de procesamiento de webhooks Wompi.
-- Util para dashboard admin futuro y debugging.
CREATE OR REPLACE VIEW webhook_events_summary AS
SELECT
  provider,
  DATE_TRUNC('hour', received_at) AS hour,
  COUNT(*) AS total,
  COUNT(processed_at) AS processed,
  COUNT(*) - COUNT(processed_at) AS pending_or_failed,
  COUNT(error) AS with_error
FROM webhook_events
GROUP BY provider, DATE_TRUNC('hour', received_at)
ORDER BY hour DESC;
