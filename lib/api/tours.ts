import api from './client';
import type { Tour, Category } from '../../types/tour';

export const getTours = async (params?: Record<string, string>): Promise<{ data: Tour[]; total: number }> => {
  const { data } = await api.get('/tours', { params });
  return data;
};

export const getTourBySlug = async (slug: string): Promise<Tour> => {
  const { data } = await api.get(`/tours/slug/${slug}`);
  return data;
};

export const getTour = async (id: number): Promise<Tour> => {
  const { data } = await api.get(`/tours/${id}`);
  return data;
};

export const getFeaturedTours = async (): Promise<Tour[]> => {
  const { data } = await api.get('/tours/featured');
  return data;
};

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/tours/categories');
  return data;
};

export const createTour = async (body: Record<string, any>): Promise<Tour> => {
  const { data } = await api.post('/tours', body);
  return data;
};

export const updateTour = async (id: number, body: Record<string, any>): Promise<Tour> => {
  const { data } = await api.put(`/tours/${id}`, body);
  return data;
};

export const createAvailability = async (tourId: number, body: { date: string; totalSpots: number; priceOverride?: number }) => {
  const { data } = await api.post(`/tours/${tourId}/availability`, body);
  return data;
};

export const createAvailabilityBulk = async (tourId: number, body: { startDate: string; endDate: string; totalSpots: number; excludeDays?: number[] }) => {
  const { data } = await api.post(`/tours/${tourId}/availability/bulk`, body);
  return data;
};
