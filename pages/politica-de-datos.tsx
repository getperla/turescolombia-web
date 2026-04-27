// Politica de tratamiento de datos personales (Habeas Data)
// Plan 4: compliance-dian-rnt-habeas-data (CMP-02, CMP-03, CMP-04)
// Created: 2026-04-27
//
// Texto base segun template SIC. La Perla debe radicar RNBD ante SIC
// con esta politica como anexo (ver docs/rnbd-tramite.md).
//
// Version: 2026-04-27-v1
// Cuando se modifique, incrementar version y actualizar fecha de vigencia.

import Head from 'next/head';

export default function PoliticaDeDatos(): JSX.Element {
  return (
    <>
      <Head>
        <title>Política de tratamiento de datos | La Perla</title>
        <meta name="description" content="Política de tratamiento de datos personales — Habeas Data" />
      </Head>

      <main className="mx-auto max-w-3xl px-4 py-10 text-gray-900">
        <h1 className="mb-2 text-3xl font-bold">Política de tratamiento de datos personales</h1>
        <p className="mb-6 text-sm text-gray-500">
          Vigente desde: 27 de abril de 2026 · Versión 2026-04-27-v1
        </p>

        <article className="prose max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Identificación del responsable</h2>
            <p>
              <strong>La Perla / TourMarta</strong>, identificada con NIT [POR DEFINIR],
              con domicilio en Santa Marta, Magdalena, Colombia, es la responsable del
              tratamiento de los datos personales recolectados a través de la plataforma
              <code className="mx-1">tourmarta-web.vercel.app</code>.
            </p>
            <p>
              <strong>Contacto:</strong> [email de privacidad por definir]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Marco legal</h2>
            <p>
              Esta política se ajusta a la Ley 1581 de 2012 (Habeas Data), el Decreto 1377
              de 2013, el Decreto 090 de 2018 y las guías de la Superintendencia de
              Industria y Comercio (SIC) sobre el tratamiento de datos personales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Finalidades del tratamiento</h2>
            <p>Los datos recolectados se usan para:</p>
            <ul className="list-disc pl-6">
              <li>Crear y administrar la cuenta del usuario en la plataforma.</li>
              <li>Procesar reservas, pagos y comisiones entre turistas, jaladores y operadores.</li>
              <li>Emitir facturas electrónicas según la normativa DIAN.</li>
              <li>Comunicar el estado de las reservas y avisos operativos del servicio.</li>
              <li>Cumplir con obligaciones legales (DIAN, RNT, Habeas Data, prevención de lavado).</li>
              <li>Mejorar la calidad del servicio mediante análisis agregado y anónimo.</li>
            </ul>
            <p>
              <strong>NO se usan</strong> los datos para enviar publicidad de terceros sin
              consentimiento explícito y separado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Datos recolectados</h2>
            <ul className="list-disc pl-6">
              <li>Identificación: nombre, documento, correo, teléfono.</li>
              <li>Datos comerciales: historial de reservas, pagos realizados, comisiones generadas.</li>
              <li>Datos del operador: NIT/RUT, RNT, cuenta bancaria (encriptada).</li>
              <li>Datos técnicos: IP, navegador, dispositivo (vía cookies estrictamente necesarias).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Derechos del titular</h2>
            <p>Todo titular de datos tiene derecho a:</p>
            <ul className="list-disc pl-6">
              <li>Conocer, actualizar y rectificar sus datos.</li>
              <li>Solicitar prueba de la autorización otorgada.</li>
              <li>Ser informado sobre el uso de sus datos.</li>
              <li>Presentar quejas ante la SIC (<a href="https://www.sic.gov.co" className="text-blue-600 underline">www.sic.gov.co</a>).</li>
              <li>Revocar la autorización y/o solicitar la supresión de sus datos.</li>
              <li>Acceder gratuitamente a sus datos personales objeto de tratamiento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Procedimiento para ejercer derechos</h2>
            <p>
              El titular puede enviar solicitudes al correo de privacidad indicado arriba.
              La Perla responderá en máximo <strong>15 días hábiles</strong> según lo
              establecido en la Ley 1581 de 2012, art. 14.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Transferencia y transmisión a terceros</h2>
            <p>Datos pueden compartirse con:</p>
            <ul className="list-disc pl-6">
              <li><strong>Wompi</strong> (procesador de pagos): solo datos necesarios para la transacción.</li>
              <li><strong>Alegra/Siigo</strong> (facturación electrónica): datos del comprador para emisión DIAN.</li>
              <li><strong>Supabase</strong> (proveedor de infraestructura): datos almacenados encriptados.</li>
              <li><strong>Autoridades</strong>: cuando sea requerido por orden judicial o normativa.</li>
            </ul>
            <p>Todos los terceros tienen acuerdos de tratamiento de datos vigentes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Vigencia y cambios</h2>
            <p>
              Esta política rige desde la fecha indicada y permanece vigente mientras los
              datos sean necesarios para las finalidades descritas o hasta que el titular
              solicite su supresión. Cualquier modificación será comunicada con 30 días de
              anticipación a través de la plataforma.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}

// Esta version se referencia en operators_compliance.habeas_data_version
// cuando un operador acepta. Si cambias la politica, actualiza esto:
PoliticaDeDatos.version = '2026-04-27-v1';
