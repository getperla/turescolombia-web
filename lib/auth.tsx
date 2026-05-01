import { STORAGE_KEYS } from '../constants/storageKeys';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api, { invalidateDemoModeCache } from './api';
import type { AuthUser } from '../types/user';

export type { AuthUser } from '../types/user';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/auth/login', { email, password });
    const authUser: AuthUser = data.user;
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH, data.refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.BETA);
    invalidateDemoModeCache();
    setUser(null);
    // Hard reload to reset the whole app state and re-show BetaGate
    window.location.href = '/';
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Redirect to login if not authenticated */
export function useRequireAuth(allowedRoles?: AuthUser['role'][]) {
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
