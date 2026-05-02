import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ChatAgente from '../components/agente/ChatAgente';

export default function AgentePage() {
  const router = useRouter();
  const refCode = typeof router.query.ref === 'string' ? router.query.ref : undefined;

  const handleReservaLista = (datos: { message: string; quiereReservar: boolean }) => {
    // Cuando el agente detecta que el cliente quiere reservar, aqui
    // disparariamos el flujo de creacion de booking + link de pago Wompi.
    // Pendiente para Fase 2.
    console.log('Reserva lista para procesar:', datos);
  };

  return (
    <Layout>
      <Head>
        <title>Asistente de Ventas — La Perla</title>
      </Head>
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '16px',
          height: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ChatAgente refCode={refCode} onReservaLista={handleReservaLista} />
      </div>
    </Layout>
  );
}
