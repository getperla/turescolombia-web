import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import Logo from './Logo';

export default function Layout({ children, hideSearch }: { children: React.ReactNode; hideSearch?: boolean }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) { api.get('/notifications/count').then(r => setUnreadCount(r.data?.count || 0)).catch(() => {}); }
  }, [user]);

  const dashboardPath = user
    ? user.role === 'admin' ? '/dashboard/admin'
    : user.role === 'operator' ? '/dashboard/operator'
    : user.role === 'jalador' ? '/dashboard/jalador'
    : null : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>
      {/* Header — Airbnb style */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#EBEBEB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Logo />
            </Link>

            {/* Nav links — simple */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/explorar" className="text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#222' }}>Tours</Link>
            </div>

            {/* Right nav */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {dashboardPath && (
                    <Link href={dashboardPath} className="hidden md:block text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-gray-100 transition-colors" style={{ color: '#222222' }}>
                      Mi Panel
                    </Link>
                  )}
                  <div className="relative flex items-center gap-1 border rounded-full px-3 py-1.5 cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: '#DDDDDD' }} onClick={() => setMenuOpen(!menuOpen)}>
                    <svg className="w-4 h-4" style={{ color: '#222222' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: '#222222' }}>
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#FF5F5F', fontSize: '10px' }}>{unreadCount}</span>
                    )}
                  </div>
                  {/* Dropdown */}
                  {menuOpen && (
                    <div className="absolute right-4 top-16 bg-white rounded-2xl shadow-xl border py-2 w-56 z-50" style={{ borderColor: '#EBEBEB' }}>
                      <div className="px-4 py-2 border-b" style={{ borderColor: '#EBEBEB' }}>
                        <div className="text-sm font-semibold" style={{ color: '#222222' }}>{user.name}</div>
                        <div className="text-xs" style={{ color: '#717171' }}>{user.email}</div>
                      </div>
                      {user.role === 'tourist' && <Link href="/mis-reservas" className="block px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#222222' }} onClick={() => setMenuOpen(false)}>Mis Reservas</Link>}
                      {dashboardPath && <Link href={dashboardPath} className="block px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#222222' }} onClick={() => setMenuOpen(false)}>Mi Panel</Link>}
                      <Link href="/perfil" className="block px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#222222' }} onClick={() => setMenuOpen(false)}>Mi Perfil</Link>
                      <div className="border-t my-1" style={{ borderColor: '#EBEBEB' }}></div>
                      <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#222222' }}>Cerrar sesion</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link href="/register" className="hidden md:block text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-gray-100 transition-colors" style={{ color: '#222222' }}>
                    Registrarse
                  </Link>
                  <Link href="/login" className="flex items-center gap-2 border rounded-full px-3 py-1.5 hover:shadow-md transition-shadow" style={{ borderColor: '#DDDDDD' }}>
                    <svg className="w-4 h-4" style={{ color: '#222222' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#717171' }}>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                  </Link>
                </>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer — clean */}
      <footer className="border-t py-8" style={{ borderColor: '#EBEBEB', background: '#F7F7F7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm" style={{ color: '#717171' }}>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#222222' }}>TuresColombia</h4>
              <p>Tours verificados en el Caribe colombiano. Reserva facil, paga seguro.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#222222' }}>Explorar</h4>
              <Link href="/tours" className="block hover:underline mb-1">Tours</Link>
              <Link href="/jaladores" className="block hover:underline mb-1">Jaladores</Link>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: '#222222' }}>Cuenta</h4>
              <Link href="/register" className="block hover:underline mb-1">Registrarse</Link>
              <Link href="/login" className="block hover:underline mb-1">Entrar</Link>
            </div>
          </div>
          <div className="border-t mt-6 pt-6 text-center text-xs" style={{ borderColor: '#EBEBEB', color: '#717171' }}>
            © 2026 TuresColombia · Tours verificados · Pagos seguros
          </div>
        </div>
      </footer>
    </div>
  );
}
