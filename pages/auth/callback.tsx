import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('turescol_token', session.access_token);
        localStorage.setItem('turescol_user', JSON.stringify({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'tourist',
          avatarUrl: session.user.user_metadata?.avatar_url || '',
        }));
        window.location.href = '/explorar';
      }
    });
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
