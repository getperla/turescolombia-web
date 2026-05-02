# Pitfalls Research — La Perla

**Domain:** Two-sided marketplace, informal tourism economy, Wompi payments, Santa Marta (Colombia)
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH (mix of verified Colombian regulation + payment ecosystem patterns + marketplace post-mortems; LOW where it touches Wompi-specific edge cases not in public docs)

Severity legend: **CRITICAL** = breaks money flow, trust, or legal posture · **HIGH** = significant rework or churn · **MEDIUM** = correctable but expensive in time

Phase legend: **STAB** = Estabilizacion launch · **GROW** = Crecimiento + onboarding · **MKT2** = Marketplace v2 · **MOB** = App movil nativa · **ALL** = cross-cutting

---

## Critical Pitfalls

### Pitfall 1: Cold-start del lado equivocado (operadores antes que jaladores)
**Severity:** CRITICAL · **Phase:** STAB + GROW

**What goes wrong:** El equipo invierte semanas reclutando operadores con "vengan a publicar tours" antes de tener jaladores activos vendiendo. Operadores publican, no ven ventas en 2 semanas, abandonan, y la app se queda con un catalogo de zombies. Nuevos operadores ven 0 actividad y no se inscriben.

**Why it happens:** Es mas facil hablar con 10 operadores establecidos que reclutar 100 jaladores informales. Pero los operadores son el lado de oferta concentrado (poca cantidad, alta inversion) y los jaladores son el lado de demanda-de-supply (alta cantidad, sensibles a si la app funciona o no).

**How to avoid:**
- **Empezar con 3-5 operadores hand-picked y comprometidos** (no 50 operadores cualquiera) — el "manual matching" estilo Airbnb 2008. Juanda firma personalmente con cada operador inicial.
- **Primero llenar el lado del jalador** con 50+ activos en Santa Marta antes de abrir publicacion libre de tours. Rappi en Bogota empezo igual: rappitenderos primero, restaurantes despues.
- **Subsidiar la primera venta de cada jalador** con bono fijo (COP $20.000 sobre comision) durante mes 1-2.

**Warning signs:** Catalogo > 30 tours pero < 5 ventas/semana · operadores subiendo tours sin actualizar disponibilidad · jaladores que se registran y nunca generan un primer link.

**Antecedentes:** Mercado Libre y Rappi explicitamente cuentan en sus post-mortems que el primer ano fue "manual marketplace" — fundadores haciendo matchmaking a mano hasta que las dos curvas se cruzaron.

---

### Pitfall 2: Wompi en produccion sin idempotencia de webhook
**Severity:** CRITICAL · **Phase:** STAB

**What goes wrong:** Wompi envia el evento `transaction.updated` con retries automaticos si tu endpoint tarda > 10s o devuelve != 2xx. Sin un campo `event_id` (o el `transaction.id` + estado) deduplicado, terminas creando 2-3 reservas confirmadas para el mismo pago, pagando comision al jalador 2-3 veces, y emitiendo 2-3 facturas DIAN.

**Why it happens:** Documentacion de Wompi describe el formato del evento pero el dev por defecto procesa cada POST como nuevo. Bajo carga real (o latencia de Supabase), los reintentos llegan en paralelo.

**How to avoid:**
- **Tabla `wompi_events_processed`** con `event_id` UNIQUE constraint. Cada handler hace `INSERT ... ON CONFLICT DO NOTHING RETURNING id`. Si no devuelve fila, ya se proceso → return 200 inmediato.
- **Validar firma** (`X-Event-Checksum` con el `events_secret` de Wompi) antes de cualquier side effect. Sin firma valida → 401, sin tocar DB.
- **Procesar en transaccion**: marcar evento procesado + actualizar reserva + crear comision = 1 transaccion atomica. Si una falla, todas fallan, Wompi reintenta limpio.
- **Webhook handler responde 200 en < 3 segundos** — empuja trabajo pesado (notificacion WhatsApp, email) a un job async.

**Warning signs:** Misma transaccion aparece 2 veces en `bookings` table · jalador reporta "me pagaron 2 veces la misma venta" · DIAN rechaza factura por consecutivo duplicado.

**Recovery cost:** ALTO — devolver dinero a operadores doble-cobrados, reverso de comisiones, y posible incidente de cumplimiento DIAN.

---

### Pitfall 3: Atribucion de jalador disputable (cookie expira / link compartido)
**Severity:** CRITICAL · **Phase:** STAB + GROW

**What goes wrong:** Turista hace click en `/j/JUAN/tour-X`, no compra hoy, vuelve manana directo a `/tour/X` y reserva. Sin atribucion persistente, la venta no le aparece a Juan. Juan grita "yo le mande el link, donde esta mi comision". O peor: dos jaladores reclaman la misma venta.

**Why it happens:** Cookie de 1ra parte de atribucion no se setea, o se setea con duracion default de session (se borra al cerrar browser), o el turista compra desde otro device/browser.

**How to avoid:**
- **Cookie de atribucion `lp_ref` con expiracion 30 dias** (industry standard de afiliados). Se setea en el primer hit a `/j/[refCode]/*` y se persiste hasta la conversion.
- **Last-touch attribution** declarada explicitamente en T&C del jalador: gana comision el ultimo refCode que el turista vio antes de pagar. Sin ambiguedad.
- **Capturar el `ref` en el pago** como columna NOT NULL en `bookings.jalador_ref_id`. La trazabilidad queda en el booking, no solo en cookie efimera.
- **Dashboard del jalador con "tus links activos"**: cada link muestra views vs conversions. Disputa se resuelve mirando datos, no palabras.
- **Politica anti-collusion:** si turista y jalador comparten WhatsApp o IP del mismo device por > N minutos antes de pagar, marcar como "self-attribution sospechosa" y revisar manual antes de pagar comision.

**Warning signs:** Mas de 3 disputas/mes "yo le mande el link" · jaladores con CTR > 80% (probable self-click) · jalador con todas sus ventas desde el mismo IP del operador.

---

### Pitfall 4: Demo mode filtrado a usuarios reales post-launch
**Severity:** CRITICAL · **Phase:** STAB

**What goes wrong:** El sistema actual de `BetaGate` setea `localStorage.turescol_token = 'beta-demo-token'`. Un usuario que lo activo durante beta NUNCA vuelve a ver la pantalla de gate (`isBetaActive()` returns true para siempre), y queda atrapado en datos mock para siempre. Si ese usuario ya hizo registro real con email, su sesion real se sobreescribe con `fakeUser`. Operadores reales viendo dashboards con bookings ficticios. Jaladores cobrando comisiones de bookings que no existen.

**Why it happens:** Documentado en CONCERNS.md item #1. Codebase actual ya tiene este bug latente.

**How to avoid:**
- **Banner persistente "MODO DEMO — datos de prueba"** en `Layout.tsx` cuando `isBetaActive()` es true. No-dismissable. Color rojo/naranja, no se ignora.
- **Gate por env var** `NEXT_PUBLIC_BETA_MODE=true`. En produccion = false. Antes de indexar publicamente, flip el switch.
- **`lib/auth.tsx` valida en el primer login real**: si encuentra `token === 'beta-demo-token'` y el usuario intenta `signIn`, llamar `clearBeta()` antes de proceder.
- **Telemetry**: log cada vez que se renderiza el banner de demo en prod. Si hay N > 0 hits en logs de prod, alarma.
- **Remover botones "Acceso rapido DEV"** de `pages/login.tsx:292-310` antes de launch.

**Warning signs:** Bookings con `tourId` que no existen en backend real · operador llamando "yo no tengo este tour" · jalador con score sin tener ventas.

---

### Pitfall 5: Un solo operador malo derrumba la confianza del marketplace
**Severity:** CRITICAL · **Phase:** GROW + MKT2

**What goes wrong:** Operador X no aparece a un tour, deja a 8 turistas plantados en el muelle. Turistas postean en Tripadvisor / Google "ESTAFA — La Perla no respondio". Sin proceso de respuesta inmediata, la marca queda manchada por meses. Airbnb tuvo el incidente "EJ" de 2011 (departamento destrozado por huesped) que casi los hunde — lo que los salvo fue el **respuesta institucional rapida** y el `Host Guarantee`.

**Why it happens:** Con catalogo abierto, el peor operador define la percepcion publica. Y los reviews tardios no compensan el dano de redes sociales en tiempo real.

**How to avoid:**
- **Aprobacion manual de cada operador en mes 1-3**: doc legal + RNT + visita fisica si esta en Santa Marta. No autoservicio.
- **Politica de reembolso 100% inmediato** si el tour no opera, pagada por La Perla primero, luego se cobra al operador. Cero friccion para el turista.
- **WhatsApp de soporte 24/7 visible en cada confirmacion** (puede ser 1 numero de Juanda en mes 1).
- **Score de operador visible y medible**: porcentaje de "showed up", reviews, refund rate. Suspender automaticamente operadores con > 5% no-show.
- **Fondo de garantia**: retener 10-20% de los primeros 5 tours de cada operador nuevo durante 30 dias para cubrir refunds.
- **Telefono de emergencia cliente → La Perla** impreso en el QR.

**Warning signs:** Aparicion de "La Perla estafa" en Google · primer review de 1 estrella sin respuesta del operador en 24h · tasa de chargeback Wompi > 1%.

---

### Pitfall 6: Jalador esperando comision NOW vs hold period digital
**Severity:** HIGH · **Phase:** GROW

**What goes wrong:** Jalador acostumbrado a tiquetera de papel cobra cash de inmediato. La Perla retiene la comision hasta que el tour se ejecute (T+1 dia minimo) por proteccion contra refunds. Jalador: "esto es estafa, me quitan mi plata". Abandono masivo en mes 2.

**Why it happens:** Friccion cultural. La logica "te pago cuando confirmemos que el turista tomo el tour" es financieramente correcta pero culturalmente nueva.

**How to avoid:**
- **Pago instant en MVP**: aceptar el riesgo de refund-after-payout durante mes 1-3 para no romper la cultura. Solo introducir hold period despues de tener N > 50 jaladores activos y comportamiento medido.
- **Comision en 2 partes**: 50% al confirmar pago, 50% post-tour. Reduce dolor sin eliminar proteccion.
- **Pago por Nequi / Daviplata transferencia** (no cuenta de banco con tramites). Settlement < 10 minutos.
- **Tablero del jalador con saldo en tiempo real** + boton "retirar" obvio. Lo que se ve, se confia.
- **Educacion en onboarding**: video de 30 segundos explicando "esta plata es tuya, esta retenida X horas porque..."

**Warning signs:** Tasa de retencion D7 de jaladores < 30% · feedback "no me paga rapido" en encuestas · jaladores volviendo a vender con tiquetera de papel.

---

### Pitfall 7: WhatsApp Personal numero baneado por spam
**Severity:** HIGH · **Phase:** STAB + GROW

**What goes wrong:** Confirmacion de booking actualmente sale del numero personal del jalador via `wa.me` link (link con texto pre-llenado, no API oficial). A escala: turistas marcan como spam, Meta banea el numero del jalador, jalador pierde su herramienta de trabajo. Si en algun momento La Perla envia broadcasts desde su propio numero personal → ban inmediato y permanente.

**Why it happens:** `wa.me` link funciona perfecto a baja escala (usuario manda manualmente). Pero confirmaciones sistematicas, recordatorios o broadcasts requieren WhatsApp Business API oficial (pago, ~USD $0.005-0.05 por mensaje en Colombia segun categoria).

**How to avoid:**
- **Mantener `wa.me` para confirmaciones jalador-iniciadas** (el jalador hace tap en su flow, no automation desde server). Esto es OK indefinidamente porque es accion manual del usuario.
- **Para mensajes server-to-customer** (recordatorios, refunds, marketing), usar **WhatsApp Cloud API oficial via Meta** o un BSP colombiano (Treble, Wati, Twilio). Plantillas pre-aprobadas, opt-in claro, opt-out funcional.
- **Numero de WhatsApp Business verificado para La Perla** desde dia 1 (green check). Toma 1-2 semanas de aprobacion — empezar el tramite YA.
- **No mandar broadcasts no solicitados** — incluso con API oficial, Meta banea por reportes de spam.
- **Validar formato de telefono** antes de generar `wa.me/57XXXXXXXXXX` (ya documentado como pendiente en CONCERNS.md item #20).

**Warning signs:** Mensaje "este chat fue reportado" · jalador reporta que no puede mandar mas mensajes · drop subito en open rate de confirmaciones.

---

### Pitfall 8: Postgres FTS sin `unaccent` para busqueda en espanol
**Severity:** HIGH · **Phase:** MKT2

**What goes wrong:** Turista busca "Tayrona" y no encuentra "Parque Tayrona Día Completo" porque el indice tiene `dia` (ASCII) y la query tiene `día` (UTF-8 con tilde) — o viceversa. Peor: busca "playa cristal" y no encuentra "Playa Cristal" por case-sensitivity y stemming en espanol no aplicado.

**Why it happens:** Postgres `to_tsvector('spanish', ...)` aplica stemming pero NO normaliza acentos por defecto. Necesita extension `unaccent` activada y combinada explicitamente.

**How to avoid:**
- **Habilitar extension `unaccent`** en Supabase: `CREATE EXTENSION IF NOT EXISTS unaccent;`
- **Configuration FTS personalizada**: `CREATE TEXT SEARCH CONFIGURATION es_unaccent (COPY = spanish); ALTER TEXT SEARCH CONFIGURATION es_unaccent ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;`
- **Indexar con la nueva config**: `CREATE INDEX tours_search_idx ON tours USING GIN(to_tsvector('es_unaccent', name || ' ' || description || ' ' || zone));`
- **Query con la misma config**: `SELECT ... WHERE to_tsvector('es_unaccent', ...) @@ plainto_tsquery('es_unaccent', $1)`
- **Trigram fallback** (`pg_trgm`) para misspellings tipo "tairona" → "tayrona". Combinar FTS + trigram con weights.
- **No usar `ILIKE '%query%'`** en columnas grandes — kill table scan en > 10k filas.

**Warning signs:** Busquedas validas devolviendo 0 resultados · tiempo de query > 200ms en explorar.

---

### Pitfall 9: Supabase free-tier connection pool exhaustion
**Severity:** HIGH · **Phase:** STAB → GROW

**What goes wrong:** Free tier de Supabase tiene **60 conexiones directas** y **200 conexiones via pooler (PgBouncer)**. Con Vercel serverless functions, cada cold start abre conexion. Si Next.js API routes usan `createClient` por request sin pooler, llegas a 60 en pico de trafico (boda, fin de semana largo). Sintoma: requests fallan con "remaining connection slots are reserved" sin warning previo.

**Why it happens:** Defaults de `@supabase/supabase-js` no usan el pooler URL automaticamente. Dev usa la URL directa porque "es la que sale en el dashboard".

**How to avoid:**
- **Usar pooler URL** (`...pooler.supabase.com:6543`) en `DATABASE_URL` para todo lo que sea serverless / API routes. Solo usar conexion directa para migraciones.
- **Modo `transaction` del pooler** para queries cortas de API routes; modo `session` solo si necesitas LISTEN/NOTIFY o prepared statements.
- **`@supabase/supabase-js` con `db: { schema: 'public' }`** y reusar el cliente como singleton modulo-level (no `createClient` por request).
- **Monitor `pg_stat_activity`** semanal: `SELECT count(*), state FROM pg_stat_activity GROUP BY state;`
- **Plan de upgrade**: definir umbral (ej: > 100 conexiones promedio) → upgrade a Pro ($25/mes) que sube limites y agrega backups diarios.

**Warning signs:** Errores intermitentes "FATAL: too many connections" · Vercel function timeout en horas pico · Supabase dashboard mostrando spikes en "DB Connections".

---

### Pitfall 10: RLS policies con bug que filtra data entre tenants
**Severity:** CRITICAL · **Phase:** STAB

**What goes wrong:** Operador A puede ver bookings del operador B porque el RLS policy usa `auth.uid() = tour.operator_id` pero la query JOIN deja `tour` nullable. O policy con `USING (true)` para "abrir temporal" que nunca se cerro. O API route usa `service_role_key` directamente sin filtrar por usuario, bypassing RLS completo.

**Why it happens:** RLS es opt-in. Cada tabla nueva sin RLS habilitado = puerta abierta. Y el `service_role` key bypassea todo, asi que un dev usa ese key en una API route "temporal" y se queda.

**How to avoid:**
- **`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` por defecto** en cada tabla nueva. Sin excepcion.
- **Tests automatizados de RLS**: para cada tabla, test "user A no ve data de user B". Vitest + Supabase test client. Bloqueante en CI.
- **Nunca usar `service_role` key en codigo Next.js client-side**. Solo en API routes y solo cuando el usuario ya esta autenticado y autorizado a nivel de aplicacion.
- **Audit periodico**: query `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;` — debe devolver 0 filas.
- **Policies escritas en SQL versionado** (migraciones), no via UI de Supabase. Cambios pasan por code review.
- **Server-side role check** para `/dashboard/admin` y `/dashboard/operator` via `getServerSideProps` (ya documentado en CONCERNS.md item #13).

**Warning signs:** Query con `service_role` key en repo · table `pg_tables` con `rowsecurity = false` · operador reportando ver data ajena (rare pero catastrofico).

---

### Pitfall 11: Single-dev burnout en mes 3-4
**Severity:** HIGH · **Phase:** ALL

**What goes wrong:** Juanda solo durante 4-5 meses. Mes 1-2 adrenalina launch. Mes 3 aparecen bugs de prod + soporte WhatsApp 24/7 + commits + planeacion + sales. Mes 4 = fatigue, errores en producion, decisiones precipitadas. Studio de marketplaces single-founder fallan en mes 4-6 segundo Y Combinator.

**Why it happens:** Trabajo de marketplace = simultaneamente desarrollo + customer support + sales + ops. Las 4 son demandas concurrentes, no secuenciales.

**How to avoid:**
- **Hard cap de horas semanales** (ej. 60h/semana, no 90h). Auto-imposed.
- **Soporte primer nivel via FAQ + WhatsApp templates** desde semana 1, no semana 12. Reduce el "cada pregunta es nueva".
- **Pause feature dev** si bugs P0 acumulados > 5 — apagar fuegos antes de seguir.
- **Outsource lo no-core**: contabilidad, RNT, DIAN → contador externo (~COP $500.000/mes). Tu tiempo > el costo.
- **Buddy system**: weekly call de 30min con peer founder (no mentor) solo para ventilar. Sin agenda.
- **Vacaciones obligatorias**: 1 dia/semana sin codigo + 1 semana al mes 3 sin laptop. Productividad sostenible > sprint.
- **Definir "MVP es suficiente"**: cada feature de la roadmap pasa filtro "esto bloquea $1.000.000 de revenue / mes? si no, defer".

**Warning signs:** Mas de 3 commits con typos en una semana · responder WhatsApp a las 3am · skip de tests porque "no hay tiempo" · bugs P0 con turnaround > 48h.

---

### Pitfall 12: DIAN factura electronica omitida hasta que sea tarde
**Severity:** CRITICAL · **Phase:** STAB

**What goes wrong:** En Colombia, **toda venta de servicios genera obligacion de factura electronica DIAN** si superas ciertos umbrales (regimen comun) o si el operador la requiere. La Perla, al cobrar fee, es contribuyente. Sin proveedor de facturacion electronica integrado (Siigo, Alegra, Facture, Soenac), las primeras 1.000 ventas quedan sin facturar legalmente. Sancion DIAN: COP $200K-$1M por factura no emitida + auditoria.

**Why it happens:** Es opcion default que el dev posponga compliance ("primero validamos, luego legalizamos"). Pero en pagos digitales, Wompi reporta a DIAN, y DIAN cruza automaticamente.

**How to avoid:**
- **Decidir desde dia 1 quien factura**:
  - Modelo A: La Perla factura al turista por el total, paga al operador con su factura propia.
  - Modelo B: Operador factura al turista directamente, La Perla solo factura el fee de comision al operador.
  - **Modelo B es mas simple** para arrancar: operador ya tiene su NIT/RUT, La Perla solo emite N facturas al mes (1 por operador, agregada).
- **Integrar Alegra o Siigo via API** desde STAB. Ambos tienen API REST para emitir factura electronica con un POST. Costo ~COP $50K-$150K/mes.
- **RUT actualizado de La Perla** con responsabilidades 05 (IVA), 11 (factura electronica). Tramite gratis pero toma 2-4 semanas.
- **Operadores deben tener RUT actualizado** como requisito de onboarding. Bloqueo de pago si no.

**Warning signs:** Wompi muestra ventas que no tienen factura asociada · operadores preguntando "y mi factura?" · ningun PDF de factura en el flow del booking.

---

### Pitfall 13: RNT (Registro Nacional de Turismo) ignorado
**Severity:** HIGH · **Phase:** STAB

**What goes wrong:** Operadores de tours en Colombia DEBEN tener **RNT activo** ante MinCIT. Sin RNT, ofrecer tours es ilegal — multa hasta 100 SMLMV (~COP $130M). La Perla, al listar operadores sin RNT, puede ser considerada complice. Y operadores listados sin RNT son denunciados por competencia local samaria que SI tiene RNT.

**Why it happens:** Operadores informales (los que mas atrae el modelo) son justamente los que NO tienen RNT.

**How to avoid:**
- **RNT obligatorio en onboarding**: campo RNT validado contra API de MinCIT (existe endpoint publico de consulta: `https://rntsiturweb.mincit.gov.co/`). No se puede aprobar operador sin RNT vigente.
- **Re-validacion anual**: RNT vence cada ano, recordatorio automatico 30 dias antes.
- **Para operadores 100% informales** (tour de comida, walking tour pequeno), considerar listing como "experiencia local" no "tour" — categoria distinta con menos requerimientos. Verificar con abogado en STAB.
- **Disclaimer legal** en footer de la app: "La Perla actua como intermediario tecnologico. Cada operador es responsable de su licencia y cumplimiento."

**Warning signs:** Operador sin RNT pidiendo aprobacion · denuncia de gremio (ANATO, COTELCO) · request de MinCIT por listing publico.

---

### Pitfall 14: Habeas Data — datos de turista expuestos sin consentimiento
**Severity:** HIGH · **Phase:** STAB

**What goes wrong:** Turista deja telefono, cedula, email para reservar. Jalador ve esos datos para coordinar el tour. Pero jalador puede usar la lista para spam, vender datos a terceros, o competencia. Sin consentimiento informado y politica de tratamiento de datos publicada, La Perla viola Ley 1581 de 2012 (Habeas Data Colombia). Sancion SIC: hasta 2.000 SMLMV.

**Why it happens:** Es facil de ignorar porque "todos lo hacen". Pero la SIC esta activamente sancionando startups colombianas (Rappi multado en 2020).

**How to avoid:**
- **Politica de tratamiento de datos publicada** en `/politica-de-datos` con: finalidad, derechos del titular, contacto del responsable, vigencia. Template de SIC disponible.
- **Checkbox de consentimiento explicito** en el booking ("Acepto el tratamiento de mis datos para que La Perla y el operador coordinen mi reserva"). NO pre-marcado.
- **Registro Nacional de Bases de Datos (RNBD)** ante SIC si > 100 datos personales — gratuito pero obligatorio.
- **Jalador firma acuerdo de confidencialidad** en onboarding: no usar datos de turista para nada fuera del tour. Penalizacion: suspension permanente.
- **Logs de acceso**: cada vez que jalador ve datos de un turista, queda log. Si hay denuncia, hay trazabilidad.
- **Datos minimos**: NO pedir cedula si no es necesaria para el tour. NO pedir fecha de nacimiento. Principio de minimizacion.
- **Boton "eliminar mi cuenta"** funcional (no fake). Derecho de supresion.

**Warning signs:** Turista reporta "me llamaron de un operador X que yo no contacte" · denuncia SIC · pedido de derecho de habeas data sin proceso para responder.

---

### Pitfall 15: Multinivel jalador → jalador interpretado como piramide
**Severity:** HIGH · **Phase:** GROW

**What goes wrong:** El roadmap menciona "sistema de referidos jalador → jalador (multinivel ligero)". En Colombia, esquemas multinivel son legales SI el ingreso viene de venta de productos/servicios reales (no de reclutar). Si el jalador reclutador gana % "para siempre" sobre cada venta del reclutado sin tope, y el reclutado debe pagar entrada, podria ser interpretado como **piramide ilegal** (Ley 1700 de 2013).

**Why it happens:** "Multinivel" en lenguaje informal significa "MLM tipo Herbalife". Pero la regulacion colombiana es estricta y SuperSociedades persigue activamente piramides.

**How to avoid:**
- **Sin entrada / inscripcion paga**: registro de jalador es 100% gratis. Esto solo ya saca el modelo de "piramide ilegal".
- **Comision por referido limitada**: solo 1 nivel (no 2, no 5), porcentaje pequeno (3-5% de la comision del reclutado), por tiempo finito (3-6 meses, no para siempre).
- **El producto real (tour) es lo que se vende**, no la membresia. Documenarlo en T&C.
- **Sin "rangos" tipo Star Diamond**: solo "+ comision por jalador activo que reclutaste". Funcional, no aspiracional-MLM.
- **Validar con abogado especialista en SuperSociedades** antes de lanzar el feature de referidos.

**Warning signs:** Reclamo del jalador "esto se ve como piramide" · bloqueo de comentarios en redes sociales · oficio de SuperSociedades.

---

### Pitfall 16: Native app antes que web stable + Wompi-WebView en App Store
**Severity:** HIGH · **Phase:** MOB

**What goes wrong:** Lanzar native app (React Native/Flutter) en mes 3 cuando web aun tiene bugs P0 → bugs ahora estan en 3 codebases (web + iOS + Android), tiempo de fix x3, releases bloqueadas por App Store review (3-7 dias por release en mes inicial).

**Plus**: Apple requiere que **pagos in-app de bienes digitales** vayan via In-App Purchase (30% fee). Pagos de **servicios fisicos** (tours = servicio fisico) van via Wompi WebView SIN problema. PERO la review de Apple a veces marca por error → app rejection y delay 1-2 semanas.

**Why it happens:** Tentacion de "ya somos app real, somos serios". Pero antes de native, validar que web funciona en mobile browser nativo.

**How to avoid:**
- **PWA reforzada primero** (instalable, push notifications via web push). 80% del valor de native app, 0% del costo de mantenimiento.
- **Native solo cuando web esta bug-free P0** (cero P0 abiertos por > 30 dias seguidos).
- **Anticipar el review de Apple**: documentar claramente que Wompi cobra **servicios fisicos** (tour es experiencia, no contenido digital). Tener screenshots y carta de Wompi a la mano para responder rejection.
- **Empezar con Android primero** (Play Store review = horas, no dias). Iterar rapido en Android, refinar para iOS despues.
- **Habilitar push notifications via web** primero — no necesita app nativa, funciona en Android Chrome.
- **Review checklist Apple**: in-app purchase usado solo para digital · servicios reales pueden usar web checkout · disclosure de uso de WebView claro.

**Warning signs:** App rejection por Apple con motivo "guideline 3.1.1" · users reportando "la app es mas lenta que la web" · cycle time de bug fix > 1 semana por wait de review.

---

### Pitfall 17: Bundle pesado en Android low-end (jaladores con celulares 2GB RAM)
**Severity:** HIGH · **Phase:** STAB + MOB

**What goes wrong:** Jaladores en Santa Marta usan celulares Motorola E, Samsung A03, Xiaomi Redmi 9A — 2GB RAM, Android 10-11, 3G/4G inestable. Bundle de 500KB+ JS = parse time 3-5 segundos en estos devices. Si la app se siente lenta en su celular, NO la usan.

**Why it happens:** Dev y testers usan iPhones / Pixels / desktops. Lo que es "fast" en MacBook M2 puede ser "frozen" en Moto E.

**How to avoid:**
- **Budget de bundle**: < 150KB JS gzipped en landing y dashboard de jalador. Verificar con `next build` analyzer.
- **Code splitting agresivo**: dashboard del jalador NO carga recharts (admin only). Mockdata NO carga en prod (ya documentado en CONCERNS.md item #16).
- **Test real en device low-end**: comprar 1 Motorola E (~COP $300K) y dejarlo en el escritorio. Cada release pasa por ese device antes de merge.
- **Lighthouse mobile slow 4G** en CI: scores Performance > 80 bloqueante.
- **Imagenes WebP/AVIF** con `next/image`, lazy load por defecto (ya hay base de seguridad headers).
- **Service worker** para cache offline de tours visitados (el jalador vuelve mucho a los mismos tours).
- **Sin animaciones complejas** en el dashboard del jalador — solo CSS transitions de < 200ms.
- **Limitar polling**: dashboard de notificaciones cada 30s, no cada 5s.

**Warning signs:** Jaladores reportan "se traba" · session length < 30s en analytics mobile · uninstall rate > 20% primer dia.

---

### Pitfall 18: Refund-after-payout (jalador ya cobro, turista pide reembolso)
**Severity:** HIGH · **Phase:** STAB

**What goes wrong:** Pago instant al jalador (mitigacion del pitfall #6). Turista cancela 2 dias despues (politica permite). Plata salio. Tienes que: (a) cobrar al jalador (probable: no tiene la plata), (b) absorberlo La Perla (margen mata), o (c) cobrar al operador.

**Why it happens:** Si optas por pago rapido para retencion, sacrificas proteccion contra refunds.

**How to avoid:**
- **Politica de cancelacion clara**: > 48h antes = refund total al turista, comision se reverte (jalador queda con saldo negativo a cubrir con proximas ventas). < 48h = no refund (excepciones por mal tiempo / fuerza mayor).
- **Saldo negativo del jalador**: permitido hasta -COP $50K, se cubre con proximas comisiones. Si supera, bloqueo de payouts hasta cubrir.
- **Reservas no reembolsables al 50%** para reducir freq de refund (incentivo: 5% descuento por pre-pago no-reembolsable).
- **Fondo de garantia de La Perla**: 5% de cada venta a pool de proteccion durante mes 1-3. Despues, si la tasa de refund < 2%, devolver al P&L.
- **Educar jalador**: "tu comision puede revertirse si el cliente cancela. Esto es 1 de cada N ventas."

**Warning signs:** Saldo negativo de jaladores > 10% del activo · refund rate > 5% · jaladores con saldo negativo abandonando para no pagar.

---

### Pitfall 19: Backups de Supabase no probados / disaster recovery sin plan
**Severity:** CRITICAL · **Phase:** STAB

**What goes wrong:** Free tier de Supabase: backups diarios automaticos pero **retencion 7 dias** y **NO point-in-time recovery (PITR)**. Pro tier ($25/mes): 7 dias de PITR. Si un dev (o un SQL malo de migracion) borra `bookings` table un viernes y se nota lunes — datos perdidos sin recovery posible.

**Why it happens:** "Supabase tiene backups" es asumido como "estoy cubierto". Pero nunca se prueba el restore. Y un solo dev → un solo human con permisos para destruir.

**How to avoid:**
- **Upgrade a Supabase Pro** desde STAB ($25/mes). PITR de 7 dias, backups daily de 30 dias. Costo trivial vs riesgo.
- **Backup propio semanal a S3 / R2**: `pg_dump` programado en GitHub Action, comprimido + encriptado, retenido 90 dias. Cuesta < $1/mes.
- **Probar restore mensual**: levantar instancia Supabase secundaria, hacer restore desde backup, verificar count de filas. Sin test, el backup no existe.
- **Migraciones con review obligatoria**: cada `DROP`, `TRUNCATE`, `DELETE` sin WHERE en migracion = bloqueado en CI.
- **Soft delete por defecto**: columna `deleted_at` en lugar de `DELETE`. Recovery de "ups borre el operador" = 1 UPDATE.
- **Permissions split**: usuario `app` (read/write rows), usuario `migrations` (DDL). Codigo de app NUNCA con permisos de DROP.

**Warning signs:** Nunca se probo un restore · ultimo backup downloadable es de hace > 1 semana · solo Juanda tiene credenciales de admin Supabase.

---

### Pitfall 20: Comision al jalador hardcoded 20% (sin configurabilidad)
**Severity:** MEDIUM · **Phase:** STAB

**What goes wrong:** Estado actual del codebase (segun PROJECT.md): comision 20% hardcoded en calculo de catalogo. Operador A quiere ofrecer 25% para mover inventario lento → no se puede sin deploy. Operador B quiere 15% para tour premium → no se puede. La Perla quiere experimentar con 22% en pico de temporada → no se puede.

**Why it happens:** Hardcoded valores son rapidos en MVP. Pero comisiones varian por operador, por tour, por temporada, por nivel del jalador.

**How to avoid:**
- **Tabla de comisiones**: `commissions(tour_id, jalador_tier, season, percentage, valid_from, valid_to)`. Default fallback al 20%.
- **UI admin para editar comisiones** sin deploy.
- **Versionado**: cuando cambias comision, las ventas previas mantienen la comision pactada en su momento. NO retroactiva.
- **Jalador ve el % al generar el link**: "ganas 20% de comision en este tour". Transparencia.

**Warning signs:** Operador pidiendo "podemos cambiar mi %" y respuesta es "necesito deploy" · feature requests de comisiones variables acumuladas.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Token JWT en localStorage | 1 dia menos de implementacion | XSS = full account takeover (CONCERNS #2) | NUNCA en prod con dinero real → migrar a HttpOnly cookies en STAB |
| Sin tests del flow de pago | Velocidad de feature dev | Bug en pago = bonkruptcy o demanda | NUNCA — Playwright del booking flow es bloqueante en STAB |
| `service_role` key en API route | Bypass RLS = queries simples | 1 endpoint expuesto = data leak total | Solo si la route esta DETRAS de auth de admin verificada server-side |
| Demo mode en production | Showroom para ventas | Confusion usuario, datos fake mezclados (CONCERNS #1) | Solo con env var + banner persistente, removido a la primera oportunidad |
| `wa.me` para todo WhatsApp | Cero costo, cero setup | No funciona para automation, ban riesgo | OK para mensajes jalador-iniciados; broadcasts requieren API oficial |
| Comision hardcoded 20% | Math simple en frontend | Cero flexibilidad comercial | Hasta semana 2 post-launch, despues mover a DB |
| Sin error boundary | Menos boilerplate | White screen + zero context (CONCERNS #6) | NUNCA — boundary global en STAB |
| Silent catches en data fetching | Codigo "limpio" | Usuario ve listas vacias sin saber por que (CONCERNS #7) | NUNCA en prod — minimo log + UI de retry |
| Hardcoded Spanish strings | Velocidad de iteracion | Imposible de internacionalizar v3 | OK durante v1 (Santa Marta only); refactor solo si expansion confirmed |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Wompi webhook | Procesar evento sin validar firma | Validar `X-Event-Checksum` ANTES de cualquier side effect |
| Wompi webhook | Procesar duplicados (Wompi retries) | Tabla `wompi_events_processed` con UNIQUE constraint en `event_id` |
| Wompi pago | Confirmar booking en redirect del usuario | NUNCA — solo via webhook server-to-server (usuario puede cerrar browser antes del redirect) |
| Wompi refund | Hacer refund manual en Wompi UI sin reflejarlo en DB | Usar API de refund + webhook `transaction.refunded` para sync |
| Supabase Auth | Confiar en `user.role` del JWT como autoritativo sin server check | RLS policy que valida + server-side getServerSideProps para rutas protegidas |
| Supabase Realtime | Suscribirse a `*` events de una tabla con muchos updates | Filtrar suscripcion por user_id, throttle al cliente |
| Supabase RLS | `USING (true)` "temporal" que se queda | Migracion versionada + audit periodico de policies |
| WhatsApp Cloud API | Mandar mensajes sin opt-in claro | Plantillas pre-aprobadas + checkbox de consentimiento + opt-out via STOP |
| Vercel | `getServerSideProps` con DB query sincrona en cada request | Edge cache con `revalidate` o Edge Functions con KV cache |
| DIAN factura | Emitir factura del lado equivocado (La Perla cuando deberia ser operador) | Modelo B: operador factura turista, La Perla solo factura fee al operador |
| Google OAuth | Callback URL diferente entre dev y prod | Lista explicita en Google Console: `localhost:3000/auth/callback`, `tourmarta.co/auth/callback`, `*.vercel.app/auth/callback` |
| Sentry | Mandar PII (email, telefono) en error context | Scrub automatico via `beforeSend` hook + `dataScrubber` config |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 query en explorar (cada tour = query de operador) | Tiempo de carga > 3s, Supabase CPU spike | JOIN en una query con `select('*, operator(*)')` | > 50 tours en catalogo |
| `ILIKE '%query%'` en busqueda | Query > 500ms, CPU 100% | Postgres FTS + `unaccent` + GIN index | > 10K tours o > 100 busquedas/min |
| Realtime subscription a tabla `bookings` sin filtro | Browser memory leak, mobile freeze | Filtrar por `user_id eq` o `operator_id eq` | > 100 bookings/dia |
| Imagenes sin `next/image` | LCP > 4s mobile, bandwidth waste | `<Image fill priority />` en hero, lazy en resto | Inmediato en mobile 3G |
| Bundle de mockData en prod | TTI alto, parse time blocked | `await import('./mockData')` lazy + verify con bundle analyzer | Inmediato (CONCERNS #16) |
| Polling cada 5s para notificaciones | Battery drain, dashboard duplicate requests | WebSocket via Supabase Realtime o polling cada 30s+ con backoff | > 1.000 jaladores activos simultaneos |
| Recharts cargado en cada admin tab | Bundle dashboard 500KB+ | `dynamic(() => import('./Charts'), { ssr: false })` | Inmediato (CONCERNS #17) |
| Sin Vercel Edge cache para `/explorar` | Origin Supabase saturada en pico | `revalidate: 60` en `getStaticProps` o ISR | > 100 visits/min en pico fin de semana |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Token JWT en localStorage (CONCERNS #2) | XSS = full account takeover, refresh token robado | HttpOnly + Secure cookie via Supabase SSR helpers |
| Sin CSP header (CONCERNS #3) | Inline script injection sin defensa | CSP con `script-src 'self' https://*.supabase.co` y `nonce` |
| Cliente decide rol (CONCERNS #13) | Admin UI render con role spoofeado | `getServerSideProps` con role check, redirect si no autorizado |
| Webhook Wompi sin validacion de firma | Atacante simula pago confirmado | Validar `X-Event-Checksum` con `events_secret` |
| Datos PII en logs / Sentry | Habeas Data violation | Scrubber automatico, no log de telefono/email/cedula |
| Cedula del turista en URL como query param | Cedula en logs de Vercel/CDN/analytics | POST body o cookie, nunca query string |
| Webhook endpoint sin rate limit | DoS al endpoint de pago | Rate limit por IP via Vercel Edge Middleware |
| Email confirmation sin token de un solo uso | Replay attack | Token UUID con expiracion, marcado como usado en DB |
| Operadores con `service_role` key en su panel | Acceso DB completo | Operador usa JWT user-scoped, RLS aplica |
| Codigo del jalador (`refCode`) predecible (incremental) | Enumeration attack para clonar jaladores | nanoid de 8+ chars, alfanumerico |
| Sin lockout despues de N intentos de login | Brute force | Supabase tiene rate limit por defecto, verificar configurado |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| QR code sin instrucciones de uso | Operador en muelle no sabe que escanear | QR + texto "Muestra este codigo al guia" + nombre del tour visible |
| Confirmacion solo por email | Turista samario revisa email cada 3 dias, pierde la cita | WhatsApp confirmacion + recordatorio 24h y 2h antes |
| Boton "cancelar reserva" enterrado | Turista llama soporte por algo que pudo hacer solo | Boton visible en `/mis-reservas` con confirmacion inline |
| "Loading..." sin feedback de tiempo | Usuario en 3G cierra la app pensando que se colgo | Skeleton UI + "Cargando tours... (~3s)" |
| Errores tecnicos crudos en pantalla | "TypeError undefined is not a function" al usuario | Boundary + mensaje "Algo salio mal, recarga" + boton retry |
| Pagos sin desglose visible | "$120K total" sin ver que es base + comision + fee | Tabla detallada antes del pago: tour $100K, La Perla $5K, total $105K |
| Mapa de zona no clickeable / sin direccion | Turista no sabe a donde ir | Direccion + Google Maps deeplink + WhatsApp del operador |
| Sin estado de "tour cancelado por mal tiempo" | Turista llega al muelle, plantado | Notificacion push + WhatsApp + estado visible en `/mis-reservas` |
| Form de registro de jalador con > 5 campos | Abandono > 60% en mobile | Solo telefono + nombre, resto despues del primer login |
| Comision del jalador en porcentaje sin pesos absolutos | "20%" no motiva tanto como "$20.000 por venta" | Mostrar "Ganas $20.000 de comision" en cada tour |

---

## "Looks Done But Isn't" Checklist

- [ ] **Wompi integration:** A menudo le falta validacion de firma del webhook — verificar `X-Event-Checksum` con `events_secret` en cada POST.
- [ ] **Wompi integration:** A menudo le falta idempotencia — verificar tabla `wompi_events_processed` con UNIQUE.
- [ ] **Booking flow:** A menudo le falta confirmacion por canal redundante — verificar email + WhatsApp + push.
- [ ] **Comision payout:** A menudo le falta hold period configurable — verificar saldo en estados `pending`, `available`, `paid`.
- [ ] **Demo mode:** A menudo le falta banner visible en prod — verificar render de aviso si `isBetaActive() && NODE_ENV === 'production'`.
- [ ] **RLS policies:** A menudo le falta cobertura de todas las tablas — verificar `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=false` = 0.
- [ ] **DIAN factura:** A menudo le falta el PDF descargable post-pago — verificar attach de factura en email de confirmacion.
- [ ] **Habeas Data:** A menudo le falta consentimiento explicito — verificar checkbox en booking form NO pre-marcado.
- [ ] **Refund flow:** A menudo le falta reverso de comision al jalador — verificar saldo del jalador despues de refund.
- [ ] **Mobile performance:** A menudo le falta test en device low-end — verificar Lighthouse mobile slow 4G > 80.
- [ ] **WhatsApp confirmacion:** A menudo le falta validacion de telefono — verificar `cleanPhone.length === 10` antes de generar `wa.me`.
- [ ] **Operador onboarding:** A menudo le falta validacion de RNT — verificar consulta a API de MinCIT antes de aprobar.
- [ ] **Atribucion jalador:** A menudo le falta cookie persistente — verificar cookie `lp_ref` con expires + 30 dias.
- [ ] **Search:** A menudo le falta `unaccent` — verificar que `to_tsvector('es_unaccent', ...)` esta usado.
- [ ] **Backups Supabase:** A menudo le falta restore test — verificar restore mensual a instancia secundaria.
- [ ] **Native app submit:** A menudo le falta justificacion clara para Wompi WebView — verificar carta de Wompi adjunta a app store metadata.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wompi webhook procesado 2x | MEDIUM | Identificar bookings duplicados via SQL, refund duplicado al cliente, reverso de comision al jalador, factura DIAN nota credito, postmortem + idempotency fix |
| Demo mode filtrado a usuarios reales | HIGH | Force logout de todos los users con `token = 'beta-demo-token'`, comunicar via email "tuvimos un bug, vuelve a iniciar sesion", deploy fix con env var |
| Operador no-show grave | HIGH | Refund inmediato al turista (carga La Perla), suspension del operador, post publico en redes "manejamos esto asi", contacto 1-1 con turista afectado |
| Jalador con kickback fraud detectado | MEDIUM | Suspension de cuenta, reverso de comisiones de las ventas dudosas, comunicado a otros jaladores sobre la regla |
| RLS leak entre operadores | CRITICAL | Disable feature inmediato, audit de cuanta data fue expuesta, notificacion SIC si > 100 titulares afectados, fix RLS policy + tests, reactivar |
| Numero WhatsApp baneado por Meta | HIGH | Activar numero secundario, migrar contactos existentes a Cloud API oficial, postmortem de que mensajes triggered el ban |
| Bundle bloated → mobile users uninstalan | MEDIUM | Bundle analyzer, identificar el peor offender, code split agresivo, deploy, comunicar mejora a la comunidad de jaladores |
| Backup Supabase no recoverable | CRITICAL | Recoger lo que quede en logs de Vercel + Wompi + WhatsApp, reconstruir manualmente bookings recientes, postmortem brutal, cambiar a backup propio + Pro tier |
| DIAN auditoria por facturas faltantes | HIGH | Contratar contador especializado YA, emitir facturas retroactivas (legal en Colombia con sancion), pagar multa, integrar Alegra/Siigo permanente |
| App rejected por Apple | MEDIUM | Responder review con doc de Wompi, ajustar marketing copy si dice "compra" → "reservas", resubmit, en paralelo seguir con Android |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Cold-start equivocado | STAB + GROW | Metric: jaladores activos / operadores activos > 5 ratio |
| #2 Wompi sin idempotencia | STAB | Test E2E: enviar webhook duplicado, verificar 1 sola booking |
| #3 Atribucion disputable | STAB + GROW | Cookie `lp_ref` set en `/j/[refCode]` requests, persiste 30 dias |
| #4 Demo mode leak | STAB | Verificar que `NEXT_PUBLIC_BETA_MODE=false` en prod, banner si true |
| #5 Operador malo derrumba marca | GROW + MKT2 | Refund policy < 24h documentada, fondo de garantia activo |
| #6 Jalador hold period resistance | GROW | Pago instant en mes 1-3, switch a hold solo despues de 50+ jaladores |
| #7 WhatsApp ban riesgo | STAB + GROW | Numero Business verificado, broadcasts solo via Cloud API |
| #8 FTS sin unaccent | MKT2 | Test: buscar "tairona" devuelve "Tayrona" |
| #9 Connection pool exhaustion | STAB → GROW | Pooler URL en uso, monitor `pg_stat_activity` semanal |
| #10 RLS bug | STAB | Tests automatizados de aislamiento por tenant en CI |
| #11 Single-dev burnout | ALL | Hard cap horas/semana, pause feature dev si P0s > 5 |
| #12 DIAN factura electronica | STAB | Integracion Alegra/Siigo activa, factura PDF en cada confirmacion |
| #13 RNT obligatorio | STAB | Validacion API MinCIT en operador onboarding |
| #14 Habeas Data | STAB | Politica publicada, checkbox consentimiento, registro RNBD |
| #15 Multinivel piramide | GROW | Sin entrada paga, 1 nivel max, comision con tope, validado por abogado |
| #16 Native antes de web stable | MOB | PWA primero, native solo cuando 0 P0 abiertos > 30 dias |
| #17 Bundle pesado low-end | STAB + MOB | Lighthouse > 80 mobile slow 4G en CI, test en Moto E real |
| #18 Refund-after-payout | STAB | Politica cancelacion clara, saldo negativo permitido hasta -50K |
| #19 Backup no probado | STAB | Pro tier activo, restore mensual probado, dump propio semanal |
| #20 Comision hardcoded | STAB | Tabla `commissions` editable via admin UI |

---

## Sources

- **Wompi documentation** — `https://docs.wompi.co/docs/colombia/eventos/` (idempotency, signature validation, webhook retries) — MEDIUM confidence (verified via training data, recommend re-check before STAB).
- **Supabase RLS gotchas** — community-known traps documented in Supabase Discord and GitHub issues. HIGH confidence on patterns, MEDIUM on specific limit numbers (60 direct conn, 200 pooler).
- **Airbnb early-days post-mortems** — Brian Chesky's writings on manual matching + EJ incident response (2011). HIGH confidence on patterns.
- **Rappi early-days** — multiple Colombian press articles 2015-2017 on rappitendero-first cold start, plus SIC sancion 2020 by Habeas Data. HIGH confidence on patterns, MEDIUM on exact dates.
- **Y Combinator solo-founder fail patterns** — published essays from PG and Sam Altman on burnout windows. MEDIUM confidence on month-specific timelines.
- **Ley 1581 de 2012 (Habeas Data Colombia)** — official law text. HIGH confidence.
- **Ley 1700 de 2013 (multinivel)** — SuperSociedades doctrine. HIGH confidence.
- **DIAN factura electronica** — resolution 042/2020 obligaciones. HIGH confidence on requirement, MEDIUM on cost numbers (Alegra/Siigo pricing).
- **MinCIT RNT** — `https://rntsiturweb.mincit.gov.co/` exposes consult endpoint publicly. HIGH confidence on requirement.
- **WhatsApp Cloud API pricing** — Meta official pricing for Colombia 2025-2026 categories. MEDIUM confidence on per-message cost.
- **Apple App Store Review Guidelines 3.1.1 / 3.1.5** — physical services exempt from IAP. HIGH confidence on rule, MEDIUM on review-cycle reliability.
- **Internal codebase audit** — `.planning/codebase/CONCERNS.md` 2026-04-25. HIGH confidence (direct file reads).

---
*Pitfalls research for: La Perla (tourism marketplace, Santa Marta, 1-dev, brownfield post-launch)*
*Researched: 2026-04-25*
