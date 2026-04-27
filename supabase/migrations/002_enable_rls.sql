-- Migration 002: Habilitar RLS y policies por rol
-- Plan 1: db-foundation-schema-and-rls
-- Created: 2026-04-27
--
-- Cubre SEC-04, SEC-05, SEC-06.
-- Audit goal: SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false RETORNA 0.
--
-- Modelo de auth (heredado de Supabase Auth):
--   auth.uid()  = UUID del usuario logueado
--   auth.jwt()  = JWT completo
--   El claim custom 'role' se setea via JWT hook (configurar despues en Supabase dashboard)
--
-- Helper: get_user_role() lee el claim 'role' del JWT con fallback a 'tourist'.

-- ============================================================
-- Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'tourist'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS en todas las tablas (sin esto, RLS es no-op)
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Forzar RLS incluso para owners (defensa en profundidad)
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE commissions FORCE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Policies: bookings
-- ============================================================
-- Tourist: ve solo sus propios bookings
CREATE POLICY "tourist_select_own_bookings"
  ON bookings FOR SELECT
  USING (tourist_id = auth.uid());

-- Operator: ve bookings de sus tours
CREATE POLICY "operator_select_own_bookings"
  ON bookings FOR SELECT
  USING (operator_id = auth.uid());

-- Jalador: ve bookings que el atribuyo
CREATE POLICY "jalador_select_own_bookings"
  ON bookings FOR SELECT
  USING (jalador_id = auth.uid());

-- Admin: ve todo
CREATE POLICY "admin_select_all_bookings"
  ON bookings FOR SELECT
  USING (public.is_admin());

-- INSERT: solo via RPC con SECURITY DEFINER (Plan 2 lo implementa).
-- Por ahora, NADIE puede INSERT directamente (el INSERT se hace via service_role en Edge Function).
-- No creamos policy de INSERT para bloquear (sin policy = denegado por defecto).

-- UPDATE: solo via RPC update_booking_status (Plan 2). Bloqueado a usuarios.
-- DELETE: nadie puede borrar bookings (audit trail). Solo admin via service_role en casos extremos.

-- ============================================================
-- Policies: booking_status_history (append-only)
-- ============================================================
-- Tourist/Operator/Jalador pueden VER el historial de sus bookings
CREATE POLICY "select_status_history_own_booking"
  ON booking_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
      AND (b.tourist_id = auth.uid() OR b.operator_id = auth.uid() OR b.jalador_id = auth.uid())
    )
  );

CREATE POLICY "admin_select_all_status_history"
  ON booking_status_history FOR SELECT
  USING (public.is_admin());

-- INSERT solo via RPC SECURITY DEFINER (sin policy = bloqueado).
-- UPDATE/DELETE: prohibidos para todos (append-only).

-- ============================================================
-- Policies: commissions
-- ============================================================
-- Tourist: NO ve config de comisiones (solo ve breakdown en checkout)
-- Operator: ve config de sus propios tours (futuro: para que confirme antes de aceptar)
-- Admin: SELECT/INSERT/UPDATE para configurar via UI admin
CREATE POLICY "operator_select_own_commissions"
  ON commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.tour_id = commissions.tour_id
      AND b.operator_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "admin_full_commissions"
  ON commissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- Policies: commission_ledger (append-only para users)
-- ============================================================
-- Jalador: ve sus propias entries
CREATE POLICY "jalador_select_own_ledger"
  ON commission_ledger FOR SELECT
  USING (jalador_id = auth.uid());

-- Admin: ve todo
CREATE POLICY "admin_select_all_ledger"
  ON commission_ledger FOR SELECT
  USING (public.is_admin());

-- INSERT: solo via RPC SECURITY DEFINER (Plan 2 + Plan 3). Sin policy = bloqueado.
-- UPDATE/DELETE: PROHIBIDOS. El ledger es append-only por diseno.
-- Si se necesita corregir un error, se hace con un nuevo entry de tipo 'reversal'.

-- ============================================================
-- Policies: webhook_events
-- ============================================================
-- Solo service_role lee/escribe webhook_events (Plan 2).
-- Para users NO hay policies => acceso denegado por defecto.
-- Admin puede leer para debugging via UI futura.
CREATE POLICY "admin_select_webhook_events"
  ON webhook_events FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- Audit checks (corren al final del migration)
-- ============================================================
DO $$
DECLARE
  unprotected_count INT;
BEGIN
  SELECT COUNT(*) INTO unprotected_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('bookings', 'booking_status_history', 'commissions', 'commission_ledger', 'webhook_events')
  AND NOT rowsecurity;

  IF unprotected_count > 0 THEN
    RAISE EXCEPTION 'RLS audit failed: % core tables sin RLS', unprotected_count;
  END IF;

  RAISE NOTICE 'RLS audit OK: todas las tablas core tienen RLS habilitado';
END $$;
