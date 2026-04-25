import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import Layout from '../../components/Layout';

/**
 * OAuth callback de Supabase. Cuando el usuario vuelve de Google/etc.,
 * Supabase parsea el hash de la URL y dispara SIGNED_IN. El AuthProvider
 * (lib/auth.tsx) ya esta suscrito a onAuthStateChange globalmente, asi
 * que persiste el user automaticamente. Aca solo redirigimos al destino.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace('/login');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const role = (session.user.user_metadata?.role as string) || 'tourist';
        const path = role === 'admin' ? '/dashboard/admin'
          : role === 'operator' ? '/dashboard/operator'
          : role === 'jalador' ? '/dashboard/jalador'
          : '/explorar';
        router.replace(path);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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
