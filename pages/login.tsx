import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registered = router.query.registered === '1';
  const role = router.query.role as string || '';
  const redirect = (router.query.redirect as string) || null;

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    try {
      const user = await login(loginEmail, loginPassword);
      if (redirect) {
        router.push(redirect);
      } else if (user.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (user.role === 'operator') {
        router.push('/dashboard/operator');
      } else if (user.role === 'jalador') {
        router.push('/dashboard/jalador');
      } else {
        router.push('/explorar');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await doLogin(email, password);
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // Google OAuth redirect
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google login no esta configurado aun');
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
    const scope = encodeURIComponent('email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&prompt=select_account`;
  };

  const roleTitle = role === 'jalador' ? 'Jalador'
    : role === 'operator' ? 'Operador'
    : role === 'admin' ? 'Administrador'
    : '';

  return (
    <Layout>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Card principal */}
          <div className="bg-white rounded-card shadow-card p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, #0A1628, #0D5C8A)' }}>
                  {role === 'jalador' ? '💰' : role === 'operator' ? '🏢' : role === 'admin' ? '⚙️' : '🏖️'}
                </div>
              </div>
              <h1 className="font-display font-bold text-2xl" style={{ color: '#0A1628' }}>
                {roleTitle ? `Entrar como ${roleTitle}` : 'Entrar a tu cuenta'}
              </h1>
              <p className="font-sans text-sm mt-1" style={{ color: '#C9A05C' }}>
                {role === 'jalador' ? 'Accede a tu panel de ventas' : 'Ingresa tus credenciales'}
              </p>
            </div>

            {registered && (
              <div className="px-4 py-3 rounded-2xl text-sm mb-4 font-sans" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>
                Cuenta creada exitosamente. Ahora puedes entrar.
              </div>
            )}

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-pill font-sans font-semibold text-sm transition-all hover:-translate-y-0.5 mb-4"
              style={{ background: 'white', border: '1.5px solid #FAEBD1', color: '#0A1628' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            {/* Separador */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px" style={{ background: '#FAEBD1' }}></div>
              <span className="text-xs font-sans" style={{ color: '#C9A05C' }}>o con correo</span>
              <div className="flex-1 h-px" style={{ background: '#FAEBD1' }}></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" className="input" />
              </div>
              <div>
                <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Tu contraseña" className="input" />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-primary text-base disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-sans" style={{ color: '#C9A05C' }}>
              No tienes cuenta?{' '}
              <Link href={`/register${role ? `?role=${role}` : ''}`} className="font-bold hover:underline" style={{ color: '#0D5C8A' }}>Regístrate gratis</Link>
            </div>
          </div>

          {/* Magic login para jaladores */}
          {(role === 'jalador' || !role) && (
            <div className="mt-6 rounded-card p-6" style={{ background: 'linear-gradient(135deg, #F5882A, #FF5F5F)' }}>
              <div className="text-center mb-4">
                <h3 className="font-display font-bold text-white text-lg">Acceso rápido Jalador</h3>
                <p className="text-sm text-white/70 font-sans">Entra con tu codigo, sin contraseña</p>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Tu codigo (ej: PED-0001)" id="magic-ref"
                  className="w-full px-4 py-3.5 rounded-pill text-center text-lg font-mono uppercase bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:bg-white/30" />
                <input type="tel" placeholder="Tu WhatsApp" id="magic-phone"
                  className="w-full px-4 py-3.5 rounded-pill text-center text-lg bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:bg-white/30" />
                <button
                  onClick={async () => {
                    const refEl = document.getElementById('magic-ref') as HTMLInputElement;
                    const phoneEl = document.getElementById('magic-phone') as HTMLInputElement;
                    if (!refEl?.value) return;
                    setError('');
                    setLoading(true);
                    try {
                      const { magicLogin: doMagic } = await import('../lib/api');
                      const result = await doMagic(refEl.value.trim().toUpperCase(), phoneEl?.value?.trim() || '');
                      if (result.access_token) {
                        localStorage.setItem('turescol_token', result.access_token);
                        if (result.refresh_token) localStorage.setItem('turescol_refresh', result.refresh_token);
                        localStorage.setItem('turescol_user', JSON.stringify(result.user));
                        router.push('/dashboard/jalador');
                      }
                    } catch (err: any) {
                      setError(err.response?.data?.message || 'Codigo o telefono incorrecto');
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="w-full btn-white text-base disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar como Jalador'}
                </button>
              </div>
            </div>
          )}

          {/* Acceso rápido DEV */}
          <div className="mt-4 rounded-xl p-4" style={{ background: '#F7F7F7', border: '1px solid #EBEBEB' }}>
            <p className="text-xs text-center mb-3" style={{ color: '#B0B0B0' }}>Acceso rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '🏖️ Turista', email: 'turista@test.com' },
                { label: '💰 Jalador', email: 'pedro.jalador@turescolombia.co' },
                { label: '🏢 Operador', email: 'operador@santamartatours.co' },
                { label: '⚙️ Admin', email: 'admin@turescolombia.co' },
              ].map((acc) => (
                <button key={acc.email} onClick={() => { setLoading(true); doLogin(acc.email, 'password123').then(() => setLoading(false)); }}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-lg text-sm font-semibold transition-all hover:shadow-sm disabled:opacity-50"
                  style={{ background: 'white', color: '#222', border: '1px solid #EBEBEB' }}>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
