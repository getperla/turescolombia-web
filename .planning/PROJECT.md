# La Perla

## What This Is

La Perla es la plataforma que digitaliza el turismo informal de Santa Marta — la "Airbnb del turismo" para el Caribe colombiano. Conecta cuatro actores que ya existen y mueven millones en el mercado real: turistas (clientes finales), jaladores (vendedores comisionistas en la calle), operadores (agencias de tours) y la plataforma misma. El producto convierte la tiquetera física tradicional (libreta con originales y copias) en un sistema digital con trazabilidad, pagos integrados y comisiones automáticas.

## Core Value

**Cualquiera con un celular puede ganar plata vendiendo tours en Santa Marta.** Si esto no es cierto y simple en el flujo del jalador, el producto no tiene razón de existir. Todo lo demás (panel admin, reportes, marketing) es secundario.

## Requirements

### Validated

<!-- Inferido del codebase actual (Next 16 + Supabase + Wompi sandbox), pendiente de validar en producción real con usuarios y plata. -->

- ✓ Catálogo público de tours con SEO + imágenes optimizadas — `pages/explorar.tsx`, `pages/tour/[id].tsx`, sitemap dinámico
- ✓ 4 dashboards diferenciados por rol (turista, jalador, operador, admin) — `pages/dashboard/*`
- ✓ Magic-login para jaladores con refCode + WhatsApp — `pages/login.tsx`, `lib/api.ts`
- ✓ Auth multi-modo (Supabase email/password + Google OAuth + SMS OTP) — `lib/supabase.ts`, `pages/auth/callback.tsx`
- ✓ Booking flow con QR + confirmación WhatsApp por jalador (`/j/[refCode]/[tour]`)
- ✓ Operador puede crear tours, gestionar disponibilidad, ver reservas
- ✓ Admin puede aprobar/suspender operadores y jaladores
- ✓ Comisión 20% al jalador hardcodeada en cálculo de catálogo
- ✓ Modo demo (BetaGate + mockData.ts) para showroom sin backend real
- ✓ Headers de seguridad, .env fuera de git, branding consistente "La Perla"

### Active

<!-- Lo que viene en el próximo milestone post-launch del 26 abril. El usuario respondió "todo" a las 4 opciones de scope, así que esto se va a dividir en fases secuenciadas dentro de un milestone macro. -->

**Estabilización de launch (semanas 1-3 post-launch):**
- [ ] Wompi en producción real (sacar sandbox key) con flujo de pago end-to-end
- [ ] Apagar/proteger demo mode antes de indexación pública (banner visible o gate por env)
- [ ] Monitoring + error tracking (Sentry o equivalente) y observabilidad básica
- [ ] Smoke test del flujo crítico booking → pago → confirmación con plata real
- [ ] Comisión configurable por tour/operador (no hardcodeada al 20%)
- [ ] Definir fee de La Perla sobre la venta y reflejarlo en el cálculo (% por encima de la comisión del jalador)

**Crecimiento + onboarding masivo (semanas 4-7):**
- [ ] Funnel de registro de jalador en < 60 segundos (sin fricción)
- [ ] Material de captación: link compartible con WhatsApp para reclutar más jaladores
- [ ] Dashboard de jalador con tarjetas motivacionales + gamificación de comisiones
- [ ] Sistema de referidos jalador → jalador (multinivel ligero)
- [ ] Onboarding del operador: subir tour completo (fotos, precios, disponibilidad) en < 10 min

**Marketplace v2 (semanas 6-10, paralelo a crecimiento):**
- [ ] Búsqueda + filtros avanzados en explorar (por zona, duración, precio, rating)
- [ ] Sistema de reviews verificadas (solo quien reservó puede calificar)
- [ ] Ranking de jaladores por ventas + score de reputación visible
- [ ] Disponibilidad de tours por fecha con cupos (no oversell)
- [ ] Cancelaciones, reagendamientos y políticas de reembolso

**App móvil nativa (mes 3-5):**
- [ ] iOS + Android con stack a definir (React Native vs Flutter vs PWA reforzada)
- [ ] Push notifications para jalador (nueva venta, comisión cobrada, etc.)
- [ ] Compartir tour por link directo desde app a WhatsApp/Instagram
- [ ] Modo offline básico para áreas con mala conexión (Tayrona, Sierra Nevada)
- [ ] Acceso al sistema de pagos en la app (sin browser redirect)

### Out of Scope

- **Reservas fuera de Santa Marta y la región del Magdalena** — el negocio se construye desde el conocimiento empírico local; expansión geográfica es decisión post-validación de tracción
- **Marketplace internacional / multi-idioma EN/PT/etc.** — público v1 es turista hispanohablante; inglés se considera v2 si tracción lo justifica
- **Integración con OTAs (Booking, Expedia, Viator)** — La Perla compite con la informalidad de la calle, no con OTAs corporativas
- **Tours fuera de Colombia** — fuera del thesis de "turismo empírico samario"
- **Tarjetas físicas / POS hardware** — el celular es el único device; el modelo de jalador con tiquetera física se reemplaza por la app, no se complementa
- **Crypto / pagos no fiat** — fricción innecesaria para el público objetivo

## Context

**Mercado y tesis:**
- Santa Marta recibe ~4M turistas/año + público local. El mercado actual ya factura millones, ya está organizado, ya está vendiendo con tiqueteras de papel.
- El insight central es que **el negocio no hay que crearlo, hay que digitalizarlo**. Modelo análogo a Airbnb, pero específico para turismo regional informal.
- Santa Marta es una ciudad con alta informalidad económica; muchos samarios prefieren vivir de comisiones que de empleo formal porque genera más ingreso.
- Ejemplo del modelo (del brief): un menú de restaurante de $30.000 lo vende un jalador en la calle y se gana $5.000 de comisión. La Perla replica ese patrón pero con tours: precio público, comisión clara al intermediario, trazabilidad digital.

**Estado del producto:**
- **Launch beta: 2026-04-26 (mañana)**. Web app en `tourmarta-web` deployado en Vercel.
- Stack actual: Next.js 16.2.4 (Pages Router + Turbopack), React 18, Tailwind 4, Supabase (auth + futura data), Wompi (pagos sandbox), TypeScript 5.5.
- Backend legacy en Render (`turescolombia-api.onrender.com`) sirve data de tours/bookings; migración progresiva a Supabase está en curso.
- Codebase mapeado en `.planning/codebase/` con auditoría de concerns activa.
- Cero tests, cero CI gate de testing — gap reconocido y diferido post-launch.
- Branding migró de "TuresColombia" → "La Perla"; quedan referencias técnicas en `localStorage` keys (`turescol_*`) que NO se cambian para no romper sesiones existentes.

**Modelo de monetización (decidido en este sesión):**
- La Perla cobra **comisión sobre la venta** — % del precio del tour cobrado al cliente.
- Jalador conserva su comisión actual (~20%); operador conserva el resto menos el fee de La Perla.
- % exacto a definir en research/requirements pero por defecto se asume 5-10% sobre venta bruta.

**Equipo y forma de trabajo:**
- Operación de un solo dev (Juan Vergel — Juanda) con asistencia de agentes Claude Code.
- Idioma de trabajo: español colombiano informal; commits en español, código y comentarios en español sin tildes (convención observada).
- Workflow: GSD modo YOLO con commits atómicos, fases secuenciadas, planning docs versionados.

## Constraints

- **Timeline**: Launch beta el 2026-04-26 ya está en pie. Estabilización urgente las primeras 2-3 semanas. Resto del milestone se distribuye en 4-5 meses.
- **Tech stack**: Next.js 16 + Supabase + Vercel + Wompi (Colombia). Cambios de stack requieren justificación fuerte — la base es sólida y reciente.
- **Budget**: Desconocido formalmente; asumir restricciones de bootstrap. Servicios SaaS deben ser gratis o muy baratos (Vercel Hobby, Supabase Free → Pro cuando justifique, Wompi sin minimum monthly).
- **Localización**: Producto pensado 100% para Santa Marta + región Magdalena en v1. Geografía y moneda fijas (COP).
- **Equipo**: 1 dev. No hay PM, QA, designer dedicado. Diseño y QA los hace el dev con apoyo de IA.
- **Compliance**: Pagos requieren cumplir con regulación financiera colombiana (Wompi se encarga del KYC del operador, pero La Perla debe tener claros los términos de servicio y manejo de fondos).
- **Sin tests**: Coverage actual es 0%. Cualquier feature nuevo en este milestone debe nacer con tests al menos del flujo crítico.

## Key Decisions

| Decisión | Racional | Outcome |
|----------|----------|---------|
| Modo de monetización: comisión % sobre venta | Alineado con el modelo del jalador-restaurante del brief; mantiene incentivo del operador y del jalador, La Perla gana solo cuando hay venta real | — Pending |
| Scope macro: estabilización + crecimiento + marketplace v2 + app móvil | Usuario respondió "todo" a las 4 opciones; se estructura en 4 fases secuenciadas dentro de un milestone | — Pending |
| Granularity de fases: standard (5-8) | Coarse no alcanza para cubrir 4 áreas grandes; fine es overkill | — Pending |
| Workflow: research + plan-check + verifier ON | Producto va a manejar plata real (Wompi en prod) — el costo extra de validación es barato comparado con un bug en pago | — Pending |
| Mantener stack actual (Next 16 + Supabase) | Recién upgradeado por sesión paralela; cambiar stack ahora pierde el trabajo de Claude Design y suma riesgo pre-launch | ✓ Good |
| BetaGate "demo mode" se mantiene pero detrás de gate | Decisión de Claude Design para showroom; se preserva en arquitectura pero requiere banner + protección antes de indexación | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after initialization (brownfield — codebase ya mapeado en `.planning/codebase/`)*
