import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Cache global del estado demo — evita leer localStorage en cada request
let cachedDemoMode: boolean | null = null;

export function invalidateDemoModeCache() {
  cachedDemoMode = null;
}

function isDemoModeFast(): boolean {
  if (cachedDemoMode !== null) return cachedDemoMode;
  if (typeof window === 'undefined') return false;
  cachedDemoMode = localStorage.getItem('turescol_token') === 'beta-demo-token';
  return cachedDemoMode;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor para agregar token de auth y manejar modo demo
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('turescol_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Demo mode: carga dinamica de mockData SOLO si estamos en demo
    // Esto evita que mockData.ts (29KB) se bundle en todas las paginas
    if (isDemoModeFast()) {
      const { getMockResponse } = await import('./mockData');
      config.adapter = async (cfg) => {
        const url = cfg.url || '';
        const method = cfg.method || 'get';
        // Simulate small network delay so the UI feels natural
        await new Promise((r) => setTimeout(r, 120));
        return {
          data: getMockResponse(method, url),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
          request: {},
        };
      };
    }
  }
  return config;
});

// ---- Types ----

export type Tour = {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  priceAdult: number;
  priceChild?: number;
  maxPeople: number;
  departurePoint: string;
  departureTime: string;
  returnTime: string;
  location: string;
  duration: string;
  durationHours?: number;
  includes: string[];
  excludes: string[];
  restrictions: string[];
  observations?: string;
  coverImageUrl?: string;
  galleryUrls: string[];
  status: string;
  isFeatured: boolean;
  avgRating: number;
  totalReviews: number;
  totalBookings: number;
  operator: {
    id: number;
    companyName: string;
    logoUrl?: string;
    score: number;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  colorHex?: string;
};

export type Jalador = {
  id: number;
  bio?: string;
  zone?: string;
  languages: string[];
  yearsExperience: number;
  score: number;
  totalSales: number;
  badge: string;
  refCode: string;
  user: { id: number; name: string; avatarUrl?: string };
};

// ---- API calls ----

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

export const getJaladorRanking = async (): Promise<Jalador[]> => {
  const { data } = await api.get('/reputation/ranking');
  return data;
};

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password });
  if (typeof window !== 'undefined' && data.access_token) {
    localStorage.setItem('turescol_token', data.access_token);
  }
  return data;
};

export const magicLogin = async (refCode: string, phone: string) => {
  const { data } = await api.post('/auth/magic-login', { refCode, phone });
  return data;
};

export const register = async (body: { name: string; email: string; password: string; role: string }) => {
  const { data } = await api.post('/auth/register', body);
  return data;
};

// ---- Booking types & calls ----

export type Booking = {
  id: number;
  bookingCode: string;
  tourDate: string;
  numAdults: number;
  numChildren: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  qrCode: string;
  source: string;
  refCode?: string;
  cancelReason?: string;
  createdAt: string;
  tour: {
    id: number;
    name: string;
    slug: string;
    departureTime: string;
    departurePoint: string;
    coverImageUrl?: string;
    operator: { companyName: string };
  };
  review?: { id: number } | null;
};

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

// ---- Review calls ----

export type ReviewData = {
  bookingId: number;
  tourRating: number;
  jaladorRating?: number;
  tourComment?: string;
  jaladorComment?: string;
};

export const createReview = async (body: ReviewData) => {
  const { data } = await api.post('/reviews', body);
  return data;
};

export type ReviewItem = {
  id: number;
  tourRating?: number;
  jaladorRating?: number;
  tourComment?: string;
  jaladorComment?: string;
  createdAt: string;
  author: { id: number; name: string; avatarUrl?: string };
  operatorReply?: string;
  operatorReplyAt?: string;
};

export const getTourReviews = async (tourId: number, page = 1): Promise<{ data: ReviewItem[]; total: number }> => {
  const { data } = await api.get(`/reviews/tour/${tourId}`, { params: { page, limit: 10 } });
  return data;
};

// ---- User profile ----

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

// ---- Operator tour management ----

export const getOperatorBookings = async (params?: Record<string, string>): Promise<Booking[]> => {
  const { data } = await api.get('/bookings/operator', { params });
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

export default api;
