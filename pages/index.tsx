import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Logo from '../components/Logo';

const roles = [
  { id: 'tourist', title: 'Soy Turista', subtitle: 'Quiero explorar y reservar tours', icon: '🏖️', href: '/explorar', bg: '#F5882A' },
  { id: 'jalador', title: 'Soy Jalador', subtitle: 'Quiero vender tours y ganar comisiones', icon: '💰', href: '/login?role=jalador', bg: '#222222' },
  { id: 'operator', title: 'Soy Operador', subtitle: 'Tengo tours y quiero publicarlos', icon: '🏢', href: '/login?role=operator', bg: '#222222' },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'admin') router.replace('/dashboard/admin');
      else if (user.role === 'operator') router.replace('/dashboard/operator');
      else if (user.role === 'jalador') router.replace('/dashboard/jalador');
      else router.replace('/explorar');
    }
  }, [user, loading, router]);

  if (loading || user) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse"><Logo size="lg" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header simple */}
      <div className="flex justify-between items-center px-6 py-4">
        <Logo />
        <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#222222' }}>
          Entrar
        </Link>
      </div>

      {/* Hero con logo grande */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="text-center max-w-lg mb-10">
          <div className="flex justify-center mb-6">
            <Logo size="xl" showText={false} />
          </div>
          <h1 className="font-bold text-4xl md:text-5xl mb-2 leading-tight" style={{ color: '#222222', fontFamily: '"DM Sans", sans-serif' }}>
            La <span style={{ color: '#C9A05C' }}>Perla</span>
          </h1>
          <p className="text-lg mb-1" style={{ color: '#717171' }}>
            Tours verificados en el Caribe colombiano
          </p>
          <p className="text-sm" style={{ color: '#B0B0B0' }}>
            Santa Marta · Tayrona · Sierra Nevada
          </p>
        </div>

        {/* Role selection — Airbnb clean */}
        <div className="w-full max-w-md space-y-3">
          {roles.map((role) => (
            <Link key={role.id} href={role.href}
              className="flex items-center gap-4 p-5 rounded-xl border transition-all hover:shadow-md group"
              style={{ borderColor: '#EBEBEB' }}>
              <span className="text-3xl">{role.icon}</span>
              <div className="flex-1">
                <div className="font-semibold" style={{ color: '#222222' }}>{role.title}</div>
                <div className="text-sm" style={{ color: '#717171' }}>{role.subtitle}</div>
              </div>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{ color: '#B0B0B0' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <p className="text-xs mt-8" style={{ color: '#B0B0B0' }}>
          Tours verificados · Pagos seguros · Santa Marta, Colombia
        </p>
      </div>
    </div>
  );
}
