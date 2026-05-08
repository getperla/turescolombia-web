# Deuda tecnica — La Perla

Log humano-legible de decisiones aplazadas. Cada entrada explica el
**estado**, el **origen**, el **por que se aplazo**, y los **triggers** que
indicarian que toca atender la deuda.

> Reglas de uso:
> - Si aplazas algo en un PR, agregalo aqui en el mismo PR
> - Si atiendes una deuda, marca el estado como `cerrada` y referencia el PR
> - No metas trabajo "por si acaso" — solo deuda concreta con triggers claros

---

## user_metadata → tabla profiles

- **Estado:** deuda activa
- **Origen:** PR de dashboard jalador (mayo 2026, PR A — foundation)
- **Por que se aplazo:** alcance del PR. Crear una tabla `profiles`
  espejo de `auth.users` con triggers de sync requiere su propia
  migration, RLS, y migracion de los users existentes. Para lecturas
  individuales (un jalador viendo su propio panel) `user_metadata`
  funciona bien.
- **Cuando revisitar:** cuando se necesite alguna de estas queries:
  - Ranking de jaladores por rating ("top 10 con mejor calificacion")
  - Top jaladores por ventas del mes
  - Buscar jaladores por zona/ciudad
  - Cualquier `JOIN` entre datos de usuario y agregados
- **Triggers que indican que toca migrar:**
  - Estamos haciendo N+1 queries (loop de `getUser` por cada jalador en
    una lista)
  - Necesitamos indices sobre campos de usuario (`role`, `zone`,
    `refCode`) y `auth.users.raw_user_meta_data` no se indexa bien
  - Algun feature pide query cruzada que no se puede expresar sin JOIN
- **Aprox del trabajo:** 1 PR mediano:
  - Migration `0004_profiles.sql` con tabla espejo
  - Trigger `on_auth_user_created` que populea `profiles` automaticamente
  - Backfill de los users existentes (UPDATE desde `raw_user_meta_data`)
  - Refactor de `dashboard/jalador.tsx`, `register.tsx`, `auth/callback.tsx`
    para leer/escribir en `profiles` ademas de en `user_metadata`
  - Eventualmente, mover el primary read source a `profiles` y mantener
    `user_metadata` como denormalizacion

---

## Pendientes "indicador de pagos pendientes" en dashboard jalador

- **Estado:** pendiente, baja prioridad
- **Origen:** PR dashboard jalador (mayo 2026)
- **Por que se aplazo:** el alcance del PR del dashboard ya era grande.
  Las cards muestran solo `paid` (decision #3 del brief).
- **Cuando revisitar:** despues del primer mes en produccion, cuando
  tengamos data real de `pending` vs `paid` y sepamos cuanto vale para el
  jalador ver "esperando pago"
- **Trigger:** jalador pregunta "¿como veo mis ventas que aun no se han
  pagado?" o queja de "no veo todas mis ventas en el panel"
- **Aprox del trabajo:** mini-card debajo de las 3 principales,
  `2 ventas pendientes — $180.000` con link a detalle

---

## Tests automaticos (coverage 0%)

- **Estado:** deuda activa, alta prioridad post-launch
- **Origen:** desde el inicio del proyecto. CLAUDE.md explicitamente dice
  "Coverage actual es 0%. Cualquier feature nuevo debe nacer con tests al
  menos del flujo critico."
- **Por que se aplazo:** pre-launch (abril 2026) la prioridad era tener
  feature parity con la "tiquetera fisica". Tests se aplazaron sabiendo
  que se pagaria el costo despues.
- **Cuando revisitar:** ya. Cualquier PR nuevo deberia traer tests del
  flujo critico (registro, booking, pago).
- **Trigger:** primer regresion en produccion donde un cambio rompe algo
  que un test hubiera atrapado.

---

## Magic login para jalador

- **Estado:** removido
- **Origen:** legacy. Existia en login.tsx hasta PR #29
- **Decision:** eliminado. Si el jalador olvida su password, sera
  "Recuperar contrasena" cuando lo activemos (`Proximamente` en login).

---

## Backend Render legacy

- **Estado:** desuso parcial
- **Origen:** stack pre-Supabase
- **Por que sigue en codigo:** algunos endpoints (`/tours`, `/dashboard/operator`,
  `/notifications`) aun pegan a Render legacy. PR #26 y #32 eliminaron
  los criticos (booking, dashboard jalador).
- **Cuando revisitar:** cuando un endpoint de Render falle, o cuando se
  necesite agregar una feature que pegue ahi. Lo mas probable es que
  reemplacemos endpoint por endpoint hasta que Render se pueda apagar.
- **Trigger:** cualquier 401 nuevo o latencia alta en Render.
