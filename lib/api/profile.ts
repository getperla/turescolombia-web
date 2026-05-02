import api from './client';

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password });
  if (typeof window !== 'undefined' && data.access_token) {
    const { STORAGE_KEYS } = await import('../../constants/storageKeys');
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
  }
  return data;
};

export const register = async (body: { name: string; email: string; password: string; role: string }) => {
  const { data } = await api.post('/auth/register', body);
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get('/auth/profile');
  return data;
};

export const updateProfile = async (body: Record<string, any>) => {
  const { data } = await api.put('/users/me', body);
  return data;
};

export const updateJaladorProfile = async (body: Record<string, any>) => {
  const { data } = await api.put('/users/jaladores/me', body);
  return data;
};
