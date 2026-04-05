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
  const [quickLoading, setQuickLoading] = useState('');

  const registered = router.query.registered === '1';
  const redirect = (router.query.redirect as string) || null;

  const testAccounts = [
    { label: 'Turista', email: 'turista@test.com', role: 'tourist' },
    { label: 'Jalador', email: 'pedro.jalador@turescolombia.co', role: 'jalador' },
    { label: 'Operador', email: 'operador@santamartatours.co', role: 'operator' },
    { label: 'Admin', email: 'admin@turescolombia.co', role: 'admin' },
  ];

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
        router.push('/');
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

  const handleQuickLogin = async (account: typeof testAccounts[0]) => {
    setQuickLoading(account.email);
    await doLogin(account.email, 'password123');
    setQuickLoading('');
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3"><Logo size="lg" /></div>
              <h1 className="text-2xl font-bold text-gray-900">Entrar a tu cuenta</h1>
              <p className="text-gray-500 mt-1">Ingresa tu correo y contraseña</p>
            </div>

            {registered && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                Cuenta creada. Ahora puedes entrar.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" className="input text-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Tu contraseña" className="input text-lg" />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-primary text-lg py-4 disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              No tienes cuenta?{' '}
              <Link href="/register" className="text-primary-500 font-bold hover:underline">Registrate gratis</Link>
            </div>
          </div>

          {/* Magic login para jaladores — sin contraseña */}
          <div className="mt-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl border border-primary-200 p-6">
            <div className="text-center mb-4">
              <h3 className="font-bold text-gray-900">Eres Jalador?</h3>
              <p className="text-sm text-gray-500">Entra con tu codigo de asesor, sin contrasena</p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Tu codigo (ej: PED-0001)"
                id="magic-ref"
                className="input text-center text-lg font-mono uppercase"
              />
              <input
                type="tel"
                placeholder="Tu WhatsApp"
                id="magic-phone"
                className="input text-center text-lg"
              />
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
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-6 rounded-2xl transition-all disabled:opacity-50 text-lg"
              >
                {loading ? 'Entrando...' : 'Entrar como Jalador'}
              </button>
            </div>
          </div>

          {/* Acceso rápido BETA */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-4">
              <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-2">BETA</span>
              <p className="text-sm text-gray-500">Acceso rapido para pruebas</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {testAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleQuickLogin(account)}
                  disabled={!!quickLoading}
                  className={`py-3 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    account.role === 'tourist' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' :
                    account.role === 'jalador' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' :
                    account.role === 'operator' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' :
                    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  {quickLoading === account.email ? 'Entrando...' : `Entrar como ${account.label}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">Clave: password123</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
