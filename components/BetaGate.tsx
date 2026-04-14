import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Logo from './Logo';

const BETA_KEY = 'laperla_beta';

type BetaRole = 'tourist' | 'jalador' | 'operator' | 'admin';

const roles: { id: BetaRole; label: string; icon: string; desc: string; path: string; color: string }[] = [
  { id: 'tourist', label: 'Entrar como Turista', icon: '🏖️', desc: 'Explorar y reservar tours', path: '/explorar', color: '#F5882A' },
  { id: 'jalador', label: 'Entrar como Jalador', icon: '💰', desc: 'Vender tours y ganar comisiones', path: '/dashboard/jalador', color: '#2D6A4F' },
  { id: 'operator', label: 'Entrar como Operador', icon: '🏢', desc: 'Publicar y gestionar tours', path: '/dashboard/operator', color: '#0D5C8A' },
  { id: 'admin', label: 'Entrar como Admin', icon: '⚙️', desc: 'Panel de administración completo', path: '/dashboard/admin', color: '#222222' },
];

// Demo users — match seed data
const demoCredentials: Record<BetaRole, { email: string; password: string }> = {
  tourist: { email: 'turista1@turescolombia.co', password: 'password123' },
  jalador: { email: 'pedro@turescolombia.co', password: 'password123' },
  operator: { email: 'operador1@turescolombia.co', password: 'password123' },
  admin: { email: 'admin@turescolombia.co', password: 'password123' },
};

export function isBetaActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(BETA_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed?.betaMode === true && !!parsed?.role;
  } catch { return false; }
}

export function getBetaRole(): BetaRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(BETA_KEY);
    if (!stored) return null;
    return JSON.parse(stored)?.role || null;
  } catch { return null; }
}

export function clearBeta() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BETA_KEY);
  }
}

export default function BetaGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState<BetaRole | null>(null);

  useEffect(() => {
    // Check if user already has a real auth token
    const token = localStorage.getItem('turescol_token');
    const user = localStorage.getItem('turescol_user');
    if (token && user) {
      setLoading(false);
      return;
    }

    // Check if beta mode is active
    if (isBetaActive()) {
      setLoading(false);
      return;
    }

    // Show beta gate
    setShow(true);
    setLoading(false);
  }, []);

  const enterBeta = async (role: BetaRole) => {
    setLoggingIn(role);
    setLoginError('');

    const creds = demoCredentials[role];
    const target = roles.find(r => r.id === role);
    const path = target?.path || '/explorar';

    try {
      // Try to actually login with demo credentials
      const api = (await import('../lib/api')).default;
      const { data } = await api.post('/auth/login', { email: creds.email, password: creds.password });

      // Save real auth token
      localStorage.setItem('turescol_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('turescol_refresh', data.refresh_token);
      localStorage.setItem('turescol_user', JSON.stringify(data.user));
    } catch {
      // If login fails, still allow beta access with a fake token + user
      // NOTE: a token is required so that AuthProvider loads the user on next mount
      const fakeUser = { id: 0, name: `Demo ${role}`, email: creds.email, role };
      localStorage.setItem('turescol_token', 'beta-demo-token');
      localStorage.setItem('turescol_user', JSON.stringify(fakeUser));
    }

    // Save beta flag
    localStorage.setItem(BETA_KEY, JSON.stringify({ role, betaMode: true }));

    // Hard navigation forces AuthProvider to re-read localStorage on remount,
    // otherwise its internal state stays null and useRequireAuth kicks us back to /login
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse"><Logo size="lg" /></div>
      </div>
    );
  }

  if (!show) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <Logo size="xl" showText={false} />
      </div>
      <h1 className="font-bold text-3xl md:text-4xl mb-1 text-center" style={{ color: '#222', fontFamily: '"DM Sans", sans-serif' }}>
        La <span style={{ color: '#C9A05C' }}>Perla</span>
      </h1>
      <p className="text-sm mb-2 text-center" style={{ color: '#717171' }}>
        Tours verificados en el Caribe colombiano
      </p>

      {/* Beta badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: '#FEF3E8', border: '1px solid #F5882A' }}>
        <span className="text-sm">🚧</span>
        <span className="text-sm font-semibold" style={{ color: '#F5882A' }}>Versión Beta — Estamos en pruebas</span>
      </div>

      {/* Role buttons */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => enterBeta(role.id)}
            disabled={loggingIn !== null}
            className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
            style={{ borderColor: loggingIn === role.id ? role.color : '#EBEBEB' }}
          >
            <span className="text-2xl">{role.icon}</span>
            <div className="flex-1 text-left">
              <div className="font-semibold text-sm" style={{ color: '#222' }}>
                {loggingIn === role.id ? 'Entrando...' : role.label}
              </div>
              <div className="text-xs" style={{ color: '#717171' }}>{role.desc}</div>
            </div>
            <svg className="w-5 h-5" style={{ color: '#B0B0B0' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {loginError && (
        <p className="text-xs mb-4 text-center" style={{ color: '#CC3333' }}>{loginError}</p>
      )}

      {/* Normal login link */}
      <button
        onClick={() => { setShow(false); router.push('/login'); }}
        className="text-xs underline mb-6" style={{ color: '#717171' }}
      >
        Ya tengo cuenta, iniciar sesión normal
      </button>

      <p className="text-xs" style={{ color: '#B0B0B0' }}>
        Santa Marta · Tayrona · Sierra Nevada
      </p>
    </div>
  );
}
