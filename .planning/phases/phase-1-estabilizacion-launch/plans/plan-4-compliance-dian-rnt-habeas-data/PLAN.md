# Plan 4: compliance-dian-rnt-habeas-data

**Phase:** 1 (Estabilizacion launch)
**Status:** Not started
**Estimated effort:** 5-7 dias (incluye tramites externos que el dev no controla)
**Depends on:** Plan 2 (necesita el webhook funcionando y RPC `create_booking` para enganchar el call a Alegra/Siigo despues de pago confirmado)
**Created:** 2026-04-27

## Goal

La Perla puede operar legal en Colombia. Sin esto, cobrar plata real es exposicion a sancion DIAN/SIC. **Modelo B** (operador factura turista, La Perla solo factura su fee al operador) porque es mas simple y aprovecha que el operador ya tiene RUT.

## Requirements covered (7)

CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07

## Deliverables

### DIAN factura electronica
- `lib/invoicing.ts` — wrapper Alegra (default) o Siigo:
  ```typescript
  createInvoice(bookingId, operatorRut, items): Promise<{invoiceId, pdfUrl}>
  ```
- `supabase/functions/wompi-webhook/index.ts` — agregar paso post-`process_wompi_event`: encolar invoice via cron table `pending_invoices` (NO inline para mantener < 3s response)
- `supabase/functions/issue-invoice/index.ts` — Edge Function corrida por `pg_cron` cada 5 min que toma de `pending_invoices` y emite via Alegra
- `supabase/migrations/008_pending_invoices.sql` — tabla `pending_invoices(booking_id, status, attempts, last_attempt_at, error)`

### Habeas Data (CMP-02, CMP-03, CMP-04)
- `pages/politica-de-datos.tsx` — texto legal completo Habeas Data segun template SIC:
  - Finalidad del tratamiento
  - Derechos del titular (acceso, actualizacion, supresion)
  - Contacto del responsable (La Perla)
  - Vigencia y modificaciones
- `pages/register.tsx` y `pages/dashboard/operator/onboarding.tsx` — checkbox **NO pre-marcado**:
  ```
  ☐ Acepto el tratamiento de mis datos segun la [Politica de Privacidad]
  ```
- `docs/rnbd-tramite.md` — checklist del tramite RNBD ante SIC (proceso humano que el dev arranca dia 1 de este plan)

### RNT validacion (CMP-05, CMP-06)
- `lib/rnt.ts` — `validateRNT(rntNumber)` que llama:
  ```
  https://rntsiturweb.mincit.gov.co/...
  ```
  Retorna `{ valid, expiresAt, operatorName }`
- `pages/dashboard/operator/onboarding.tsx` — bloqueante:
  - Pide RNT + RUT + cuenta bancaria
  - Valida RNT contra MinCIT antes de permitir publicar tours
- `supabase/migrations/009_operators_compliance.sql` — agregar columnas:
  ```sql
  operators(rnt_number, rnt_validated_at, rnt_expires_at, rut_pdf_url, bank_account_encrypted)
  ```

### T&C jalador (CMP-07)
- `pages/terminos.tsx` — T&C que distinguen al jalador como **independent commission agent**, NO empleado, con clausula explicita
- **Manual:** abogado especialista revisa y firma T&C (NO ChatGPT, NO research web)

### Tests
- `tests/integration/invoice-pipeline.test.ts` — booking pagado → invoice generada (mock de Alegra en CI, real en staging)
- `tests/e2e/operator-onboarding.spec.ts` — RNT invalido bloquea onboarding
- `tests/e2e/habeas-data-checkbox.spec.ts` — checkbox no esta pre-marcado en signup

## Success Criteria

1. Operador nuevo intenta publicar tour sin RNT validado, recibe error claro y link al onboarding.
2. RNT vencido bloquea publicar tour nuevo (cron diario marca `rnt_expires_at < now()`).
3. Booking pagado dispara invoice DIAN via Alegra dentro de 5 min, PDF queda guardado en `bookings.invoice_pdf_url`.
4. Checkbox de Habeas Data en signup NO esta pre-marcado (test Playwright lo verifica).
5. RNBD radicado ante SIC con numero de tramite (manual, fuera del CI pero en checklist de done).
6. T&C firmados por abogado especialista (manual, fuera del CI).

## Test Gates

Test E2E de booking → invoice generada (mock de Alegra en tests, real en staging); test que RNT invalido bloquea onboarding.

## Key Risks

- **CRITICAL #12** DIAN factura electronica omitida → Alegra/Siigo desde dia 1, Modelo B
- **HIGH #13** RNT operador ignorado → validacion API MinCIT bloqueante en onboarding
- **HIGH #14** Habeas Data → politica + checkbox NO pre-marcado + RNBD ante SIC

**Riesgos humanos (slip potencial):**
- Alegra demora 1-2 dias en activar cuenta empresarial
- Abogado especialista puede demorar 1 semana en revisar T&C
- RNBD ante SIC tarda 2-4 semanas en aprobacion (radicado da numero de tramite, eso cuenta como "done" para Phase 1)

## Implementation Notes

- **Modelo B** significa: cuando cobras $108.000 al turista, el operador factura $100.000 al turista (su parte) y La Perla factura $8.000 al operador (su fee). Dos facturas DIAN por venta. Validar con contador colombiano.
- Si volumen al inicio es bajo (< 30 ventas/mes), se puede facturar manual via Alegra UI sin la API integrada — defer CMP-01 automatico a las primeras semanas post-launch. Pero la UI del operador debe mostrar "Factura pendiente" hasta que llegue.
- API RNT MinCIT no es muy estable. Cachear validacion por 30 dias (cron diario verifica vencimiento).
- `bank_account_encrypted` debe usar `pgcrypto` con key en env var separada (no en repo). Considerar Supabase Vault si esta disponible.
- T&C deben tener clausula explicita: "El jalador es agente independiente, NO empleado. La Perla no retiene impuestos del jalador. El jalador es responsable de su propia declaracion de renta sobre comisiones recibidas."
- `pages/politica-de-datos.tsx` puede arrancar como copy-paste del template oficial SIC y luego personalizar.

## Open Questions

- **Modelo A vs B:** decidido B en este plan. Si flip a A, el plan crece a 8-10 dias (Modelo A requiere La Perla con responsabilidad 05+11 en RUT y emite N facturas/dia).
- **Alegra vs Siigo:** default Alegra. Razones: API mas simple, pricing transparente (~$60K COP/mes), webhooks mas confiables. Siigo si el contador prefiere su workflow.
- **Operador con RNT pero sin RUT?** Caso raro pero existe (RNT y RUT son tramites separados). Decision: bloquear hasta tener ambos. Sin RUT no puede facturar segun Modelo B.

## Definition of Done

- [ ] Migrations 008-009 aplicadas
- [ ] `lib/invoicing.ts` integrado con Alegra (mock en CI, real en staging)
- [ ] `lib/rnt.ts` validando contra MinCIT
- [ ] Pages politica-de-datos + terminos publicadas
- [ ] Checkbox Habeas Data NO pre-marcado en signup + onboarding
- [ ] Operator onboarding bloquea sin RNT validado
- [ ] Tests E2E + integration verdes
- [ ] **MANUAL:** RNBD radicado ante SIC (numero de tramite documentado)
- [ ] **MANUAL:** T&C firmados por abogado (PDF en `docs/legal/`)
- [ ] **MANUAL:** Cuenta Alegra activa con API key
- [ ] PR mergeada a `main`

---
*Plan 4 creado: 2026-04-27*
