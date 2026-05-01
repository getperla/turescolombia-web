import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

export default function Custom404() {
  return (
    <Layout>
      <Head>
        <title>Playa no encontrada — La Perla</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-4">🏝️</div>
          <h1 className="font-display font-bold text-4xl mb-2" style={{ color: '#0A1628' }}>
            Playa no <span className="italic" style={{ color: '#F5882A' }}>encontrada</span>
          </h1>
          <p className="font-sans mb-8" style={{ color: '#C9A05C' }}>
            Parece que esta ruta no existe. Pero hay muchos tours increibles esperandote.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/explorar" className="btn-primary">Explorar tours</Link>
            <Link href="/" className="btn-outline" style={{ borderColor: '#FAEBD1', color: '#0D5C8A' }}>Ir al inicio</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
