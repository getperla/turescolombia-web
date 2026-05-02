import api from './client';
import type { Booking, ReviewData, ReviewItem } from '../../types/booking';

export const getMyBookings = async (): Promise<Booking[]> => {
  const { data } = await api.get('/bookings/my');
  return data;
};

export const getBooking = async (id: number): Promise<Booking> => {
  const { data } = await api.get(`/bookings/${id}`);
  return data;
};

export const cancelBooking = async (id: number, reason: string) => {
  const { data } = await api.put(`/bookings/${id}/cancel`, { cancelReason: reason });
  return data;
};

export const getOperatorBookings = async (params?: Record<string, string>): Promise<Booking[]> => {
  const { data } = await api.get('/bookings/operator', { params });
  return data;
};

export const createReview = async (body: ReviewData) => {
  const { data } = await api.post('/reviews', body);
  return data;
};

export const getTourReviews = async (tourId: number, page = 1): Promise<{ data: ReviewItem[]; total: number }> => {
  const { data } = await api.get(`/reviews/tour/${tourId}`, { params: { page, limit: 10 } });
  return data;
};
