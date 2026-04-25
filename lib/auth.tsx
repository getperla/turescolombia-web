import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { supabase, isSupabaseConfigured } from './supabase';

export type AuthRole = 'tourist' | 'jalador' | 'operator' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  avatarUrl?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (params: { email: string; password: string; name: string; role: AuthRole; phone?: string; metadata?: Record<string, any> }) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout: async () => {},
  updateUser: () => {},
});

const STORAGE_USER = 'turescol_user';
const STORAGE_TOKEN = 'turescol_token';

function sessionToAuthUser(session: any): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const md = u.user_metadata || {};
  return {
    id: u.id,
    name: md.name || md.full_name || u.email?.split('@')[0] || 'Usuario',
    email: u.email || '',
    role: (md.role as AuthRole) || 'tourist',
    avatarUrl: md.avatar_url || undefined,
  };
}

function persist(user: AuthUser | null, accessToken: string | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER);
  }
  if (accessToken) {
    localStorage.setItem(STORAGE_TOKEN, accessToken);
  } else {
    localStorage.removeItem(STORAGE_TOKEN);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidrata desde localStorage en mount + se suscribe a cambios de auth de Supabase
  useEffect(() => {
    let mounted = true;

    // 1. Hidratacion sincrona desde localStorage para no parpadear
    try {
      const stored = localStorage.getItem(STORAGE_USER);
      if (stored) setUser(JSON.parse(stored));
    } catch { /* localStorage corrupto, lo ignoramos */ }

    // 2. Hidratacion oficial via Supabase (puede sobreescribir el local si difiere)
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        const u = sessionToAuthUser(session);
        setUser(u);
        persist(u, session?.access_token || null);
        setLoading(false);
      }).catch((err) => {
        console.error('Supabase getSession failed:', err);
        if (mounted) setLoading(false);
      });

      // 3. Suscripcion a cambios de auth (login, logout, refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        const u = sessionToAuthUser(session);
        setUser(u);
        persist(u, session?.access_token || null);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Sin Supabase: solo hay lo de localStorage
      setLoading(false);
      return () => { mounted = false; };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no esta configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const u = sessionToAuthUser(data);
    if (!u) throw new Error('Login devolvio sesion vacia');
    persist(u, data.session?.access_token || null);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async ({ email, password, name, role, phone, metadata }: {
    email: string; password: string; name: string; role: AuthRole; phone?: string; metadata?: Record<string, any>;
  }): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no esta configurado.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone, ...(metadata || {}) },
      },
    });
    if (error) throw error;
    // Si Supabase requiere confirmacion de email, data.session sera null hasta que confirme.
    const u = sessionToAuthUser(data);
    if (u) {
      persist(u, data.session?.access_token || null);
      setUser(u);
    }
    return u;
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch (err) { console.error('signOut failed:', err); }
    }
    persist(null, null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      persist(updated, typeof window !== 'undefined' ? localStorage.getItem(STORAGE_TOKEN) : null);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Redirect to login if not authenticated */
export function useRequireAuth(allowedRoles?: AuthRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading, authorized: !loading && !!user && (!allowedRoles || allowedRoles.includes(user.role)) };
}
