// Terminos y condiciones de La Perla / TourMarta
// Plan 4: compliance-dian-rnt-habeas-data (CMP-07)
// Created: 2026-04-27
//
// IMPORTANTE: este archivo es un BORRADOR. ANTES de production debe ser
// revisado y firmado por un abogado especialista en derecho comercial colombiano,
// en particular sobre la figura de "agente independiente" para el jalador
// (clave para que La Perla NO sea considerada empleadora).
//
// Version: 2026-04-27-v1-DRAFT

import Head from 'next/head';

export default function Terminos(): JSX.Element {
  return (
    <>
      <Head>
        <title>Términos y condiciones | La Perla</title>
        <meta name="description" content="Términos y condiciones de uso de la plataforma La Perla" />
      </Head>

      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-900">
        <h1 className="mb-2 text-3xl font-bold">Términos y condiciones</h1>
        <p className="mb-6 text-sm text-gray-500">
          Vigente desde: 27 de abril de 2026 · Versión 2026-04-27-v1 (BORRADOR — pendiente de revisión legal)
        </p>

        <div className="mb-6 rounded border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800">
          ⚠ Este documento es un borrador inicial. Antes de operar comercialmente debe
          ser validado por un abogado especialista en derecho comercial colombiano.
        </div>

        <article className="prose max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Aceptación</h2>
            <p>
              Al usar la plataforma La Perla / TourMarta (en adelante "La Perla"),
              el usuario acepta estos términos y la
              <a href="/politica-de-datos" className="mx-1 text-blue-600 underline">Política de tratamiento de datos</a>.
              Si no está de acuerdo, debe abstenerse de usar la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descripción del servicio</h2>
            <p>
              La Perla es una plataforma tecnológica que conecta a turistas con
              operadores turísticos y vendedores ("jaladores") en la región de
              Santa Marta, Magdalena. La Perla NO es operador turístico, NO ejecuta
              tours y NO es empleadora de los jaladores ni operadores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Roles de usuario</h2>
            <ul className="list-disc pl-6">
              <li><strong>Turista</strong>: cliente final que reserva tours.</li>
              <li><strong>Jalador</strong>: vendedor independiente que comparte tours y recibe comisión por venta. <strong>NO es empleado de La Perla</strong>.</li>
              <li><strong>Operador</strong>: agencia o persona que ejecuta tours. Mantiene su propia personalidad jurídica, RNT y RUT.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Cláusula del jalador como agente independiente</h2>
            <p>
              <strong>El jalador es un agente comercial independiente.</strong> No existe
              relación laboral entre La Perla y el jalador. El jalador:
            </p>
            <ul className="list-disc pl-6">
              <li>Trabaja por cuenta propia, sin horario, sin subordinación, sin exclusividad.</li>
              <li>Es responsable de su propia declaración de renta sobre las comisiones recibidas.</li>
              <li>La Perla NO retiene impuestos ni paga aportes a seguridad social en su nombre.</li>
              <li>La comisión se paga por venta efectivamente cobrada, no por horas ni por tareas.</li>
              <li>Puede vincularse libremente con otras plataformas competidoras.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Pagos y comisiones</h2>
            <p>
              Los pagos se procesan a través de Wompi. La Perla cobra una comisión
              porcentual sobre cada venta (ver tarifa vigente en
              <a href="/comisiones" className="mx-1 text-blue-600 underline">/comisiones</a>).
              Las comisiones del jalador se acreditan tras la finalización del tour
              y un período de retención de 24 horas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Cancelaciones y reembolsos</h2>
            <p>
              Cada operador define su política de cancelación (Flexible, Moderada,
              Estricta). El reembolso, si procede, se hace al medio de pago original
              vía Wompi en un plazo de 5–10 días hábiles. Si el reembolso ocurre
              después de que la comisión del jalador fue liberada, La Perla podrá
              dejar el saldo del jalador en negativo hasta cubrir el reembolso, con
              límite de -$50.000 COP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Responsabilidades</h2>
            <ul className="list-disc pl-6">
              <li>El operador es responsable de la calidad, seguridad y legalidad del tour.</li>
              <li>El jalador responde por la veracidad de la información que comparte sobre el tour.</li>
              <li>El turista debe verificar las condiciones del tour antes de pagar.</li>
              <li>La Perla actúa como intermediario tecnológico y no responde por daños causados por el operador o el jalador.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Suspensión de cuenta</h2>
            <p>
              La Perla puede suspender o cancelar cuentas que incumplan estos
              términos, con o sin aviso previo, en casos como: fraude, conducta
              abusiva, saldo negativo del jalador no cubierto, o RNT vencido del
              operador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Ley aplicable y jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia.
              Cualquier disputa será resuelta en los tribunales de Santa Marta,
              Magdalena, salvo arbitraje pactado por las partes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contacto</h2>
            <p>
              Para preguntas sobre estos términos: [email de contacto por definir].
            </p>
          </section>
        </article>
      </main>
    </>
  );
}

Terminos.version = '2026-04-27-v1-DRAFT';
