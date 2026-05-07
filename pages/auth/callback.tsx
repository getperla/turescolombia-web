import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

// Tras click en el link de confirmacion del email (o tras login OAuth),
// Supabase aterriza al usuario aqui. La pagina:
// 1. Si la URL trae ?code=, hace exchangeCodeForSession (PKCE flow).
// 2. Si no, lee la sesion actual con getSession (cubre el caso en que
//    supabase-js ya proceso el hash con detectSessionInUrl=true antes
//    de que este componente montara).
// 3. Si en 5s no hay sesion, mostramos error con boton para volver a
//    intentar — evita el spinner infinito que reporto el owner.
function persistSession(session: any): string {
  const role = session.user.user_metadata?.role || 'tourist';
  localStorage.setItem('turescol_token', session.access_token);
  localStorage.setItem(
    'turescol_user',
    JSON.stringify({
      id: session.user.id,
      name:
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'Usuario',
      email: session.user.email || '',
      role,
      avatarUrl: session.user.user_metadata?.avatar_url || '',
    }),
  );
  return role;
}

function destForRole(role: string): string {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'operator') return '/dashboard/operator';
  if (role === 'jalador') return '/dashboard/jalador';
  return '/explorar';
}

export default function AuthCallback() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    const finish = (session: any) => {
      if (done) return;
      done = true;
      const role = persistSession(session);
      window.location.href = destForRole(role);
    };

    const tryRecover = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const code = search.get('code');
      // Senales de que aterrizamos aqui desde un flujo real de Supabase:
      // - PKCE: ?code=
      // - Hash flow: #access_token=, #refresh_token=, #type=
      // - Implicit / token_hash: ?token_hash=, ?type=
      // - Errores devueltos por Supabase: ?error=, ?error_description=
      // Si NADA de esto esta en la URL, el usuario llego a /auth/callback
      // por accidente o con un link viejo. NO reusamos getSession() porque
      // resucitaria una sesion que el usuario tal vez ya cerro.
      const looksLikeAuthCallback =
        !!code ||
        !!search.get('token_hash') ||
        !!search.get('type') ||
        !!search.get('error') ||
        !!hash.get('access_token') ||
        !!hash.get('refresh_token') ||
        !!hash.get('type') ||
        !!hash.get('error');

      if (!looksLikeAuthCallback) {
        setErrorMsg(
          'No detectamos un link de confirmacion valido. Si vienes de tu correo, abre el link mas reciente.',
        );
        return;
      }

      // Si Supabase nos paso un error directo, lo mostramos tal cual.
      const errParam = search.get('error_description') || hash.get('error_description');
      if (errParam) {
        setErrorMsg(decodeURIComponent(errParam.replace(/\+/g, ' ')));
        return;
      }

      // 1) PKCE flow: ?code=... en URL
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data?.session) {
            finish(data.session);
            return;
          }
        } catch (err: any) {
          // Si exchange falla (code ya usado, expirado, etc), seguimos
          // a getSession por si supabase-js ya proceso el flow.
          console.warn('exchangeCodeForSession failed:', err?.message);
        }
      }

      // 2) Hash flow / sesion ya procesada: leer la sesion actual.
      // Solo llegamos aqui cuando looksLikeAuthCallback === true, asi que
      // confiar en getSession aqui es seguro: no resucitamos sesiones de
      // usuarios que cerraron antes y aterrizan sin parametros de auth.
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErrorMsg(error.message || 'No pudimos verificar tu correo');
        return;
      }
      if (data?.session) {
        finish(data.session);
        return;
      }

      // 3) URL parecia callback pero no produjo sesion: link invalido / usado.
      setErrorMsg(
        'El link de confirmacion no es valido o ya fue usado. Intenta entrar con tu correo y contrasena.',
      );
    };

    // Tambien escuchamos onAuthStateChange por si supabase-js procesa el hash
    // despues del montaje. SIGNED_IN dispara cuando exchangeCode termina;
    // INITIAL_SESSION dispara cuando getSession resuelve por primera vez.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        finish(session);
      }
    });

    tryRecover();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (errorMsg) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FFF0F0' }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="font-display font-bold text-lg mb-2" style={{ color: '#0A1628' }}>
              No pudimos confirmar tu cuenta
            </p>
            <p className="text-sm font-sans mb-5" style={{ color: '#717171' }}>
              {errorMsg}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary text-base"
            >
              Ir al inicio de sesion
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#FEF3E8' }}>
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '3px solid #F5882A', borderTopColor: 'transparent' }}></div>
          </div>
          <p className="font-semibold" style={{ color: '#222' }}>Conectando tu cuenta...</p>
          <p className="text-sm" style={{ color: '#717171' }}>Un momento por favor</p>
        </div>
      </div>
    </Layout>
  );
}
