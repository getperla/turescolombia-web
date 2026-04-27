-- Migration 009: Compliance del operador (RNT, RUT, cuenta bancaria)
-- Plan 4: compliance-dian-rnt-habeas-data (CMP-05, CMP-06)
-- Created: 2026-04-27
--
-- Tabla operators_compliance separada de operators (la cual vive en Render legacy aun).
-- Una vez Phase 2 migre operators a Supabase, se puede consolidar via FK.
--
-- RNT validation se hace contra API MinCIT y se cachea aqui con expiry date.
-- RUT PDF + cuenta bancaria se guardan en Supabase Storage (URL referenciada aqui).
-- Cuenta bancaria encriptada via pgcrypto con key en SUPABASE_VAULT (manual).

CREATE TABLE IF NOT EXISTS operators_compliance (
  operator_id           UUID PRIMARY KEY,
  -- RNT
  rnt_number            TEXT,
  rnt_validated_at      TIMESTAMPTZ,
  rnt_expires_at        TIMESTAMPTZ,
  rnt_holder_name       TEXT,                      -- nombre del operador segun MinCIT
  -- RUT (NIT)
  rut_number            TEXT,
  rut_pdf_url           TEXT,                      -- supabase.storage://bucket/path
  rut_uploaded_at       TIMESTAMPTZ,
  -- Banking (encrypted)
  bank_name             TEXT,
  bank_account_type     TEXT,                      -- 'ahorros' | 'corriente'
  bank_account_encrypted BYTEA,                    -- pgp_sym_encrypt(account_number, key)
  bank_account_holder   TEXT,
  bank_validated_at     TIMESTAMPTZ,
  -- Habeas Data acceptance
  habeas_data_accepted_at TIMESTAMPTZ,
  habeas_data_version    TEXT,                     -- ej '2026-04-27-v1' (track revisions)
  -- Estado de habilitacion para vender
  is_compliant          BOOLEAN GENERATED ALWAYS AS (
    rnt_number IS NOT NULL
    AND rnt_validated_at IS NOT NULL
    AND (rnt_expires_at IS NULL OR rnt_expires_at > now())
    AND rut_number IS NOT NULL
    AND rut_pdf_url IS NOT NULL
    AND habeas_data_accepted_at IS NOT NULL
  ) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operators_compliance_compliant
  ON operators_compliance(is_compliant) WHERE is_compliant = true;
CREATE INDEX IF NOT EXISTS idx_operators_compliance_rnt_expiry
  ON operators_compliance(rnt_expires_at) WHERE rnt_expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS operators_compliance_set_updated_at ON operators_compliance;
CREATE TRIGGER operators_compliance_set_updated_at
  BEFORE UPDATE ON operators_compliance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE operators_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_compliance FORCE ROW LEVEL SECURITY;

-- Operator ve y edita su propio compliance row
CREATE POLICY "operator_select_own_compliance"
  ON operators_compliance FOR SELECT
  USING (operator_id = auth.uid());

CREATE POLICY "operator_upsert_own_compliance"
  ON operators_compliance FOR INSERT
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "operator_update_own_compliance"
  ON operators_compliance FOR UPDATE
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());

-- Admin ve todo
CREATE POLICY "admin_full_operators_compliance"
  ON operators_compliance FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- Funcion: can_operator_sell(operator_id)
-- ============================================================
-- Llamada antes de permitir publicar tour o aceptar booking.
-- Retorna razon especifica del bloqueo (UI muestra al operador que falta).
CREATE OR REPLACE FUNCTION public.can_operator_sell(p_operator_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row operators_compliance;
  v_blockers TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_row FROM operators_compliance WHERE operator_id = p_operator_id;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('can_sell', false, 'blockers', ARRAY['onboarding_no_iniciado']);
  END IF;

  IF v_row.rnt_number IS NULL THEN v_blockers := array_append(v_blockers, 'rnt_faltante'); END IF;
  IF v_row.rnt_validated_at IS NULL THEN v_blockers := array_append(v_blockers, 'rnt_no_validado'); END IF;
  IF v_row.rnt_expires_at IS NOT NULL AND v_row.rnt_expires_at <= now() THEN
    v_blockers := array_append(v_blockers, 'rnt_vencido');
  END IF;
  IF v_row.rut_number IS NULL THEN v_blockers := array_append(v_blockers, 'rut_faltante'); END IF;
  IF v_row.rut_pdf_url IS NULL THEN v_blockers := array_append(v_blockers, 'rut_pdf_faltante'); END IF;
  IF v_row.habeas_data_accepted_at IS NULL THEN v_blockers := array_append(v_blockers, 'habeas_data_no_aceptado'); END IF;

  RETURN jsonb_build_object(
    'can_sell', cardinality(v_blockers) = 0,
    'blockers', v_blockers,
    'rnt_expires_at', v_row.rnt_expires_at
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.can_operator_sell TO authenticated, service_role;
