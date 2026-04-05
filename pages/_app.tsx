import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>TuresColombia — Tours verificados en Santa Marta</title>
        <meta name="description" content="Reserva tours verificados en Santa Marta, Tayrona, Sierra Nevada y el Caribe colombiano. Pagos seguros, confirmacion por WhatsApp, codigo QR." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A1628" />

        {/* Open Graph — preview en WhatsApp, Facebook, LinkedIn */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="TuresColombia" />
        <meta property="og:title" content="TuresColombia — Tours en el Caribe colombiano" />
        <meta property="og:description" content="Descubre los mejores tours en Santa Marta, Tayrona y Sierra Nevada. Reserva facil, paga seguro, recibe confirmacion por WhatsApp." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&h=630&fit=crop&q=90" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="es_CO" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TuresColombia — Tours en el Caribe colombiano" />
        <meta name="twitter:description" content="Tours verificados en Santa Marta, Tayrona y Sierra Nevada. Reserva facil, confirmacion por WhatsApp." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&h=630&fit=crop&q=90" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
