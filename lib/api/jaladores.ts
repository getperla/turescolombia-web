import api from './client';
import type { Jalador } from '../../types/user';

export const getJaladorRanking = async (): Promise<Jalador[]> => {
  const { data } = await api.get('/reputation/ranking');
  return data;
};

export const magicLogin = async (refCode: string, phone: string) => {
  const { data } = await api.post('/auth/magic-login', { refCode, phone });
  return data;
};
