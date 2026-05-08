import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { translateAuthError } from '../lib/supabaseErrors';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registered = router.query.registered === '1';
  // Cuando Supabase tiene "Confirm email" habilitado, register.tsx pasa
  // confirm=1 — el usuario tiene que revisar su correo ANTES de poder
  // loguear, sino le dirá credenciales invalidas. Mensaje distinto.
  const needsConfirm = router.query.confirm === '1';
  const role = router.query.role as string || '';
  const redirect = (router.query.redirect as string) || null;

  const getRedirectPath = (userRole: string): string => {
    if (redirect) return redirect;
    if (userRole === 'admin') return '/dashboard/admin';
    if (userRole === 'operator') return '/dashboard/operator';
    if (userRole === 'jalador') return '/dashboard/jalador';
    return '/explorar';
  };

  const navigateByRole = (userRole: string) => {
    router.push(getRedirectPath(userRole));
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    try {
      const user = await login(loginEmail, loginPassword);
      navigateByRole(user.role);
    } catch (err: any) {
      // El backend Render devuelve mensajes en distintos formatos; el
      // traductor cubre los mas comunes y deja un fallback amigable.
      const raw = err?.response?.data?.message || err?.message || '';
      setError(translateAuthError(raw));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.session) {
          const userRole = data.user?.user_metadata?.role || 'tourist';
          localStorage.setItem('turescol_token', data.session.access_token);
          localStorage.setItem('turescol_user', JSON.stringify({
            id: data.user?.id, name: data.user?.user_metadata?.name || email.split('@')[0],
            email, role: userRole,
          }));
          // Hard navigation: AuthProvider solo lee localStorage al mount
          // inicial. Sin esto el contexto sigue con user=null y
          // useRequireAuth redirige al login → loop infinito.
          window.location.assign(getRedirectPath(userRole));
          return;
        }
      } catch (err: any) {
        // Errores de Supabase Auth llegan en ingles ("Email not confirmed",
        // "Invalid login credentials"). Los traducimos al espanol antes de
        // mostrarlos al usuario (PR G — Cowork P3).
        setError(translateAuthError(err));
      }
    } else {
      await doLogin(email, password);
    }
    setLoading(false);
  };

  const roleTitle = role === 'jalador' ? 'Jalador'
    : role === 'operator' ? 'Operador'
    : role === 'admin' ? 'Administrador'
    : '';

  return (
    <Layout>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-card shadow-card p-8">
            {/* Hero con logo de marca */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #C9A05C 0%, #F5E6C8 50%, #8B6914 100%)',
                    boxShadow: '0 8px 24px rgba(201,160,92,0.35), inset 0 2px 8px rgba(255,255,255,0.4)',
                  }}
                >
                  {role === 'jalador' ? '💰' : role === 'operator' ? '🏢' : role === 'admin' ? '⚙️' : '🏖️'}
                </div>
              </div>
              <h1 className="font-display font-bold text-3xl mb-2" style={{ color: '#0A1628' }}>
                {roleTitle ? `Entrar como ${roleTitle}` : 'Bienvenido a La Perla'}
              </h1>
              <p className="font-sans text-sm" style={{ color: '#717171' }}>
                {role === 'jalador' ? 'Accede a tu panel de ventas' : 'Ingresa con tus credenciales'}
              </p>
            </div>

            {registered && needsConfirm && (
              <div className="px-4 py-3 rounded-2xl text-sm mb-5 font-sans" style={{ background: '#FFF8E5', color: '#7A5C00', border: '1px solid #F5E0A8' }}>
                📧 <strong>Cuenta creada.</strong> Te enviamos un correo de confirmación — ábrelo y haz clic en el link para activar tu cuenta. Después puedes entrar aquí.
              </div>
            )}
            {registered && !needsConfirm && (
              <div className="px-4 py-3 rounded-2xl text-sm mb-5 font-sans" style={{ background: '#E8F5EF', color: '#2D6A4F' }}>
                ✓ Cuenta creada exitosamente. Ahora puedes entrar.
              </div>
            )}

            {/* Form principal: email + contraseña */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-sans font-semibold mb-1.5" style={{ color: '#0A1628' }}>
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  className="input"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-sans font-semibold" style={{ color: '#0A1628' }}>
                    Contraseña
                  </label>
                  <span className="text-xs font-sans" style={{ color: '#B0B0B0' }} title="Recuperación de contraseña próximamente">
                    ¿Olvidaste? <span className="font-semibold" style={{ color: '#C9A05C' }}>Próximamente</span>
                  </span>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="input"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-primary text-base disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar a mi cuenta'}
              </button>
            </form>

            {/* Separador */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: '#EBEBEB' }} />
              <span className="text-xs font-sans uppercase tracking-wide" style={{ color: '#B0B0B0' }}>
                o continúa con
              </span>
              <div className="flex-1 h-px" style={{ background: '#EBEBEB' }} />
            </div>

            {/* Métodos alternativos — proximamente */}
            <div className="space-y-3">
              <button
                type="button"
                disabled
                title="Inicio de sesión con Google estará disponible pronto"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-pill border bg-white cursor-not-allowed opacity-70"
                style={{ borderColor: '#DDDDDD' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                <span className="font-sans font-semibold text-sm" style={{ color: '#222' }}>
                  Continuar con Google
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: '#FEF3E8', color: '#F5882A' }}
                >
                  PRÓXIMAMENTE
                </span>
              </button>

              <button
                type="button"
                disabled
                title="Inicio de sesión por WhatsApp estará disponible pronto"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-pill border bg-white cursor-not-allowed opacity-70"
                style={{ borderColor: '#DDDDDD' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="font-sans font-semibold text-sm" style={{ color: '#222' }}>
                  Continuar con WhatsApp
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: '#FEF3E8', color: '#F5882A' }}
                >
                  PRÓXIMAMENTE
                </span>
              </button>
            </div>

            <div className="mt-7 pt-6 border-t text-center text-sm font-sans" style={{ borderColor: '#EBEBEB', color: '#717171' }}>
              ¿No tienes cuenta?{' '}
              <Link href={`/register${role ? `?role=${role}` : ''}`} className="font-bold hover:underline" style={{ color: '#0D5C8A' }}>
                Regístrate gratis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
