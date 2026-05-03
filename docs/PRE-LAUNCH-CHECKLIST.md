# Pre-Launch Checklist · La Perla

Lista clickeable para verificar que TODO funciona antes de pasar a producción real (Wompi prod + cuenta verificada). Mientras `LAPERLA_MODE` no esté en `production`, esta auditoría se puede hacer 100% gratis en sandbox.

> ⚠️ **No marques una caja sin haberla probado de verdad.** Este doc es la única defensa contra bugs que solo aparecen con clientes reales.

---

## 0. Configuración base

- [ ] Aplicar `supabase/migrations/0001_tours_for_agente.sql` en SQL Editor de Supabase
- [ ] Aplicar `supabase/migrations/0002_sales_commissions.sql` en SQL Editor de Supabase
- [ ] Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están en Vercel
- [ ] Agregar `SUPABASE_SERVICE_ROLE_KEY` en Vercel (server-only, NO usar `NEXT_PUBLIC_`)
- [ ] Vercel Authentication → Disabled o Only Production (para que clientes reales puedan abrir el sitio)
- [ ] `LAPERLA_MODE` ausente o = `demo` (ningún error de Wompi prod por ahora)

---

## 1. Flujo del Turista

### 1.1 Explorar tours
- [ ] `/explorar` carga sin errores
- [ ] Las imágenes de tours se ven (no placeholder gris)
- [ ] Filtros y búsqueda funcionan
- [ ] Tap en una card → navega a `/tour/[slug]`

### 1.2 Detalle de tour
- [ ] Galería de fotos cargando
- [ ] Precio adulto correcto
- [ ] Datos del operador visibles (nombre, score)
- [ ] Botón "Reservar" abre el flujo de booking
- [ ] Reseñas se muestran si existen

### 1.3 Reservar
- [ ] Selector de fecha respeta disponibilidad
- [ ] Cantidad de personas funciona
- [ ] Cálculo del total correcto (precio × personas)
- [ ] Form de datos del cliente acepta nombre + teléfono + email opcional
- [ ] Botón "Pagar" redirige a Wompi sandbox

### 1.4 Pago Wompi sandbox
- [ ] Wompi carga con la llave sandbox correcta
- [ ] Tarjeta de prueba `4242 4242 4242 4242` (CVV 123, fecha futura) funciona
- [ ] Wompi redirige de vuelta a `/pago-resultado?id=<transactionId>`
- [ ] Página `/pago-resultado` muestra "APPROVED" tras la redirección
- [ ] El booking aparece en `/mis-reservas`

### 1.5 Mis reservas
- [ ] `/mis-reservas` lista las reservas del turista
- [ ] El QR del booking se ve y es escaneable
- [ ] Datos de cada reserva correctos (tour, fecha, total)
- [ ] Botón cancelar funciona si la reserva permite cancelación

---

## 2. Flujo del Jalador

### 2.1 Login + autenticación
- [ ] Login con `pedro@turescolombia.co` / `password123` (demo) funciona
- [ ] Login real con cuenta de Supabase Auth funciona
- [ ] `useRequireAuth(['jalador'])` redirige a `/login` si no logueado
- [ ] `useRequireAuth(['jalador'])` redirige a `/` si rol no es jalador

### 2.2 Dashboard del jalador (`/dashboard/jalador`)
- [ ] Carga sin crashear si Render devuelve datos parciales
- [ ] El link de ventas se muestra: `<dominio>/j/<refCode>/tours`
- [ ] Botón "Copiar" del link del jalador funciona
- [ ] Botón "🤖 Vender con Asistente IA" navega a `/agente?ref=<refCode>`
- [ ] Card motivacional muestra `commissions.pending` correcto
- [ ] KPIs (Ventas hoy/semana/mes) muestran números reales
- [ ] Lista de tours para vender se carga
- [ ] Cada card de tour muestra "💰 Ganas $X" (20% del precio)
- [ ] Botón "Compartir" abre WhatsApp con el mensaje correcto
- [ ] Botón 📋 copia el link del tour específico

> ⚠️ **Bugs identificados durante auditoría** (resolver antes de producción):
> - **B1:** `const { jalador, sales, commissions } = data` puede crashear si Render devuelve campos faltantes. **Fix:** defaults o optional chaining.
> - **B2:** El estado `linkCopied` es global — al copiar un tour específico, el botón del link del jalador (arriba) también muestra ✓. **Fix:** estados separados o índice del item copiado.
> - **B3:** Si `/tours` falla, no hay mensaje de error visible — solo `console.error`. **Fix:** mostrar error en UI.
> - **B4:** Las ventas NUEVAS del agente IA viven en Supabase (`sales` table). El dashboard lee de Render. **Las comisiones del agente NO aparecen acá.** Decidir: ¿unificar en Supabase, o sumar en el endpoint Render?
> - **B5:** Tour fields vienen camelCase desde Render (`coverImageUrl`) pero el agente usa snake_case desde Supabase (`cover_image_url`). Si en algún momento se mezclan datos, las imágenes desaparecen.

### 2.3 Link de ventas de jalador (`/j/<refCode>/tours`)
- [ ] Página carga sin login (es la página del cliente final)
- [ ] Se muestran los tours disponibles
- [ ] Tap en un tour → `/j/<refCode>/<tourSlug>` con flujo de reserva
- [ ] Datos del jalador (nombre + foto + score) visibles

### 2.4 Reserva con refCode
- [ ] El flujo de reserva preserva el `refCode` durante todo el proceso
- [ ] Tras el pago APPROVED, la `sale` queda con `jalador_ref_code` correcto
- [ ] La `commission` se genera automáticamente con `amount_cop = total × 20%`

### 2.5 Chat agente del jalador (`/agente?ref=<refCode>`)
- [ ] Banner amarillo "Modo demo" visible si `AGENT_LIVE` no está
- [ ] Saludo inicial aparece automático
- [ ] Sugerencias en grid 4×2 con fade en la 2da fila
- [ ] Mensaje "3 días, 600.000 pesos, 2 personas" → recibe recomendaciones
- [ ] Tour cards inline aparecen con foto, nombre, rating, precio
- [ ] Tap en una card → `/tour/<slug>`
- [ ] Mensaje "sí dale" → abre modal de reserva
- [ ] Modal con form: nombre, teléfono, email (opcional)
- [ ] "Generar link de pago" → muestra QR + URL Wompi sandbox + botón WhatsApp
- [ ] Si Supabase configurada: la `sale` queda persistida con `is_demo=true`

---

## 3. Flujo del Operador

### 3.1 Login
- [ ] Login con `operador1@turescolombia.co` / `password123` funciona

### 3.2 Dashboard (`/dashboard/operator`)
- [ ] KPIs (tours, bookings, revenue) cargan
- [ ] Lista de bookings del operador visible

### 3.3 Crear tour (`/dashboard/operator/tours/crear`)
- [ ] Form acepta nombre, descripción, precio adulto, duración, etc.
- [ ] URL de imagen se acepta como texto
- [ ] Submit crea el tour en backend Render
- [ ] El tour aparece en `/dashboard/operator/tours`

### 3.4 Editar tour
- [ ] `/dashboard/operator/tours/<id>/editar` precarga los datos
- [ ] Submit guarda los cambios
- [ ] El precio editado se refleja inmediatamente

### 3.5 Disponibilidad
- [ ] `/dashboard/operator/tours/<id>/disponibilidad` permite agregar fechas
- [ ] Bulk add (rango de fechas) funciona

---

## 4. Flujo del Admin

### 4.1 Login
- [ ] Login con `admin@turescolombia.co` / `password123` funciona

### 4.2 Dashboard (`/dashboard/admin`)
- [ ] Cards de métricas (jaladores, operadores, tours, bookings) cargan
- [ ] Click en cada card cambia de tab
- [ ] Notificaciones cargan
- [ ] Tab Jaladores: lista, edit, aprobar, suspender funcionan
- [ ] Tab Operadores: lista, edit, aprobar, suspender funcionan
- [ ] Tab Tours: lista, aprobar, rechazar funcionan
- [ ] Tab Bookings: lista visible
- [ ] Tab Reportes: chart de bookings por status

---

## 5. Páginas estáticas y auth

- [ ] `/` redirige correctamente según login/rol
- [ ] `/login` form funciona con Supabase + magic login (jalador)
- [ ] `/register` form crea usuario nuevo
- [ ] `/perfil` muestra datos del user logueado
- [ ] `/auth/callback` maneja OAuth de Google
- [ ] `/sitemap.xml` retorna 200 con tours dinámicos
- [ ] `/robots.txt` retorna 200
- [ ] `/api/og` retorna imagen 1200×630
- [ ] `/404` se muestra correctamente para rutas inexistentes

---

## 6. Modo Beta (BetaGate)

- [ ] Pantalla inicial muestra 4 botones de rol + botón Asesor IA
- [ ] "Probar el Asesor IA" abre `/asesor` (no debe quedar el gate encima)
- [ ] "Entrar como Turista/Jalador/Operador/Admin" loguea instantáneo
- [ ] Botón "🔄 Cambiar rol" en el header limpia y vuelve a `/`

---

## 7. Bugs/issues identificados (antes de producción)

| ID | Archivo | Bug | Prioridad |
|---|---|---|---|
| B1 | `pages/dashboard/jalador.tsx:45` | Crash si Render devuelve sales/commissions undefined | Alta |
| B2 | `pages/dashboard/jalador.tsx:15,180` | Estado linkCopied global confunde botones | Baja |
| B3 | `pages/dashboard/jalador.tsx:23` | Error de `/tours` solo logueado, sin UI feedback | Media |
| B4 | Arquitectura | Sales del agente (Supabase) no aparecen en KPIs (Render) | Alta |
| B5 | Arquitectura | Tour fields camelCase (Render) vs snake_case (Supabase) | Media |

---

## 8. Pre-flight para PRODUCCIÓN REAL

Cuando todos los checks de arriba estén ✅, **y** tengas:

- [ ] Cámara de Comercio + RUT
- [ ] Cuenta Wompi PRODUCCIÓN aprobada con KYC completo
- [ ] Llave `pub_prod_xxx` de Wompi
- [ ] Términos de servicio + política de privacidad publicados
- [ ] WhatsApp Business API o Bot de Telegram aprobado (opcional)

Hacer:

1. Aplicar `supabase/migrations/9999_reset_demo_data.sql` para borrar datos `is_demo=true`
2. En Vercel agregar:
   - `LAPERLA_MODE=production`
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_xxx`
3. Verificar 1 transacción real con tu propia tarjeta (monto bajo, ~$10.000 COP)
4. Confirmar que la `sale` queda con `is_demo=false` y la `commission` también
5. **Anunciar el lanzamiento.**

---

## Cómo usar este doc

1. Lo abres y lo recorres tap a tap mientras navegas la app
2. Marcas ✅ lo que funciona
3. Lo que no funciona, abrís un issue en GitHub o me lo dices y lo arreglamos
4. Cuando esté todo ✅ + lo legal, pasas a producción real

> Última actualización: 2026-05-03 (auditoría inicial post-merge PRs #2, #12, #13, #14)
