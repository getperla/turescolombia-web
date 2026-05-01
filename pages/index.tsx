import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import Link from 'next/link';
import PearlSpinner from '../components/PearlSpinner';
import { isBetaActive, getBetaRole } from '../components/BetaGate';

const LOADING_TIMEOUT_MS = 3000;

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: si AuthProvider queda colgado en 'loading' (ej: red lenta,
  // localStorage corrupto), tras LOADING_TIMEOUT_MS dejamos que el render
  // continue. Si no hay sesion, BetaGate maneja la pantalla.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (loading && !timedOut) return;

    // Si hay usuario real, redirigir a su dashboard.
    if (user) {
      setRedirecting(true);
      const path = user.role === 'admin' ? '/dashboard/admin'
        : user.role === 'operator' ? '/dashboard/operator'
        : user.role === 'jalador' ? '/dashboard/jalador'
        : '/explorar';
      router.replace(path);
      return;
    }

    // Si esta en modo beta, redirigir por rol elegido.
    if (isBetaActive()) {
      setRedirecting(true);
      const role = getBetaRole();
      const path = role === 'admin' ? '/dashboard/admin'
        : role === 'operator' ? '/dashboard/operator'
        : role === 'jalador' ? '/dashboard/jalador'
        : '/explorar';
      router.replace(path);
    }
  }, [user, loading, timedOut, router]);

  // Solo mostramos el spinner mientras AuthProvider esta cargando Y no
  // se cumplio el timeout, o cuando ya estamos redirigiendo.
  if ((loading && !timedOut) || redirecting) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <PearlSpinner size="lg" />
    </div>
  );

  // If no user and no beta — BetaGate in _app.tsx will show the gate screen
  // This is the fallback content if BetaGate is bypassed (e.g., direct login)
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ color: '#222' }}>
            Descubre el Caribe colombiano
          </h1>
          <p style={{ color: '#717171' }}>
            Tours verificados en Santa Marta, Tayrona y Sierra Nevada
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Link href="/explorar" className="btn-primary">Explorar tours</Link>
          <Link href="/login" className="btn-outline">Iniciar sesión</Link>
        </div>
      </div>
    </Layout>
  );
}
