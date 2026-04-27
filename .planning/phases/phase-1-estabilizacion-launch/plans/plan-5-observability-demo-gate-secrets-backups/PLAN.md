# Plan 5: observability-demo-gate-secrets-backups

**Phase:** 1 (Estabilizacion launch)
**Status:** Not started
**Estimated effort:** 4-5 dias
**Depends on:** Plan 1 (CI ya existe para integrar Sentry source maps). **Puede correr paralelo a Plan 2-4** porque toca archivos disjuntos mayormente.
**Created:** 2026-04-27

## Goal

Cuando algo se rompa en prod, lo vemos. Si Supabase pierde data, la recuperamos. Demo mode no se filtra a usuarios reales. Bundle no mata jaladores con celulares low-end.

## Requirements covered (10)

SEC-01, SEC-02, SEC-03, OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06, MOB-12

## Deliverables

### Sentry (OBS-01, OBS-02, OBS-03, OBS-06)
- `instrumentation.ts` (raiz del repo) — setup Sentry `@sentry/nextjs ^10.50.0` compatible con Next 16 + Turbopack
- `sentry.client.config.ts` — Sentry browser
- `sentry.server.config.ts` — Sentry Node (API routes, SSR)
- `sentry.edge.config.ts` — Sentry Edge Runtime
- `beforeSend` hook que scrubs PII: `email`, `phone`, `cedula`, `rut`
- `next.config.js` — wrap con `withSentryConfig`, source maps a Sentry via Vercel integration
- Refactor de los 15 silent catches enumerados en `CONCERNS.md` item #7 → reemplazar por:
  ```typescript
  Sentry.captureException(err);
  // + UI de retry visible al usuario
  ```

### Demo gate (SEC-01, SEC-02, SEC-03)
- `lib/auth.tsx` — agregar `clearBeta()` call en `signIn` cuando detecta `token === 'beta-demo-token'` (SEC-03)
- `components/BetaGate.tsx` — gate por `process.env.NEXT_PUBLIC_BETA_MODE === '1'`; si no, render `null` (SEC-02)
- `components/Layout.tsx` — banner rojo no-dismissable cuando `isBetaActive() && process.env.NODE_ENV === 'production'` (SEC-01):
  ```
  ⚠️ MODO DEMO — Los pagos no son reales
  ```
- `pages/login.tsx` — **REMOVER** bloque "Acceso rapido DEV" lineas 292-310

### Backups (OBS-05)
- **MANUAL:** upgrade Supabase a Pro ($25/mes) para PITR
- `.github/workflows/backup.yml` — cron weekly:
  ```yaml
  schedule: '0 3 * * 0'  # domingos 3am UTC
  ```
  Hace `pg_dump` → R2/S3 encriptado, retencion 90 dias
- `scripts/restore-test.sh` — script para `pg_restore` mensual en instancia secundaria
- `docs/restore-log.md` — log de restores ejecutados (manual update post-restore)

### Monitoring (OBS-04)
- `pages/api/health.ts` — endpoint nuevo que retorna:
  ```json
  { "db": "ok", "wompi": "ok", "ts": "2026-04-27T..." }
  ```
- `docs/uptimerobot.md` — config de monitores:
  - Homepage `https://tourmarta-web.vercel.app/`
  - API health `/api/health`
  - Webhook endpoint Supabase
  - Alerta WhatsApp + email si cae > 2 min

### Performance (MOB-12)
- `.github/workflows/lighthouse.yml` — lighthouse mobile slow 4G **bloqueante** con score >= 80 en `/explorar`

### Tests
- `tests/e2e/sentry-test-event.spec.ts` — throw error en pagina de prueba, verificar evento en Sentry
- `tests/e2e/beta-gate.spec.ts` — env stub sin `NEXT_PUBLIC_BETA_MODE=1` verifica que BetaGate NO se renderiza
- `tests/e2e/health-endpoint.spec.ts` — `/api/health` retorna 200 con shape correcto

## Success Criteria

1. Throwear `new Error('test')` en `pages/explorar.tsx` aparece en Sentry dashboard < 1 min con stack trace mapped a source.
2. Sentry event NO contiene `email`, `phone`, `cedula` (verificar con event inspect manual).
3. UptimeRobot muestra 3 monitores green; alerta WhatsApp/email si cae > 2 min.
4. Restore mensual exitoso desde dump propio a instancia secundaria (registro en `docs/restore-log.md`).
5. En prod sin `NEXT_PUBLIC_BETA_MODE=1`, BetaGate NO se renderiza (test Playwright lo verifica con env stub).
6. Lighthouse CI bloquea PR si score mobile < 80 en `/explorar`.

## Test Gates

Sentry test event verde + restore manual ejecutado + Lighthouse CI verde.

## Key Risks

- **CRITICAL #4** Demo leak → mitigado por env gate + banner persistente + token cleanup en signIn
- **CRITICAL #19** Backup no probado → mitigado con Supabase Pro PITR + dump propio + restore mensual
- **HIGH #17** Bundle low-end → mitigado con lighthouse gate >= 80

**Riesgo tecnico:**
- `@sentry/nextjs ^10.50.0` aun puede tener edge cases con Next 16 + Turbopack — probar en staging primero. Fallback: `@sentry/node` + manual instrumentation suma 1 dia al plan.

## Implementation Notes

- Sentry Vercel integration es la forma mas facil de configurar source maps. Aprovechar que el deploy ya esta en Vercel.
- Banner del demo mode debe estar en el `Layout.tsx` envolvente, no en cada pagina. Verificar que no se filtre en `/api/*` routes (no aplica ahi).
- `clearBeta()` debe limpiar TODO: cookies, localStorage, sessionStorage, y la prop `betaToken` de `useAuth()`.
- Backup script debe usar `pg_dump --format=custom` para que el restore sea selective. NO usar `--format=plain` para databases > 100MB.
- Restore mensual puede ser en una instancia local de PostgreSQL, no necesita ser otra Supabase. Solo verificar que aplica clean.
- UptimeRobot Free tier permite 50 monitores con check cada 5 min. Suficiente para Phase 1.
- Lighthouse CI requiere config de URLs base. Apuntar al deploy de Vercel preview de cada PR.

## Open Questions

- **Sentry tier:** Developer ($26/mes) vs Free (5K events/mes). Para Phase 1 con poco trafico, Free alcanza. Upgrade cuando volumen lo justifique.
- **Backup destination:** R2 ($0.015/GB-month) vs S3 vs B2. Recomendado R2 (Cloudflare) por egress gratis si necesitamos restaurar a multiples destinos.
- **Encryption del dump:** GPG con key en env var, o passphrase fija? Recomendado GPG con keypair generado para este proyecto.

## Definition of Done

- [ ] Sentry capturando errores con PII scrubbed
- [ ] BetaGate + banner funcionando con env gate
- [ ] Login.tsx sin bloque DEV de acceso rapido
- [ ] 15 silent catches refactoreados a Sentry.captureException
- [ ] Backup workflow corriendo y restore probado
- [ ] UptimeRobot configurado con 3 monitores + alerta
- [ ] `/api/health` endpoint funcional
- [ ] Lighthouse CI gate bloqueante en PRs
- [ ] **MANUAL:** Supabase upgrade a Pro
- [ ] PR mergeada a `main`

---
*Plan 5 creado: 2026-04-27*
