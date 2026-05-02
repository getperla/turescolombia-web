// Mock manual de lib/api.ts para tests del flujo critico del jalador.
// Los tests deben hacer jest.mock('../../lib/api') para activar este mock
// (Jest automaticamente toma el contenido de __mocks__/ cuando coincide
// la ruta).

export const mockTour = {
  id: 1,
  name: 'Cabo San Juan',
  slug: 'cabo-san-juan',
  description: 'Tour al Parque Tayrona',
  shortDescription: 'El mejor tour de Santa Marta',
  priceAdult: 160000,
  priceChild: 112000,
  duration: '12h',
  durationHours: 12,
  departureTime: '06:00',
  returnTime: '18:00',
  departurePoint: 'Terminal Maritimo',
  location: 'Santa Marta',
  maxPeople: 20,
  includes: ['Transporte', 'Almuerzo'],
  excludes: ['Entrada al parque'],
  restrictions: [],
  observations: '',
  galleryUrls: [],
  coverImageUrl: 'https://example.com/tour.jpg',
  avgRating: 4.9,
  totalReviews: 45,
  totalBookings: 380,
  status: 'active',
  isFeatured: true,
  category: { id: 1, name: 'Playas', slug: 'playas' },
  operator: {
    id: 1,
    companyName: 'Caribe Expeditions',
    score: 95,
  },
};

export const mockJalador = {
  id: 1,
  refCode: 'PED-0001',
  score: 88,
  totalSales: 245,
  yearsExperience: 5,
  bio: 'Asesor con 5 anos de experiencia',
  zone: 'El Rodadero',
  languages: ['es', 'en'],
  badge: 'top_seller',
  user: {
    id: 1,
    name: 'Juan David Vergel',
    email: 'pedro.jalador@laperla.co',
  },
};

export const mockBooking = {
  id: 1,
  bookingCode: 'LP-TEST-001',
  tourId: 1,
  tourDate: '2026-06-15',
  numAdults: 2,
  numChildren: 0,
  unitPrice: 160000,
  totalAmount: 320000,
  status: 'confirmed',
  paymentStatus: 'paid',
  qrCode: 'laperla-booking-test-001',
  source: 'jalador',
  refCode: 'PED-0001',
  createdAt: '2026-05-01T10:00:00Z',
  tour: {
    id: 1,
    name: 'Cabo San Juan',
    slug: 'cabo-san-juan',
    departureTime: '06:00',
    departurePoint: 'Terminal Maritimo',
    coverImageUrl: 'https://example.com/tour.jpg',
    operator: { companyName: 'Caribe Expeditions' },
  },
};

export const mockDashboardData = {
  jalador: mockJalador,
  sales: { today: 2, week: 8, month: 24 },
  commissions: { pending: 48000, paid: 240000, total: 288000 },
};

// Funciones exportadas que cualquier test puede mockear
export const getTours = jest.fn().mockResolvedValue({ data: [mockTour], total: 1 });
export const getTour = jest.fn().mockResolvedValue(mockTour);
export const getTourBySlug = jest.fn().mockResolvedValue(mockTour);
export const getFeaturedTours = jest.fn().mockResolvedValue([mockTour]);
export const getCategories = jest.fn().mockResolvedValue([{ id: 1, name: 'Playas', slug: 'playas' }]);
export const getJaladorRanking = jest.fn().mockResolvedValue([mockJalador]);
export const getMyBookings = jest.fn().mockResolvedValue([mockBooking]);
export const getBooking = jest.fn().mockResolvedValue(mockBooking);
export const getProfile = jest.fn().mockResolvedValue({
  id: 1,
  name: 'Juan David Vergel',
  email: 'pedro.jalador@laperla.co',
  role: 'jalador',
  jalador: mockJalador,
});
export const updateProfile = jest.fn().mockResolvedValue({});
export const updateJaladorProfile = jest.fn().mockResolvedValue({});
export const getTourReviews = jest.fn().mockResolvedValue({ data: [], total: 0 });
export const cancelBooking = jest.fn().mockResolvedValue({});
export const createReview = jest.fn().mockResolvedValue({});
export const createTour = jest.fn().mockResolvedValue(mockTour);
export const updateTour = jest.fn().mockResolvedValue(mockTour);
export const createAvailability = jest.fn().mockResolvedValue({});
export const createAvailabilityBulk = jest.fn().mockResolvedValue({});
export const getOperatorBookings = jest.fn().mockResolvedValue([]);
export const magicLogin = jest.fn().mockResolvedValue({
  access_token: 'test-token-123',
  user: mockJalador.user,
});
export const invalidateDemoModeCache = jest.fn();

const api = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
};
export default api;
