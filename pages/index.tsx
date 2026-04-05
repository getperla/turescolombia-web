import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Logo from '../components/Logo';

const roles = [
  {
    id: 'tourist',
    title: 'Turista',
    subtitle: 'Quiero explorar y reservar tours',
    icon: '🏖️',
    href: '/explorar',
    gradient: 'linear-gradient(135deg, #0D5C8A, #00B4CC)',
  },
  {
    id: 'jalador',
    title: 'Asesor / Jalador',
    subtitle: 'Quiero vender tours y ganar comisiones',
    icon: '💰',
    href: '/login?role=jalador',
    gradient: 'linear-gradient(135deg, #F5882A, #FF5F5F)',
  },
  {
    id: 'operator',
    title: 'Operador',
    subtitle: 'Tengo tours y quiero publicarlos',
    icon: '🏢',
    href: '/login?role=operator',
    gradient: 'linear-gradient(135deg, #2D6A4F, #00B4CC)',
  },
  {
    id: 'admin',
    title: 'Administrador',
    subtitle: 'Gestionar la plataforma',
    icon: '⚙️',
    href: '/login?role=admin',
    gradient: 'linear-gradient(135deg, #0A1628, #0D5C8A)',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Si ya está logueado, redirigir según su rol
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'admin') router.replace('/dashboard/admin');
      else if (user.role === 'operator') router.replace('/dashboard/operator');
      else if (user.role === 'jalador') router.replace('/dashboard/jalador');
      else router.replace('/explorar');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDF3E3' }}>
        <p className="text-arena-600 font-sans">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
      {/* Header */}
      <div className="text-center pt-12 pb-6 px-4">
        <div className="text-white mb-6">
          <Logo size="lg" />
        </div>
        <h1 className="font-display font-bold text-white mb-3" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
          Bienvenido al <span className="italic" style={{ color: '#F5882A' }}>Caribe</span>
        </h1>
        <p className="font-sans text-white/60 max-w-md mx-auto" style={{ fontWeight: 300, fontSize: '16px', lineHeight: 1.6 }}>
          La plataforma de turismo de Santa Marta. Selecciona tu perfil para comenzar.
        </p>
      </div>

      {/* Role cards */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={role.href}
              className="group block rounded-card p-6 text-white transition-all duration-300 hover:-translate-y-2"
              style={{
                background: role.gradient,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              <div className="text-4xl mb-3">{role.icon}</div>
              <h3 className="font-display font-bold text-xl mb-1">{role.title}</h3>
              <p className="text-white/70 text-sm font-sans" style={{ fontWeight: 300 }}>
                {role.subtitle}
              </p>
              <div className="mt-4 flex items-center gap-1 text-white/50 text-xs font-sans font-medium group-hover:text-white/80 transition-colors">
                Continuar
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4">
        <p className="text-white/30 text-xs font-sans">
          Tours verificados · Pagos seguros · Santa Marta, Colombia
        </p>
      </div>
    </div>
  );
}
