import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { checkPaymentStatus } from '../lib/wompi';

export default function PagoResultado() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'approved' | 'declined' | 'pending'>('loading');
  const [reference, setReference] = useState('');

  useEffect(() => {
    const { id } = router.query;
    if (!id) return;

    checkPaymentStatus(id as string)
      .then(result => {
        setReference(result.reference);
        if (result.status === 'APPROVED') setStatus('approved');
        else if (result.status === 'PENDING') setStatus('pending');
        else setStatus('declined');
      })
      .catch(() => setStatus('declined'));
  }, [router.query]);

  return (
    <Layout>
      <Head><title>Resultado del pago — La Perla</title></Head>
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FEF3E8' }}>
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #F5882A', borderTopColor: 'transparent' }}></div>
            </div>
            <h1 className="font-bold text-xl mb-2" style={{ color: '#222' }}>Verificando tu pago...</h1>
            <p className="text-sm" style={{ color: '#717171' }}>No cierres esta ventana</p>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#E8F5EF' }}>
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="font-bold text-xl mb-2" style={{ color: '#2D6A4F' }}>¡Pago exitoso!</h1>
            <p className="text-sm mb-2" style={{ color: '#717171' }}>Tu reserva ha sido confirmada</p>
            {reference && <p className="font-mono text-sm font-bold mb-6" style={{ color: '#F5882A' }}>{reference}</p>}
            <Link href="/mis-reservas" className="inline-block px-6 py-3 rounded-lg text-white font-semibold" style={{ background: '#222' }}>
              Ver mis reservas
            </Link>
          </>
        )}

        {status === 'declined' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FFF0F0' }}>
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="font-bold text-xl mb-2" style={{ color: '#CC3333' }}>Pago no aprobado</h1>
            <p className="text-sm mb-6" style={{ color: '#717171' }}>El pago fue rechazado. Puedes intentar de nuevo con otro método.</p>
            <button onClick={() => router.back()} className="inline-block px-6 py-3 rounded-lg text-white font-semibold" style={{ background: '#222' }}>
              Intentar de nuevo
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FEF3E8' }}>
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="font-bold text-xl mb-2" style={{ color: '#F5882A' }}>Pago pendiente</h1>
            <p className="text-sm mb-6" style={{ color: '#717171' }}>Estamos esperando la confirmación de tu banco. Te notificaremos por WhatsApp cuando se confirme.</p>
            <Link href="/explorar" className="inline-block px-6 py-3 rounded-lg text-white font-semibold" style={{ background: '#222' }}>
              Seguir explorando
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
