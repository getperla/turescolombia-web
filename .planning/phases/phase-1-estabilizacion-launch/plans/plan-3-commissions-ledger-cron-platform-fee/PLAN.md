# Plan 3: commissions-ledger-cron-platform-fee

**Phase:** 1 (Estabilizacion launch)
**Status:** Not started
**Estimated effort:** 4-5 dias
**Depends on:** Plan 1 (schema `commissions`, `commission_ledger`) + Plan 2 al 70% (RPC `create_booking` ya inserta accrual)
**Created:** 2026-04-27

## Goal

Sacar el 20% hardcoded a tabla configurable, dejar el ledger funcionando con accrual/release/reversal, integrar el platform fee de La Perla en el checkout math y agendar el cron de liberacion.

## Requirements covered (5)

COM-02, COM-05, COM-06, COM-08, MOB-13

## Deliverables

### Migrations
- `supabase/migrations/006_pg_cron_release.sql` — `pg_cron` job `commission-release` cada hora que hace:
  ```sql
  INSERT INTO commission_ledger (entry_type='release', ...)
  WHERE tour_date + interval '24h' <= now()
  AND NOT EXISTS (release ya hecho)
  ```
- `supabase/migrations/007_refund_reversal_fn.sql` — funcion `process_refund(booking_id)` que:
  1. Crea reversal entry en ledger
  2. Permite saldo negativo del jalador hasta -$50.000 COP
  3. Si excede el limite, suspende al jalador hasta que cubra el saldo

### UI
- `pages/dashboard/admin/comisiones.tsx` — UI admin para editar `commissions(tour_id, jalador_pct, platform_pct, operator_pct)` sin deploy
- `components/PriceBreakdown.tsx` — componente que muestra desglose visible al turista antes del pago:
  ```
  Tour Tayrona Dia Completo:    $100.000
  Fee La Perla (8%):              $8.000
  Total a pagar:                $108.000
  ```

### Lib
- `lib/pricing.ts` — modulo nuevo con `calculateBreakdown(tourPrice, commissionRow)` que retorna:
  ```typescript
  { subtotal, platformFee, jaladorCut, operatorCut, total }
  ```
  Reemplaza math inline en `pages/tour/[id].tsx:80` y `pages/j/[refCode]/[tour].tsx:80`.

### Bundle perf (MOB-13)
- `next.config.js` — agregar bundle analyzer + script `npm run analyze`
- Verificar `< 150KB gzipped` en pagina catalogo

### Tests
- `tests/lib/pricing.test.ts` — casos: 20% jalador / 8% platform / 72% operador; edge cases `priceChild=0`, `priceChild=null`
- `tests/integration/commission-release-cron.test.ts` — dispatch sintetico del cron + verificacion de release

## Success Criteria

1. Admin cambia `jalador_pct` de 20 a 25 en un tour desde UI, proximo booking respeta 25% en `commission_ledger.amount`.
2. Refund de booking con comision ya `released` crea entry `reversal` y deja jalador en saldo negativo (verificable con suma del ledger).
3. Cron `commission-release` corre hourly y libera comisiones de tours con `tour_date + 24h <= now()`. Verificable con `SELECT * FROM cron.job_run_details`.
4. Checkout muestra desglose: `tour $100.000 + fee La Perla $8.000 = $108.000` antes del boton pagar.
5. `npm run analyze` muestra bundle catalogo gzipped < 150KB.

## Test Gates

Tests de `lib/pricing` con > 90% coverage; test de cron manual (`SELECT cron.schedule(...)` + dispatch sintetico) verde.

## Key Risks

- **HIGH #18** Refund-after-payout → mitigado con saldo negativo permitido + politica documentada
- **MEDIUM #20** Hardcoded commission → resuelto con tabla `commissions` + UI admin

## Implementation Notes

- El platform fee 8% va al precio FINAL al turista (encima del precio base). El operador recibe su precio bruto, el jalador su comision sobre el precio bruto, y La Perla cobra el fee al turista. Validar este modelo con contador antes de freezear.
- `pg_cron` requiere extension habilitada en Supabase. Verificar que el plan Pro la incluye.
- El cron de release debe ser idempotente — si corre 2 veces seguidas, no duplica entries. Usar `NOT EXISTS` clause estricto.
- `lib/pricing.ts` debe ser pure functions (no DB calls) para que sea testable sin mocks.
- Saldo negativo del jalador implica que el jalador podria tener `pending_balance < 0`. La UI del dashboard del jalador debe mostrarlo claramente con explicacion (no como bug).

## Open Questions

- **Platform fee redondeo:** $100.000 * 0.08 = $8.000 exacto. Pero $73.500 * 0.08 = $5.880 — redondear a $5.900 o dejar exacto? Decision: redondear a 100 COP arriba (UX de precios "limpios").
- **Cuando se aplica el cambio de % comision?** Si admin cambia de 20 a 25 hoy a las 3pm, los bookings de las 2pm respetan 20% (antiguo) y los de las 4pm respetan 25% (nuevo)? Implementacion: `effective_from` en la tabla, query toma el row activo al momento del booking.

## Definition of Done

- [ ] Migrations 006-007 aplicadas
- [ ] `lib/pricing.ts` con tests > 90% coverage
- [ ] Admin UI funcional para editar commissions
- [ ] PriceBreakdown component visible en checkout
- [ ] Cron release ejecutado al menos una vez exitoso (verificable en `cron.job_run_details`)
- [ ] `npm run analyze` corrido y bundle catalogo < 150KB documentado
- [ ] PR mergeada a `main`

---
*Plan 3 creado: 2026-04-27*
