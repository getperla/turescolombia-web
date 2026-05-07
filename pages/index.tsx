import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    // If user is logged in, redirect to their dashboard
    if (user) {
      setRedirecting(true);
      const path = user.role === 'admin' ? '/dashboard/admin'
        : user.role === 'operator' ? '/dashboard/operator'
        : user.role === 'jalador' ? '/dashboard/jalador'
        : '/explorar';
      router.replace(path);
      return;
    }
  }, [user, loading, router]);

  // Show loading only briefly while redirecting
  if (loading || redirecting) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse"><Logo size="lg" /></div>
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
