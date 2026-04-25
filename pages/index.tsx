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
    if (!user) return;

    setRedirecting(true);
    const path = user.role === 'admin' ? '/dashboard/admin'
      : user.role === 'operator' ? '/dashboard/operator'
      : user.role === 'jalador' ? '/dashboard/jalador'
      : '/explorar';
    router.replace(path);
  }, [user, loading, router]);

  if (loading || redirecting) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse"><Logo size="lg" /></div>
    </div>
  );

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
