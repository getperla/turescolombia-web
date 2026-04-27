# Plan 2: wompi-prod-webhook-idempotente

**Phase:** 1 (Estabilizacion launch)
**Status:** Not started
**Estimated effort:** 6-7 dias
**Depends on:** Plan 1 (necesita `webhook_events`, `bookings`, `booking_status_history`, `commission_ledger` y RLS para que el Edge Function escriba con `service_role`)
**Created:** 2026-04-27

## Goal

La plataforma puede cobrar con plata real, el webhook es exactly-once, el booking solo cambia estado via RPC server-side. Este plan es el corazon de "estamos cobrando legal".

## Requirements covered (12)

PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-09, BKG-02, BKG-04, BKG-05, TST-04

## Deliverables

### Code changes
- `lib/wompi.ts` — sacar `SANDBOX_KEY` hardcoded, leer de env, soportar PSE/Nequi/Daviplata/tarjeta
- `pages/api/wompi/sign.ts` — firma SHA256 server-side con formula oficial (`reference + amount + currency + integrity_secret`)
- `pages/pago-resultado.tsx` — refactor: redirect URL solo muestra estado provisional, la verdad viene del webhook (poll `bookings.payment_status` con backoff)
- `pages/tour/[id].tsx` y `pages/j/[refCode]/[tour].tsx` — verificar fix `priceChild ?? priceAdult * 0.7` (BKG-05) con test de regresion

### Edge Function
- `supabase/functions/wompi-webhook/index.ts` — Edge Function que:
  1. Valida `X-Event-Checksum`
  2. INSERT en `webhook_events ON CONFLICT DO NOTHING`
  3. Si conflict → retorna 200 inmediato (idempotencia)
  4. Si no conflict → llama RPC `process_wompi_event(event_id)`
  5. Responde 200 < 3s

### Migrations
- `supabase/migrations/004_rpc_create_booking.sql` — `create_booking()` SECURITY DEFINER que valida + inserta booking + accrual en una transaccion
- `supabase/migrations/005_rpc_update_booking_status.sql` — `update_booking_status()` con state machine y registro en `booking_status_history`

### State Machine
```
pending → paid → confirmed → completed → reviewed
   ↓       ↓        ↓           ↓
canceled refunded canceled disputed
```
Transiciones invalidas (ej `pending → completed` directo) deben fallar con error claro.

### Tests
- `tests/e2e/booking-flow.spec.ts` — Playwright del flujo `/tour/[id]` → checkout Wompi sandbox → webhook → confirmacion
- `tests/integration/webhook-idempotency.test.ts` — enviar mismo `event_id` 2x, verificar `count(bookings)=1` y `count(commission_ledger WHERE entry_type='accrual')=1`
- `tests/integration/booking-state-machine.test.ts` — todas las transiciones validas + 3-5 invalidas

## Success Criteria

1. Pago real (no sandbox, $5.000 COP de prueba con tarjeta personal) llega a Wompi prod, dispara webhook, booking pasa a `paid`, ledger tiene 1 `accrual` entry.
2. Test de idempotencia verde en CI: webhook duplicado = 0 side effects extra.
3. Cerrar el browser despues del checkout NO impide la confirmacion (webhook es la fuente de verdad).
4. Webhook responde 200 en p95 < 3s (medido con `performance.now()` en Edge Function).
5. `update_booking_status` rechaza transiciones invalidas con error claro.
6. E2E Playwright `booking-flow.spec.ts` corre verde en CI antes de cada deploy a main.

## Test Gates

E2E booking flow + idempotency test + state machine test verdes; smoke test manual con plata real ($5.000 COP) ANTES de marcar done.

## Key Risks

- **CRITICAL #2** Wompi sin idempotencia → mitigado por `webhook_events` UNIQUE(event_id) + checksum validation antes de side effects + responder 200 < 3s

## Implementation Notes

- Validar formula `X-Event-Checksum` contra `https://docs.wompi.co/docs/colombia/eventos/` AL MOMENTO de implementar (la formula puede cambiar entre minor versions de la doc).
- Wompi prod requiere KYC empresarial aprobado. Si la cuenta aun esta en revision, este plan se bloquea. Validar dia 1.
- Edge Function debe usar `service_role` key — NO el anon key. Confirmar que el deploy de Supabase Edge Functions tiene la env var seteada.
- El RPC `process_wompi_event(event_id)` deberia ser idempotente por si misma — si lo llaman 2 veces con el mismo event_id, no debe duplicar side effects. Doble proteccion (UNIQUE en webhook_events + idempotencia en RPC).
- Considerar agregar `webhook_events.processed_at` para distinguir "recibido pero no procesado" vs "procesado exitosamente".

## Open Questions

- **Wompi Cloud Functions vs Webhook URL:** Wompi soporta ambos. Recomendado webhook URL apuntando a Edge Function de Supabase (mantiene atomicidad con DB).
- **Retry policy:** Wompi reintenta webhook cada X segundos durante Y minutos. Asegurar que el endpoint nunca retorne 5xx en exito real (solo en errores genuinos de procesamiento).
- **Refunds via API:** PAY-08 (refund automatico) esta en Phase 3, pero deberia el RPC `update_booking_status` ya soportar transicion `paid → refunded` con un placeholder vacio para refund_id? Decision: si, pero sin disparar API call de Wompi.

## Definition of Done

- [ ] Migrations 004-005 aplicadas
- [ ] Edge Function deployed y verificada con curl synthetic test
- [ ] `lib/wompi.ts` sin SANDBOX_KEY hardcoded
- [ ] Tests E2E + idempotency + state machine verdes en CI
- [ ] Smoke test con plata real ($5.000 COP) exitoso, registro en `docs/smoke-tests.md`
- [ ] PR mergeada a `main`

---
*Plan 2 creado: 2026-04-27*
