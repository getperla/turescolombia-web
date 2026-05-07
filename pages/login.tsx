import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registered = router.query.registered === '1';
  const role = router.query.role as string || '';
  const redirect = (router.query.redirect as string) || null;

  const navigateByRole = (userRole: string) => {
    if (redirect) router.push(redirect);
    else if (userRole === 'admin') router.push('/dashboard/admin');
    else if (userRole === 'operator') router.push('/dashboard/operator');
    else if (userRole === 'jalador') router.push('/dashboard/jalador');
    else router.push('/explorar');
  };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    try {
      const user = await login(loginEmail, loginPassword);
      navigateByRole(user.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
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
          localStorage.setItem('turescol_token', data.session.access_token);
          localStorage.setItem('turescol_user', JSON.stringify({
            id: data.user?.id, name: data.user?.user_metadata?.name || email.split('@')[0],
            email, role: data.user?.user_metadata?.role || 'tourist',
          }));
          navigateByRole(data.user?.user_metadata?.role || 'tourist');
        }
      } catch (err: any) { setError(err.message || 'Correo o contraseña incorrectos.'); }
    } else {
      await doLogin(email, password);
    }
    setLoading(false);
  };

  const handlePhoneOtp = async () => {
    if (!phone.trim()) { setError('Ingresa tu número de WhatsApp'); return; }
    setLoading(true);
    setError('');
    if (isSupabaseConfigured()) {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('57') ? `+${cleanPhone}` : `+57${cleanPhone}`;
      const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (err) setError(err.message);
      else setOtpSent(true);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (!otpCode.trim()) { setError('Ingresa el código'); return; }
    setLoading(true);
    setError('');
    if (isSupabaseConfigured()) {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('57') ? `+${cleanPhone}` : `+57${cleanPhone}`;
      const { data, error: err } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otpCode, type: 'sms' });
      if (err) { setError(err.message); }
      else if (data.session) {
        localStorage.setItem('turescol_token', data.session.access_token);
        localStorage.setItem('turescol_user', JSON.stringify({
          id: data.user?.id, name: data.user?.user_metadata?.name || 'Usuario',
          email: data.user?.email || '', role: data.user?.user_metadata?.role || 'tourist',
        }));
        navigateByRole(data.user?.user_metadata?.role || 'tourist');
      }
    } else {
      // Demo mode
      localStorage.setItem('turescol_token', 'beta-demo-token');
      localStorage.setItem('turescol_user', JSON.stringify({ id: 0, name: 'Usuario WhatsApp', email: '', role: 'tourist' }));
      localStorage.setItem('laperla_beta', JSON.stringify({ role: 'tourist', betaMode: true }));
      window.location.href = '/explorar';
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

            {/* Toggle email / telefono */}
            <div className="flex rounded-full p-1 mb-4" style={{ background: '#F7F7F7' }}>
              <button onClick={() => { setLoginMode('email'); setError(''); }}
                className="flex-1 py-2 rounded-full text-xs font-semibold transition-all"
                style={{ background: loginMode === 'email' ? 'white' : 'transparent', color: loginMode === 'email' ? '#222' : '#717171', boxShadow: loginMode === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                ✉️ Correo
              </button>
              <button onClick={() => { setLoginMode('phone'); setError(''); setOtpSent(false); }}
                className="flex-1 py-2 rounded-full text-xs font-semibold transition-all"
                style={{ background: loginMode === 'phone' ? 'white' : 'transparent', color: loginMode === 'phone' ? '#222' : '#717171', boxShadow: loginMode === 'phone' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                📱 WhatsApp
              </button>
            </div>

            {loginMode === 'email' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Correo</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Contraseña</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Tu contraseña" className="input" />
                </div>
                {error && <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>}
                <button type="submit" disabled={loading} className="w-full btn-primary text-base disabled:opacity-50">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Tu número de WhatsApp</label>
                      <div className="flex gap-2">
                        <span className="flex items-center px-3 rounded-lg border text-sm font-semibold" style={{ borderColor: '#DDDDDD', color: '#222', background: '#F7F7F7' }}>🇨🇴 +57</span>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" className="input flex-1" />
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#B0B0B0' }}>Te enviaremos un código por SMS para verificar</p>
                    </div>
                    {error && <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>}
                    <button onClick={handlePhoneOtp} disabled={loading}
                      className="w-full py-3 rounded-lg text-white font-semibold text-base disabled:opacity-50"
                      style={{ background: '#25D366' }}>
                      {loading ? 'Enviando...' : '📱 Enviar código por SMS'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center p-4 rounded-xl" style={{ background: '#E8F5EF' }}>
                      <span className="text-2xl">✅</span>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#2D6A4F' }}>Código enviado a +57 {phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-sans font-medium mb-1" style={{ color: '#6B5329' }}>Código de verificación</label>
                      <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456"
                        className="input text-center text-2xl font-mono tracking-widest" maxLength={6} />
                    </div>
                    {error && <div className="px-4 py-3 rounded-2xl text-sm font-sans" style={{ background: '#FFF0F0', color: '#CC3333' }}>{error}</div>}
                    <button onClick={verifyOtp} disabled={loading} className="w-full btn-primary text-base disabled:opacity-50">
                      {loading ? 'Verificando...' : 'Verificar y entrar'}
                    </button>
                    <button onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); }}
                      className="w-full text-sm font-semibold" style={{ color: '#0D5C8A' }}>
                      Cambiar número
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="mt-6 text-center text-sm font-sans" style={{ color: '#C9A05C' }}>
              ¿No tienes cuenta?{' '}
              <Link href={`/register${role ? `?role=${role}` : ''}`} className="font-bold hover:underline" style={{ color: '#0D5C8A' }}>Regístrate gratis</Link>
            </div>
          </div>

          {/* Magic login para jaladores */}
          {(role === 'jalador' || !role) && (
            <div className="mt-6 rounded-card p-6" style={{ background: 'linear-gradient(135deg, #F5882A, #FF5F5F)' }}>
              <div className="text-center mb-4">
                <h3 className="font-display font-bold text-white text-lg">Acceso rápido Jalador</h3>
                <p className="text-sm text-white/70 font-sans">Entra con tu código, sin contraseña</p>
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

        </div>
      </div>
    </Layout>
  );
}
