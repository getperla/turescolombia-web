import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';
// BetaGate eliminado del wrap por defecto. La pantalla inicial ahora muestra
// la home pública. El BetaGate sigue importable para uso interno (testing
// de roles), pero no envuelve la app.

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>La Perla — Tours verificados en Santa Marta</title>
        <meta name="description" content="Reserva tours verificados en Santa Marta, Tayrona, Sierra Nevada y el Caribe colombiano. Pagos seguros, confirmacion por WhatsApp, codigo QR." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0A1628" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="La Perla" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* Open Graph — preview en WhatsApp, Facebook, LinkedIn */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="La Perla" />
        <meta property="og:title" content="La Perla — Tours verificados en Santa Marta" />
        <meta property="og:description" content="Reserva tours en Tayrona, Sierra Nevada y el Caribe colombiano. Pago seguro, confirmacion por WhatsApp, codigo QR." />
        <meta property="og:image" content="https://tourmarta-web.vercel.app/api/og" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="es_CO" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="La Perla — Tours verificados en Santa Marta" />
        <meta name="twitter:description" content="Reserva tours en Tayrona, Sierra Nevada y el Caribe colombiano. Pago seguro, confirmacion por WhatsApp." />
        <meta name="twitter:image" content="https://tourmarta-web.vercel.app/api/og" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
