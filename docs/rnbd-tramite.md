# RNBD - Tramite ante la SIC

> **Plan 4: compliance-dian-rnt-habeas-data (CMP-04)**
> Created: 2026-04-27

El Registro Nacional de Bases de Datos (RNBD) es un tramite **obligatorio** ante
la Superintendencia de Industria y Comercio (SIC) para cualquier empresa que
maneje datos personales de mas de 100 personas en Colombia.

La Perla / TourMarta debe radicar el RNBD antes de que el primer turista real
haga una reserva. El tramite tarda 2-4 semanas en aprobacion, asi que
**arrancarlo dia 1 de Phase 1** es critico.

## Checklist secuencial

### Pre-requisitos (1-2 dias)
- [ ] La Perla debe estar constituida como persona juridica (LLC o S.A.S) o tener un RUT activo a nombre del responsable.
- [ ] Tener el correo electronico institucional de privacidad operativo (ej. `privacidad@laperla.com.co`).
- [ ] Politica de Tratamiento de Datos publicada en el sitio web (`/politica-de-datos` ya esta lista).
- [ ] Asignar un Oficial de Privacidad (puede ser el mismo dev / fundador en una empresa de 1 persona).

### Identificacion de bases de datos a registrar
La Perla maneja al menos estas bases de datos personales:
- [ ] **base_usuarios_clientes** (turistas)
- [ ] **base_usuarios_jaladores** (vendedores comisionistas)
- [ ] **base_usuarios_operadores** (agencias de tours)
- [ ] **base_pagos_y_comisiones** (datos transaccionales con datos personales)
- [ ] **base_facturacion_dian** (datos de facturas con identificacion fiscal)

Para cada una se requiere:
- [ ] Nombre de la base
- [ ] Finalidad
- [ ] Cantidad estimada de titulares
- [ ] Tipo de datos (sensibles / no sensibles)
- [ ] Encargado del tratamiento (Supabase, Wompi, Alegra, etc.)
- [ ] Pais donde se almacenan (Colombia, USA, etc.)
- [ ] Politicas y procedimientos de tratamiento
- [ ] Mecanismos de seguridad (encripcion, control de acceso, RLS en Supabase)

### Radicacion en linea
- [ ] Crear cuenta en el portal SIC: https://rnbd.sic.gov.co
- [ ] Completar formulario de inscripcion del responsable (datos de la empresa).
- [ ] Por cada base de datos, completar el formulario respectivo.
- [ ] Adjuntar la Politica de Tratamiento de Datos (PDF generado desde `/politica-de-datos`).
- [ ] Adjuntar evidencia del consentimiento (screenshots del checkbox NO pre-marcado del signup).
- [ ] Pagar la tarifa de inscripcion (alrededor de $200K-$500K COP segun cantidad de bases).
- [ ] Recibir numero de tramite — guardarlo en `docs/rnbd-numero-tramite.txt` (gitignored).

### Post-radicacion
- [ ] Esperar respuesta de la SIC (2-4 semanas).
- [ ] Si aprueba, recibir constancia oficial de inscripcion.
- [ ] Guardar la constancia en `docs/legal/` (encripto con git-crypt o fuera del repo).
- [ ] Actualizar STATE.md marcando CMP-04 como done.
- [ ] Programar revision anual del RNBD (legal lo requiere).

## Recursos
- Guia oficial SIC: https://www.sic.gov.co/proteccion-de-datos-personales
- Formulario en linea: https://rnbd.sic.gov.co
- Costos vigentes: consultar tarifas actualizadas SIC ano corriente

## Riesgos de no hacerlo
- Multas SIC hasta 2.000 SMMLV (~$2.6 mil millones COP en 2026).
- Imposibilidad de operar legalmente.
- Posible bloqueo del dominio o suspension de cuenta Wompi.

---
*Si avanzas esta tarea, marca el item arriba y agrega la fecha. Cuando termines, mover este archivo a `docs/legal/rnbd-completed.md`.*
