import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import Logo from './Logo';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/notifications/count').then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
    }
  }, [user]);

  const dashboardPath = user
    ? user.role === 'admin' ? '/dashboard/admin'
    : user.role === 'operator' ? '/dashboard/operator'
    : user.role === 'jalador' ? '/dashboard/jalador'
    : null
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FDF3E3' }}>
      {/* Navbar — oscuro premium */}
      <header className="sticky top-0 z-50" style={{ background: '#0A1628' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-white hover:opacity-90 transition-opacity">
              <Logo />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/tours" className="px-4 py-2 rounded-pill text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                Tours
              </Link>
              <Link href="/jaladores" className="px-4 py-2 rounded-pill text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                Asesores
              </Link>
              {user ? (
                <>
                  {user.role === 'tourist' && (
                    <Link href="/mis-reservas" className="px-4 py-2 rounded-pill text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                      Mis Reservas
                    </Link>
                  )}
                  {dashboardPath && (
                    <Link href={dashboardPath} className="px-4 py-2 rounded-pill text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                      Mi Panel
                    </Link>
                  )}
                  <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/20">
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#FF5F5F', fontSize: '10px' }}>{unreadCount}</span>
                    )}
                    <span className="text-sm text-white/60">{user.name}</span>
                    <button onClick={logout} className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1.5 rounded-pill transition-all">
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/20">
                  <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2">
                    Entrar
                  </Link>
                  <Link href="/register" className="text-sm font-semibold px-5 py-2 rounded-pill transition-all hover:-translate-y-0.5" style={{ background: '#F5882A', color: 'white' }}>
                    Registrarse
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-4 py-3 space-y-1" style={{ background: '#0A1628', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Link href="/tours" className="block py-3 px-4 text-lg font-medium text-white/80 rounded-2xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Tours
            </Link>
            <Link href="/jaladores" className="block py-3 px-4 text-lg font-medium text-white/80 rounded-2xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Asesores
            </Link>
            {user ? (
              <>
                {user.role === 'tourist' && (
                  <Link href="/mis-reservas" className="block py-3 px-4 text-lg font-medium text-white/80 rounded-2xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                    Mis Reservas
                  </Link>
                )}
                {dashboardPath && (
                  <Link href={dashboardPath} className="block py-3 px-4 text-lg font-medium text-white/80 rounded-2xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                    Mi Panel
                  </Link>
                )}
                <button onClick={logout} className="block w-full text-left py-3 px-4 text-lg font-medium rounded-2xl text-white/40 hover:bg-white/10">
                  Salir ({user.name})
                </button>
              </>
            ) : (
              <div className="pt-2 space-y-2 border-t border-white/10 mt-2">
                <Link href="/login" className="block py-3 px-4 text-lg font-medium text-white/80 rounded-2xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                  Entrar
                </Link>
                <Link href="/register" className="block py-3 px-4 text-lg font-semibold rounded-pill text-center text-white" style={{ background: '#F5882A' }} onClick={() => setMenuOpen(false)}>
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer — oscuro premium */}
      <footer style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }} className="text-white/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="mb-3 text-white"><Logo /></div>
              <p className="text-sm leading-relaxed">Vive las mejores experiencias turisticas de Colombia. Tours verificados, pagos seguros.</p>
            </div>
            <div>
              <h4 className="text-white font-display font-semibold text-lg mb-3">Explorar</h4>
              <div className="space-y-2 text-sm">
                <Link href="/tours" className="block hover:text-white transition-colors">Tours</Link>
                <Link href="/jaladores" className="block hover:text-white transition-colors">Asesores turisticos</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-display font-semibold text-lg mb-3">Tu cuenta</h4>
              <div className="space-y-2 text-sm">
                <Link href="/register" className="block hover:text-white transition-colors">Registrarse</Link>
                <Link href="/login" className="block hover:text-white transition-colors">Entrar</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-white/40">
            Tours verificados · Asesores de confianza · Pagos seguros
          </div>
        </div>
      </footer>
    </div>
  );
}
