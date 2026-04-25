const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

type RequestConfig = { params?: Record<string, string | number | undefined> };
type ApiResponse<T = any> = { data: T; status: number };

class ApiError extends Error {
  response?: { data: any; status: number };
  constructor(message: string, response?: { data: any; status: number }) {
    super(message);
    this.response = response;
  }
}

function buildUrl(path: string, params?: RequestConfig['params']): string {
  const base = path.startsWith('http') ? path : `${API_BASE}${path}`;
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  }
  const q = qs.toString();
  return q ? `${base}${base.includes('?') ? '&' : '?'}${q}` : base;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('turescol_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    throw new ApiError(
      (data && data.message) || res.statusText || `HTTP ${res.status}`,
      { data, status: res.status },
    );
  }
  return { data: data as T, status: res.status };
}

const api = {
  get: <T = any>(path: string, config?: RequestConfig) => request<T>('GET', path, undefined, config),
  post: <T = any>(path: string, body?: any, config?: RequestConfig) => request<T>('POST', path, body, config),
  put: <T = any>(path: string, body?: any, config?: RequestConfig) => request<T>('PUT', path, body, config),
  delete: <T = any>(path: string, config?: RequestConfig) => request<T>('DELETE', path, undefined, config),
};

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

// Auth (login/register/logout) ahora se maneja directamente con Supabase
// via lib/auth.tsx (useAuth hook). Las llamadas REST a /auth/* fueron
// removidas porque no se usan: el backend de auth es Supabase.

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
