# Requirements: La Perla

**Defined:** 2026-04-25
**Core Value:** Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.

## v1 Requirements

Requirements para el milestone post-launch. Categorias derivadas de `research/FEATURES.md`. Cada uno mapea a exactamente una fase del roadmap (ver Traceability).

### Pagos & Wompi (PAY)

- [ ] **PAY-01**: Wompi en produccion con keys reales (sacar `SANDBOX_KEY` hardcoded de `lib/wompi.ts:18`)
- [ ] **PAY-02**: Endpoint server-side `/api/wompi/sign` calcula integrity SHA256 con formula oficial (`reference + amount + currency + integrity_secret`)
- [ ] **PAY-03**: Webhook `wompi-webhook` como Supabase Edge Function valida `X-Event-Checksum` antes de cualquier side effect
- [ ] **PAY-04**: Tabla `webhook_events` con `PRIMARY KEY = event_id` o `UNIQUE(checksum, timestamp)` para idempotencia exactly-once
- [ ] **PAY-05**: Webhook responde 200 en menos de 3 segundos; side effects pesados se delegan a triggers o cron
- [ ] **PAY-06**: Soporte de medios de pago Colombia: PSE, Nequi, Daviplata, tarjeta credito/debito
- [ ] **PAY-07**: Pago redirect URL nunca es fuente de verdad — booking.payment_status solo se actualiza desde webhook
- [ ] **PAY-08**: Refund flow funcional via API Wompi con evento `transaction.refunded` o `transaction.updated VOIDED`
- [ ] **PAY-09**: Test E2E del flujo booking → pago real (no sandbox) verde antes de declarar Wompi prod listo

### Booking & Estado (BKG)

- [ ] **BKG-01**: Booking status machine completa: `pending → paid → confirmed → completed → reviewed`, con ramas `canceled / refunded / disputed`
- [ ] **BKG-02**: Transiciones de estado solo via RPC `update_booking_status` (no UPDATE directo desde cliente)
- [ ] **BKG-03**: Cada transicion registra `booking_status_history(booking_id, from_status, to_status, actor, timestamp, reason)`
- [ ] **BKG-04**: RPC `create_booking` SECURITY DEFINER valida stock disponible + crea booking + accruals en una sola transaccion
- [ ] **BKG-05**: Bug fix `priceChild ?? priceAdult * 0.7` aplicado en pages/tour/[id].tsx y pages/j/[refCode]/[tour].tsx (ya hecho — verificar coverage de regresion)

### Comisiones & Ledger (COM)

- [ ] **COM-01**: Tabla `commissions(id, tour_id, jalador_pct, platform_pct, operator_pct, effective_from)` reemplaza el 20% hardcoded
- [ ] **COM-02**: Admin UI para editar % de comision por tour o por operador
- [ ] **COM-03**: Tabla `commission_ledger(id, booking_id, jalador_id, entry_type, amount, created_at)` immutable, INSERT-only
- [ ] **COM-04**: Tipos de entrada del ledger: `accrual` (al pagar), `release` (post hold-period), `reversal` (refund)
- [ ] **COM-05**: Cron `commission-release` corre cada hora via `pg_cron`, libera comisiones con `tour_date + 24h <= now()`
- [ ] **COM-06**: Refund crea reversal entry; si la comision ya estaba released, permite saldo negativo del jalador hasta -$50K COP
- [ ] **COM-07**: Materialized view `jalador_balances(jalador_id, pending, available, paid, lifetime)` refrescada cada 15 min
- [ ] **COM-08**: Platform fee 5-10% sobre venta bruta integrado en checkout math y reflejado en ledger

### Compliance & Legal (CMP)

- [ ] **CMP-01**: DIAN factura electronica integrada via Alegra o Siigo (Modelo B: operador factura turista; La Perla solo factura su fee al operador)
- [ ] **CMP-02**: Politica Habeas Data publicada en `/politica-de-datos` con mecanismo de retiro de consentimiento
- [ ] **CMP-03**: Checkbox de consentimiento de datos NO pre-marcado en signup turista, jalador y operador
- [ ] **CMP-04**: RNBD (Registro Nacional de Bases de Datos) tramitado ante SIC antes de indexacion publica
- [ ] **CMP-05**: Validacion RNT del operador contra API `rntsiturweb.mincit.gov.co` en onboarding (bloqueante)
- [ ] **CMP-06**: Captura de RUT + cuenta bancaria + RNT del operador como parte del onboarding
- [ ] **CMP-07**: T&C distinguen jalador como independent commission agent (NO empleado), revisado con abogado

### Auth & Seguridad (SEC)

- [ ] **SEC-01**: Demo mode tiene banner persistente NO dismissable cuando `isBetaActive() && NODE_ENV === 'production'`
- [ ] **SEC-02**: Demo mode requiere env gate `NEXT_PUBLIC_BETA_MODE === '1'` para activarse en prod
- [ ] **SEC-03**: `lib/auth.tsx` limpia `turescol_token === 'beta-demo-token'` al ejecutar real `signIn`
- [ ] **SEC-04**: Audit RLS: `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity = false` retorna 0
- [ ] **SEC-05**: Tests automatizados de aislamiento por tenant en CI (operador A no ve bookings de B)
- [ ] **SEC-06**: Acceso al `service_role` key restringido a Edge Functions; nunca en API routes Next ni en cliente
- [ ] **SEC-07**: Cookie `lp_ref` HttpOnly Secure SameSite=Lax para atribucion de jalador, expira a 30 dias

### Observabilidad (OBS)

- [ ] **OBS-01**: Sentry @sentry/nextjs ^10.50.0 integrado con `instrumentation.ts` para Next 16 + Turbopack
- [ ] **OBS-02**: Source maps subidos automaticamente a Sentry via Vercel integration
- [ ] **OBS-03**: PII scrubbing configurado en Sentry (email, telefono, RUT)
- [ ] **OBS-04**: UptimeRobot monitorea homepage + API health + webhook endpoint
- [ ] **OBS-05**: Backups Supabase: upgrade a Pro ($25/mes) para PITR + pg_dump semanal a S3/R2 + restore mensual probado
- [ ] **OBS-06**: Reemplazar 15+ silent catches del codebase con logging via Sentry

### Data Layer Migration (DAT)

- [ ] **DAT-01**: Schema canonico en Supabase migrations: `tours`, `bookings`, `tour_availability`, `reviews`, `users/profiles`, `commission_ledger`, `payouts`, `webhook_events`, `device_tokens`
- [ ] **DAT-02**: RLS policies para 4 roles (tourist, jalador, operator, admin) en cada tabla con tenant isolation
- [ ] **DAT-03**: Wrappers en `lib/queries/` envuelven todas las llamadas a Supabase; UI nunca llama `supabase.from()` directo
- [ ] **DAT-04**: Cutover por dominio: catalog read primero, despues bookings con doble-escritura por 1 semana, despues resto
- [ ] **DAT-05**: Render legacy API apagado al cierre de Fase 2; ningun fetch desde el frontend a `turescolombia-api.onrender.com`
- [ ] **DAT-06**: ISR `revalidate: 300` en `/explorar` y `/tour/[slug]` para SEO sin sacrificar frescura
- [ ] **DAT-07**: Supabase Realtime channels para jalador dashboard (nueva venta) y operator dashboard (nuevo booking) — NO polling
- [ ] **DAT-08**: Token unificado: solo `supabase.auth.getSession()` como fuente de verdad; localStorage `turescol_token` legacy solo para compat

### Onboarding & Crecimiento (GRO)

- [ ] **GRO-01**: Signup jalador en menos de 60 segundos: phone-only + WhatsApp magic-link, sin email, sin contraseña, sin foto
- [ ] **GRO-02**: KYC del jalador (cedula, cuenta) diferido al primer payout, no al signup
- [ ] **GRO-03**: Pre-load 3 tours starter al jalador recien signed up para que tenga link para compartir desde el minuto 1
- [ ] **GRO-04**: Boton "Compartir por WhatsApp" en cada tour del dashboard de jalador con texto pre-llenado + refCode
- [ ] **GRO-05**: Live ticker "ganadores hoy" en homepage (social proof) con 5 jaladores top del dia
- [ ] **GRO-06**: Onboarding del operador: subir tour completo (fotos, precios, disponibilidad) en menos de 10 minutos
- [ ] **GRO-07**: Cookie `lp_ref` capturada en landing y persistida en `bookings.jalador_ref_id` (NOT NULL si fluyo via /j/)

### Marketplace v2 (MKT)

- [ ] **MKT-01**: Postgres FTS con extension `unaccent` + dictionary `spanish_unaccent` + columna `tsvector` generated stored + GIN index
- [ ] **MKT-02**: RPC `search_tours(q, filters)` ranked por similitud + popularidad
- [ ] **MKT-03**: Filtros UI: precio, duracion, fecha disponible, group size, zona (Tayrona/Sierra/Centro/Playas)
- [ ] **MKT-04**: Reviews verificadas booking-gated (solo quien tiene `bookings.status = 'completed'` puede calificar)
- [ ] **MKT-05**: Reviews bidireccionales: turista califica tour + jalador (publico); operador califica turista (privado, solo admin lo ve)
- [ ] **MKT-06**: Tabla `tour_availability(tour_id, date, slots_total, slots_remaining)` con atomic decrement en `create_booking`
- [ ] **MKT-07**: Operador define cupo maximo por dia y blackout dates desde su dashboard
- [ ] **MKT-08**: 3 tiers de cancellation policy (Flexible, Moderada, Estricta) seleccionables por tour, con timing definido
- [ ] **MKT-09**: Self-service cancel + refund automatico via API Wompi siguiendo la policy elegida
- [ ] **MKT-10**: Dispute open + admin queue para casos no cubiertos por policy
- [ ] **MKT-11**: Ranking publico de jaladores por ventas + score de reputacion en `/jaladores`
- [ ] **MKT-12**: Auto-confirm vs request-to-book configurable por tour por el operador
- [ ] **MKT-13**: Badge "operador verificado" tras review manual de RNT + primera venta exitosa

### Mobile App (MOB)

- [ ] **MOB-01**: Conversion del repo `tourmarta-web` a monorepo Turborepo + pnpm workspaces (`apps/web`, `apps/mobile`, `packages/db`, `packages/types`, `packages/config`, `supabase/`)
- [ ] **MOB-02**: App movil con Expo SDK 55 (RN 0.83 + Hermes v1) compilada para iOS + Android
- [ ] **MOB-03**: Auth compartido con web via Supabase JS SDK + AsyncStorage adapter
- [ ] **MOB-04**: Push notifications para jalador: nueva venta, comision liberada, tour empieza en 3h
- [ ] **MOB-05**: Push notifications para turista: confirmacion de reserva, recordatorio dia antes
- [ ] **MOB-06**: Tabla `device_tokens(user_id, expo_token, platform, last_seen)` para targeting
- [ ] **MOB-07**: Edge Function `send-push` invoca `https://exp.host/--/api/v2/push/send`
- [ ] **MOB-08**: Modo offline basico: ticket de reserva visible sin red (TanStack Query persisted + cached service worker)
- [ ] **MOB-09**: Modo QR check-in del operador: escanea `bookings.qrCode`, marca `status = 'completed'`
- [ ] **MOB-10**: Geolocation "tours cerca de ti" (opt-in) para turistas
- [ ] **MOB-11**: PWA reforzada en web (manifest, service worker, install prompt) shippeada antes de app nativa
- [ ] **MOB-12**: Lighthouse mobile slow 4G score >= 80 bloqueante en CI antes de cualquier merge a main
- [ ] **MOB-13**: Bundle JS gzipped del web < 150KB en pagina catalogo (test en Moto E o equivalente low-end)

### Testing & CI (TST)

- [ ] **TST-01**: Vitest 3 + Playwright 1.50 + @testing-library/react instalados como devDeps
- [ ] **TST-02**: E2E Playwright del flujo booking → pago corre en CI antes de cada deploy a main
- [ ] **TST-03**: Tests de RLS: simular operador A consultando bookings de operador B retorna vacio
- [ ] **TST-04**: Test de webhook duplicado: enviar mismo evento Wompi 2 veces produce 1 booking + 1 commission entry
- [ ] **TST-05**: Coverage en `lib/` > 50% al final de Fase 2; > 80% al final de Fase 3
- [ ] **TST-06**: GitHub Actions corre `tsc --noEmit` + `eslint` + `vitest run` + `playwright test` en cada PR

## v2 Requirements

Diferidos. Tracked pero NO en este milestone.

### Multinivel & Programa de Referidos
- **REF-01**: Jalador refiere a otro jalador via link unico, gana % override por sus primeras ventas
- **REF-02**: Tope de 1 nivel (no piramide), duracion 3-6 meses por referido
- **REF-03**: Validacion legal SuperSociedades especialista antes de shipping
- **REF-04**: Tablero de referidos en dashboard de jalador con ledger separado

### Pagos Avanzados
- **PAY2-01**: Cuotas Wompi para turistas (installments)
- **PAY2-02**: Withdraw on-demand a Nequi para jalador (no solo cierre de mes)
- **PAY2-03**: Wompi split-payment nativo si Wompi lo soporta para nuestro volumen

### Internacionalizacion
- **I18N-01**: Bilingual EN/ES (solo si > 20% trafico no-spanish post-launch)
- **I18N-02**: Locale switching desde header
- **I18N-03**: Email/WhatsApp templates en EN

### Discovery Avanzado
- **DSC-01**: Map view de tours con pines geograficos
- **DSC-02**: Saved searches con WhatsApp alert cuando aparece nuevo match
- **DSC-03**: Recomendaciones personalizadas basadas en historial (post cold-start, > 1000 bookings)

### DIAN Avanzado
- **DAN-01**: Modelo A factura (La Perla factura al turista, paga operador con factura propia) si volumen lo justifica
- **DAN-02**: PDF descargable retroactivo de factura para turista

## Out of Scope

Excluidos explicitamente. Documentados para prevenir scope creep.

| Feature | Reason |
|---------|--------|
| In-app messaging tourist↔operator | WhatsApp deeplink resuelve 95% de casos sin support burden propio |
| Full profile builder con bio/foto/about | Friccion sin conversion. Marketplaces probaron y nadie llena |
| KYC selfie en signup | Diferir a primer payout — friccion mata conversion de jalador |
| AI/ML personalized recommendations cold-start | Sort-by-popularity + curacion del jalador hace 90%; ML antes de tener data = noise |
| Dynamic pricing / surge | Operador no opera precios variables; erosiona trust |
| Yield-management overbooking | Catastrofico reputacionalmente en tourism |
| Crypto payments | Friccion sin volumen objetivo |
| Multi-currency checkout (USD) | El banco del turista hace FX automaticamente |
| Subscription "La Perla Plus" | Tourism es one-shot, no recurrente |
| Free-form cancellation policy text | Disputas inresolubles; tiers fijos forzan claridad |
| Public review threading (Yelp-style) | Flame wars + moderation cost |
| Tours fuera de Santa Marta + Magdalena | Foco geografico es la tesis del producto |
| Marketplace internacional | Compite con OTAs corporativas, no es nuestro nicho |
| Integracion Booking/Expedia/Viator | La Perla compite con la calle, no con OTAs |
| Tarjetas fisicas / POS hardware | El celular es el unico device |
| AR previews / background location tracking | Privacy + complejidad sin retorno claro |
| Cash-on-arrival (sin pago digital) | Mata trazabilidad y atribucion |
| Operator-managed reviews | Conflicto de interes obvio |
| Negotiation threads | Soporte burden + impuestos imprevisibles |

## Traceability

Mapping de requirements a fases. Llenado durante creacion del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAY-01 | Phase 1 | Pending |
| PAY-02 | Phase 1 | Pending |
| PAY-03 | Phase 1 | Pending |
| PAY-04 | Phase 1 | Pending |
| PAY-05 | Phase 1 | Pending |
| PAY-06 | Phase 1 | Pending |
| PAY-07 | Phase 1 | Pending |
| PAY-08 | Phase 3 | Pending |
| PAY-09 | Phase 1 | Pending |
| BKG-01 | Phase 1 | Pending |
| BKG-02 | Phase 1 | Pending |
| BKG-03 | Phase 1 | Pending |
| BKG-04 | Phase 1 | Pending |
| BKG-05 | Phase 1 | Pending |
| COM-01 | Phase 1 | Pending |
| COM-02 | Phase 1 | Pending |
| COM-03 | Phase 1 | Pending |
| COM-04 | Phase 1 | Pending |
| COM-05 | Phase 1 | Pending |
| COM-06 | Phase 1 | Pending |
| COM-07 | Phase 2 | Pending |
| COM-08 | Phase 1 | Pending |
| CMP-01 | Phase 1 | Pending |
| CMP-02 | Phase 1 | Pending |
| CMP-03 | Phase 1 | Pending |
| CMP-04 | Phase 1 | Pending |
| CMP-05 | Phase 1 | Pending |
| CMP-06 | Phase 1 | Pending |
| CMP-07 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 2 | Pending |
| OBS-01 | Phase 1 | Pending |
| OBS-02 | Phase 1 | Pending |
| OBS-03 | Phase 1 | Pending |
| OBS-04 | Phase 1 | Pending |
| OBS-05 | Phase 1 | Pending |
| OBS-06 | Phase 1 | Pending |
| DAT-01 | Phase 2 | Pending |
| DAT-02 | Phase 2 | Pending |
| DAT-03 | Phase 2 | Pending |
| DAT-04 | Phase 2 | Pending |
| DAT-05 | Phase 2 | Pending |
| DAT-06 | Phase 2 | Pending |
| DAT-07 | Phase 2 | Pending |
| DAT-08 | Phase 2 | Pending |
| GRO-01 | Phase 2 | Pending |
| GRO-02 | Phase 2 | Pending |
| GRO-03 | Phase 2 | Pending |
| GRO-04 | Phase 2 | Pending |
| GRO-05 | Phase 2 | Pending |
| GRO-06 | Phase 2 | Pending |
| GRO-07 | Phase 2 | Pending |
| MKT-01 | Phase 3 | Pending |
| MKT-02 | Phase 3 | Pending |
| MKT-03 | Phase 3 | Pending |
| MKT-04 | Phase 3 | Pending |
| MKT-05 | Phase 3 | Pending |
| MKT-06 | Phase 3 | Pending |
| MKT-07 | Phase 3 | Pending |
| MKT-08 | Phase 3 | Pending |
| MKT-09 | Phase 3 | Pending |
| MKT-10 | Phase 3 | Pending |
| MKT-11 | Phase 3 | Pending |
| MKT-12 | Phase 3 | Pending |
| MKT-13 | Phase 3 | Pending |
| MOB-01 | Phase 4 | Pending |
| MOB-02 | Phase 4 | Pending |
| MOB-03 | Phase 4 | Pending |
| MOB-04 | Phase 4 | Pending |
| MOB-05 | Phase 4 | Pending |
| MOB-06 | Phase 4 | Pending |
| MOB-07 | Phase 4 | Pending |
| MOB-08 | Phase 4 | Pending |
| MOB-09 | Phase 4 | Pending |
| MOB-10 | Phase 4 | Pending |
| MOB-11 | Phase 4 | Pending |
| MOB-12 | Phase 1 | Pending |
| MOB-13 | Phase 1 | Pending |
| TST-01 | Phase 1 | Pending |
| TST-02 | Phase 1 | Pending |
| TST-03 | Phase 1 | Pending |
| TST-04 | Phase 1 | Pending |
| TST-05 | Phase 2 | Pending |
| TST-06 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 88 total
- Mapped to phases: 88
- Unmapped: 0 ✓

**Distribucion por fase:**
- Phase 1 (Estabilizacion): 41 requirements
- Phase 2 (Data Layer + Crecimiento): 16 requirements
- Phase 3 (Marketplace v2): 14 requirements
- Phase 4 (Mobile): 11 requirements
- Cross-phase (testing infra): 6 requirements

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after initialization*
