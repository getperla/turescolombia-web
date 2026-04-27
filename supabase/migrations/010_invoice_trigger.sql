-- Migration 010: Trigger automatico de invoice queue al pasar booking a 'paid'
-- Plan 4: compliance-dian-rnt-habeas-data (CMP-01)
-- Created: 2026-04-27
--
-- Trigger AFTER UPDATE en bookings: cuando status cambia a 'paid', encola
-- una invoice via enqueue_invoice(). Mantiene el webhook decoupled.

CREATE OR REPLACE FUNCTION public.trigger_enqueue_invoice_on_paid()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo cuando hay un cambio real de estado a 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.enqueue_invoice(NEW.id, 'alegra');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_enqueue_invoice_on_paid ON bookings;
CREATE TRIGGER bookings_enqueue_invoice_on_paid
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.trigger_enqueue_invoice_on_paid();

COMMENT ON FUNCTION public.trigger_enqueue_invoice_on_paid IS 'Encola invoice DIAN cuando booking pasa a paid. Idempotente via UNIQUE en pending_invoices.';
