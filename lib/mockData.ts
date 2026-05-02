// Mock data for beta/demo mode — used when token === 'beta-demo-token'
// Lets family/friends explore the app without a real backend.

type MockJalador = {
  id: number;
  bio?: string;
  zone?: string;
  languages: string[];
  yearsExperience: number;
  score: number;
  totalSales: number;
  badge: string;
  refCode: string;
  status: string;
  user: { id: number; name: string; email: string; phone?: string; avatarUrl?: string };
};

type MockOperator = {
  id: number;
  companyName: string;
  rntNumber?: string;
  score: number;
  totalTours: number;
  isApproved: boolean;
  user: { id: number; name: string; email: string; phone?: string };
};

type MockTour = {
  id: number;
  name: string;
  slug: string;
  priceAdult: number;
  coverImageUrl: string;
  totalBookings: number;
  avgRating: number;
  status: string;
  operator: { id: number; companyName: string };
};

type MockBooking = {
  id: number;
  bookingCode: string;
  tourDate: string;
  totalAmount: number;
  status: string;
  tour: { id: number; name: string };
  tourist: { user: { name: string } };
};

type MockNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export const mockJaladores: MockJalador[] = [
  { id: 1, bio: 'Guía turístico con 5 años de experiencia en Santa Marta', zone: 'Centro Histórico', languages: ['Español', 'Inglés'], yearsExperience: 5, score: 92, totalSales: 45, badge: 'gold', refCode: 'PG2024', status: 'active', user: { id: 101, name: 'Pedro González', email: 'pedro@demo.co', phone: '+57 300 111 2222' } },
  { id: 2, bio: 'Experta en tours de playa y snorkel', zone: 'Taganga', languages: ['Español', 'Inglés', 'Francés'], yearsExperience: 3, score: 88, totalSales: 32, badge: 'silver', refCode: 'ML2024', status: 'active', user: { id: 102, name: 'María López', email: 'maria@demo.co', phone: '+57 301 222 3333' } },
  { id: 3, bio: 'Especialista en senderismo Sierra Nevada', zone: 'Minca', languages: ['Español'], yearsExperience: 2, score: 75, totalSales: 18, badge: 'bronze', refCode: 'CM2024', status: 'pending', user: { id: 103, name: 'Carlos Martínez', email: 'carlos@demo.co', phone: '+57 302 333 4444' } },
  { id: 4, bio: 'Tours culturales y gastronómicos', zone: 'Centro Histórico', languages: ['Español', 'Inglés', 'Alemán'], yearsExperience: 4, score: 85, totalSales: 28, badge: 'silver', refCode: 'AR2024', status: 'active', user: { id: 104, name: 'Ana Rodríguez', email: 'ana@demo.co', phone: '+57 303 444 5555' } },
  { id: 5, bio: 'Guía de buceo y deportes acuáticos', zone: 'Taganga', languages: ['Español', 'Inglés'], yearsExperience: 6, score: 95, totalSales: 52, badge: 'gold', refCode: 'JS2024', status: 'active', user: { id: 105, name: 'Jorge Sánchez', email: 'jorge@demo.co', phone: '+57 304 555 6666' } },
  { id: 6, bio: 'Jalador nuevo en la plataforma', zone: 'Rodadero', languages: ['Español'], yearsExperience: 1, score: 50, totalSales: 5, badge: 'bronze', refCode: 'LP2024', status: 'pending', user: { id: 106, name: 'Luisa Pérez', email: 'luisa@demo.co', phone: '+57 305 666 7777' } },
  { id: 7, bio: 'Tours privados y VIP', zone: 'Centro Histórico', languages: ['Español', 'Inglés', 'Italiano'], yearsExperience: 7, score: 98, totalSales: 68, badge: 'gold', refCode: 'DT2024', status: 'active', user: { id: 107, name: 'Diego Torres', email: 'diego@demo.co', phone: '+57 306 777 8888' } },
  { id: 8, bio: 'Turismo comunitario y sostenible', zone: 'Tayrona', languages: ['Español', 'Inglés'], yearsExperience: 3, score: 70, totalSales: 12, badge: 'bronze', refCode: 'SV2024', status: 'suspended', user: { id: 108, name: 'Sofia Vargas', email: 'sofia@demo.co', phone: '+57 307 888 9999' } },
];

export const mockOperators: MockOperator[] = [
  { id: 1, companyName: 'Tours Caribe SAS', rntNumber: 'RNT-12345', score: 95, totalTours: 8, isApproved: true, user: { id: 201, name: 'Roberto Silva', email: 'contacto@tourscaribe.co', phone: '+57 605 123 4567' } },
  { id: 2, companyName: 'Sierra Aventuras', rntNumber: 'RNT-23456', score: 90, totalTours: 5, isApproved: true, user: { id: 202, name: 'Laura Jiménez', email: 'info@sierraaventuras.co', phone: '+57 605 234 5678' } },
  { id: 3, companyName: 'Tayrona Expeditions', rntNumber: 'RNT-34567', score: 85, totalTours: 6, isApproved: true, user: { id: 203, name: 'Andrés Ruiz', email: 'tayrona@expeditions.co', phone: '+57 605 345 6789' } },
  { id: 4, companyName: 'Santa Marta Diving', rntNumber: 'RNT-45678', score: 88, totalTours: 4, isApproved: true, user: { id: 204, name: 'Camila Ortiz', email: 'diving@santamarta.co', phone: '+57 605 456 7890' } },
  { id: 5, companyName: 'Caribe Aventura Tours', rntNumber: '', score: 0, totalTours: 0, isApproved: false, user: { id: 205, name: 'Miguel Castro', email: 'miguel@caribeaventura.co', phone: '+57 605 567 8901' } },
];

export const mockTours: MockTour[] = [
  { id: 1, name: 'Playa Blanca Rodadero', slug: 'playa-blanca-rodadero', priceAdult: 120000, coverImageUrl: '/tours/PLAYA%20BLANCA%20RODADERRO.jpg', totalBookings: 145, avgRating: 4.8, status: 'active', operator: { id: 1, companyName: 'Tours Caribe SAS' } },
  { id: 2, name: 'Tayrona Full Day', slug: 'tayrona-full-day', priceAdult: 180000, coverImageUrl: '/tours/TAYRONA%20FULL%20DAY.jpg', totalBookings: 210, avgRating: 4.9, status: 'active', operator: { id: 3, companyName: 'Tayrona Expeditions' } },
  { id: 3, name: 'Ciudad Perdida 4 días', slug: 'ciudad-perdida-4d', priceAdult: 1450000, coverImageUrl: '/tours/CIUDAD%20PERDIDO.jpg', totalBookings: 58, avgRating: 4.7, status: 'active', operator: { id: 2, companyName: 'Sierra Aventuras' } },
  { id: 4, name: 'Minca Cascadas y Café', slug: 'minca-cascadas-cafe', priceAdult: 95000, coverImageUrl: '/tours/MINCA%20CASCADAS.jpg', totalBookings: 87, avgRating: 4.6, status: 'active', operator: { id: 2, companyName: 'Sierra Aventuras' } },
  { id: 5, name: 'Isla Aguja Snorkel', slug: 'isla-aguja-snorkel', priceAdult: 150000, coverImageUrl: '/tours/ISLA%20AGUJA%20SNORKEL.jpg', totalBookings: 112, avgRating: 4.8, status: 'active', operator: { id: 4, companyName: 'Santa Marta Diving' } },
  { id: 6, name: 'Sendero Sierra Nevada', slug: 'sendero-sierra-nevada', priceAdult: 220000, coverImageUrl: '/tours/SENDERO%20CAMINATA%20SIERRA%20NEVADA.jpg', totalBookings: 34, avgRating: 4.5, status: 'active', operator: { id: 2, companyName: 'Sierra Aventuras' } },
  { id: 7, name: 'Tour Centro Histórico', slug: 'centro-historico', priceAdult: 45000, coverImageUrl: '/tours/CENTRO%20HISTORICO%20DE%20SANTA%20MARTA%201.jpg', totalBookings: 95, avgRating: 4.4, status: 'active', operator: { id: 1, companyName: 'Tours Caribe SAS' } },
  { id: 8, name: 'Pesca Artesanal Taganga', slug: 'pesca-taganga', priceAdult: 85000, coverImageUrl: '/tours/PESCA%20ARTESANAL%20TAGANGA.jpg', totalBookings: 42, avgRating: 4.3, status: 'active', operator: { id: 4, companyName: 'Santa Marta Diving' } },
  { id: 9, name: 'Bahía Concha', slug: 'bahia-concha', priceAdult: 115000, coverImageUrl: '/tours/BAHIA%20CONCHA%20UNO.jpg', totalBookings: 78, avgRating: 4.6, status: 'active', operator: { id: 1, companyName: 'Tours Caribe SAS' } },
  { id: 10, name: 'Playa Cristal', slug: 'playa-cristal', priceAdult: 160000, coverImageUrl: '/tours/PLAYA%20CRISTAL%20UNO.jpg', totalBookings: 156, avgRating: 4.7, status: 'active', operator: { id: 3, companyName: 'Tayrona Expeditions' } },
  { id: 11, name: 'Cabo San Juan', slug: 'cabo-san-juan', priceAdult: 160000, coverImageUrl: '/tours/CABO%20SAN%20JUAN%20UNO.jpg', totalBookings: 134, avgRating: 4.8, status: 'active', operator: { id: 3, companyName: 'Tayrona Expeditions' } },
  { id: 12, name: 'Guachaca y Buritaca', slug: 'guachaca-buritaca', priceAdult: 120000, coverImageUrl: '/tours/BURITACA%20UNO.jpg', totalBookings: 45, avgRating: 4.5, status: 'active', operator: { id: 2, companyName: 'Sierra Aventuras' } },
  { id: 13, name: 'Palomino', slug: 'palomino', priceAdult: 120000, coverImageUrl: '/tours/PALOMINO%20UNO.jpg', totalBookings: 67, avgRating: 4.6, status: 'active', operator: { id: 2, companyName: 'Sierra Aventuras' } },
  { id: 14, name: 'Cabo de la Vela', slug: 'cabo-de-la-vela', priceAdult: 350000, coverImageUrl: '/tours/CABO%20DE%20LA%20VELA%20UNO.jpg', totalBookings: 23, avgRating: 4.9, status: 'active', operator: { id: 1, companyName: 'Tours Caribe SAS' } },
  { id: 15, name: 'Chiva Rumbera', slug: 'chiva-rumbera', priceAdult: 25000, coverImageUrl: '/tours/CHIVA%20RUMBERA%20UNO.jpg', totalBookings: 189, avgRating: 4.3, status: 'active', operator: { id: 1, companyName: 'Tours Caribe SAS' } },
  { id: 16, name: 'Playa Cristal en Lancha', slug: 'playa-cristal-lancha', priceAdult: 160000, coverImageUrl: '/tours/PLAYA%20CRISTAL%20EN%20LANCHA%20UNO.jpg', totalBookings: 89, avgRating: 4.7, status: 'active', operator: { id: 3, companyName: 'Tayrona Expeditions' } },
  { id: 17, name: 'Cabo San Juan en Lancha', slug: 'cabo-san-juan-lancha', priceAdult: 200000, coverImageUrl: '/tours/CABO%20SAN%20JUAN%20EN%20LANCHA.jfif', totalBookings: 56, avgRating: 4.8, status: 'active', operator: { id: 3, companyName: 'Tayrona Expeditions' } },
];

export const mockBookings: MockBooking[] = [
  { id: 1, bookingCode: 'LP-001234', tourDate: new Date(Date.now() + 86400000 * 2).toISOString(), totalAmount: 240000, status: 'confirmed', tour: { id: 1, name: 'Playa Blanca Rodadero' }, tourist: { user: { name: 'Juan Pablo' } } },
  { id: 2, bookingCode: 'LP-001235', tourDate: new Date(Date.now() + 86400000 * 5).toISOString(), totalAmount: 360000, status: 'pending', tour: { id: 2, name: 'Tayrona Full Day' }, tourist: { user: { name: 'Isabella Martínez' } } },
  { id: 3, bookingCode: 'LP-001236', tourDate: new Date(Date.now() - 86400000).toISOString(), totalAmount: 180000, status: 'completed', tour: { id: 4, name: 'Minca Cascadas y Café' }, tourist: { user: { name: 'Felipe Gómez' } } },
  { id: 4, bookingCode: 'LP-001237', tourDate: new Date(Date.now() + 86400000 * 7).toISOString(), totalAmount: 1450000, status: 'confirmed', tour: { id: 3, name: 'Ciudad Perdida 4 días' }, tourist: { user: { name: 'Valentina Ruiz' } } },
  { id: 5, bookingCode: 'LP-001238', tourDate: new Date(Date.now() + 86400000 * 3).toISOString(), totalAmount: 150000, status: 'confirmed', tour: { id: 5, name: 'Isla Aguja Snorkel' }, tourist: { user: { name: 'Mateo Torres' } } },
  { id: 6, bookingCode: 'LP-001239', tourDate: new Date(Date.now() - 86400000 * 3).toISOString(), totalAmount: 90000, status: 'cancelled', tour: { id: 7, name: 'Tour Centro Histórico' }, tourist: { user: { name: 'Sofía Herrera' } } },
  { id: 7, bookingCode: 'LP-001240', tourDate: new Date(Date.now() + 86400000).toISOString(), totalAmount: 480000, status: 'confirmed', tour: { id: 1, name: 'Playa Blanca Rodadero' }, tourist: { user: { name: 'Samuel Parra' } } },
  { id: 8, bookingCode: 'LP-001241', tourDate: new Date(Date.now() + 86400000 * 10).toISOString(), totalAmount: 85000, status: 'pending', tour: { id: 8, name: 'Pesca Artesanal Taganga' }, tourist: { user: { name: 'Camila Rojas' } } },
];

export const mockNotifications: MockNotification[] = [
  { id: 1, type: 'booking_confirmed', title: 'Nueva reserva confirmada', body: 'Juan Pablo reservó Playa Blanca Rodadero', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, type: 'sale_completed', title: 'Venta completada', body: 'Pedro González completó una venta de $180.000', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, type: 'review_received', title: 'Nueva reseña', body: 'Tour Tayrona Full Day recibió 5 estrellas', isRead: false, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 4, type: 'commission_paid', title: 'Comisión pagada', body: 'Se pagó $36.000 de comisión a María López', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, type: 'booking_confirmed', title: 'Nueva reserva', body: 'Isabella Martínez reservó Tayrona Full Day', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export const mockDashboardAdmin = {
  totalJaladores: mockJaladores.length,
  totalOperators: mockOperators.length,
  activeTours: mockTours.filter(t => t.status === 'active').length,
  totalBookings: mockBookings.length,
  gmv: mockBookings.reduce((s, b) => s + b.totalAmount, 0),
  platformRevenue: Math.round(mockBookings.reduce((s, b) => s + b.totalAmount, 0) * 0.20),
  jaladorCommissions: Math.round(mockBookings.reduce((s, b) => s + b.totalAmount, 0) * 0.10),
  bookingsByStatus: [
    { status: 'confirmed', count: mockBookings.filter(b => b.status === 'confirmed').length },
    { status: 'pending', count: mockBookings.filter(b => b.status === 'pending').length },
    { status: 'completed', count: mockBookings.filter(b => b.status === 'completed').length },
    { status: 'cancelled', count: mockBookings.filter(b => b.status === 'cancelled').length },
  ],
};

/** Returns a mock response for the given request URL + method, or undefined if not handled */
export function getMockResponse(method: string, url: string): any {
  const m = method.toUpperCase();
  const path = url.split('?')[0];

  // Dashboard
  if (m === 'GET' && path.endsWith('/dashboard/admin')) return mockDashboardAdmin;
  if (m === 'GET' && path.endsWith('/dashboard/jalador')) {
    return {
      jalador: { id: 1, refCode: 'DEMO2024', bio: 'Guía demo', zone: 'Centro Histórico', score: 92, totalSales: 45, badge: 'gold' },
      sales: { today: 2, week: 8, month: 32, total: 145 },
      commissions: { pending: 450000, paid: 1250000, total: 1700000 },
    };
  }
  if (m === 'GET' && path.endsWith('/dashboard/operator')) {
    return {
      tours: { active: 4, total: 6, pendingReview: 1 },
      bookings: { today: 3, week: 12, month: 48, total: 210 },
      revenue: { total: 8450000, thisMonth: 2300000 },
    };
  }
  if (m === 'GET' && path.endsWith('/dashboard/tourist')) {
    return { upcomingBookings: 2, pastBookings: 5, favoriteCount: 3 };
  }

  // Notifications
  if (m === 'GET' && path.endsWith('/notifications/count')) return { count: mockNotifications.filter(n => !n.isRead).length };
  if (m === 'GET' && path.endsWith('/notifications')) return mockNotifications;
  if (m === 'POST' && path.endsWith('/notifications/read-all')) {
    mockNotifications.forEach(n => { n.isRead = true; });
    return { ok: true };
  }

  // Users / Jaladores / Operators
  if (m === 'GET' && path.endsWith('/users/jaladores')) return { data: mockJaladores, total: mockJaladores.length };
  if (m === 'GET' && path.endsWith('/users/operators')) return { data: mockOperators, total: mockOperators.length };
  if (m === 'GET' && path.endsWith('/reputation/ranking')) return mockJaladores.slice(0, 5);
  // Jalador por refCode (referral landing) — busca en mocks o devuelve el primero como fallback
  if (m === 'GET' && /\/users\/jaladores\/ref\/[\w-]+$/.test(path)) {
    const code = path.split('/').pop();
    return mockJaladores.find(j => j.refCode === code) || mockJaladores[0];
  }

  // Tours
  if (m === 'GET' && path.endsWith('/tours/featured')) return mockTours.filter(t => t.status === 'active').slice(0, 4);
  if (m === 'GET' && path.endsWith('/tours/categories')) return [
    { id: 1, name: 'Playa', slug: 'playa', colorHex: '#0D5C8A' },
    { id: 2, name: 'Aventura', slug: 'aventura', colorHex: '#2D6A4F' },
    { id: 3, name: 'Cultural', slug: 'cultural', colorHex: '#F5882A' },
    { id: 4, name: 'Gastronomía', slug: 'gastronomia', colorHex: '#CC3333' },
  ];
  if (m === 'GET' && /\/tours\/slug\/[\w-]+$/.test(path)) {
    const slug = path.split('/').pop();
    return enrichTour(mockTours.find(t => t.slug === slug) || mockTours[0]);
  }
  if (m === 'GET' && /\/tours\/\d+$/.test(path)) {
    const id = Number(path.split('/').pop());
    return enrichTour(mockTours.find(t => t.id === id) || mockTours[0]);
  }
  if (m === 'GET' && path.endsWith('/tours')) return { data: mockTours.map(enrichTour), total: mockTours.length };

  // Bookings
  if (m === 'GET' && path.endsWith('/bookings/operator')) return mockBookings;
  if (m === 'GET' && path.endsWith('/bookings/my')) return mockBookings.slice(0, 3);

  // Bookings create
  if (m === 'POST' && path.endsWith('/bookings')) {
    return {
      id: Math.floor(Math.random() * 10000),
      bookingCode: `LP-${String(Date.now()).slice(-6)}`,
      qrCode: `laperla-booking-${Date.now()}`,
      status: 'confirmed',
    };
  }
  if (m === 'POST' && /\/bookings\/\d+\/(confirm|complete|cancel)$/.test(path)) return { ok: true };

  // Admin actions — always return ok
  if (m === 'POST' && /\/admin\/.+\/(approve|reject|suspend|reactivate)$/.test(path)) return { ok: true };
  if (m === 'PUT' && /\/admin\/(jaladores|operators)\/\d+$/.test(path)) return { ok: true };

  // Reviews — datos realistas para social proof
  if (m === 'GET' && /\/reviews\/tour\/\d+$/.test(path)) return {
    data: [
      { id: 1, tourRating: 5, tourComment: 'Increíble experiencia! El guía fue muy atento y los paisajes son de otro mundo. 100% recomendado para familias.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), author: { id: 201, name: 'Carolina Mejía' }, operatorReply: 'Gracias Carolina! Nos alegra que hayan disfrutado. Los esperamos pronto.' },
      { id: 2, tourRating: 4, tourComment: 'Muy buen tour, bien organizado. Solo que la salida se retrasó 20 minutos. El almuerzo estuvo delicioso.', createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), author: { id: 202, name: 'Andrés Vargas' } },
      { id: 3, tourRating: 5, tourComment: 'Lo mejor que hicimos en Santa Marta! El snorkel fue espectacular y el equipo muy profesional.', createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), author: { id: 203, name: 'Laura Quintero' } },
      { id: 4, tourRating: 5, tourComment: 'Llevé a mi familia completa y todos quedaron felices. Las playas son paradisíacas.', createdAt: new Date(Date.now() - 86400000 * 21).toISOString(), author: { id: 204, name: 'Roberto Castro' }, operatorReply: 'Qué bueno Roberto! Las familias siempre son bienvenidas.' },
      { id: 5, tourRating: 4, tourComment: 'Buen precio por lo que ofrecen. Recomiendo llevar protector solar porque el sol pega fuerte.', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), author: { id: 205, name: 'Valentina Ríos' } },
    ],
    total: 5,
  };

  // Profile — devolvemos un perfil de jalador completo para la demo
  if (m === 'GET' && path.endsWith('/auth/profile')) {
    return {
      id: 1,
      name: 'Jalador Demo',
      email: 'jalador@laperla.co',
      phone: '+57 300 123 4567',
      whatsappPhone: '+57 300 123 4567',
      role: 'jalador',
      jalador: {
        id: 1,
        refCode: 'DEMO2024',
        bio: 'Guía turístico con experiencia en Santa Marta y la Sierra Nevada',
        zone: 'Centro Histórico',
        languages: ['Español', 'Inglés'],
        score: 92,
        totalSales: 45,
        badge: 'gold',
        bankName: 'Bancolombia',
        bankAccount: '1234567890',
        nequiPhone: '+57 300 123 4567',
        payoutMethod: 'nequi',
      },
    };
  }
  if (m === 'PUT' && path.endsWith('/users/me')) return { ok: true };
  if (m === 'PUT' && path.endsWith('/users/jaladores/me')) return { ok: true };

  // Catch-all for unknown admin/API endpoints — return empty to avoid crashes
  return {};
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('turescol_token') === 'beta-demo-token';
}

// Galerias por tour — primera es la cover, despues adicionales
const tourGalleries: Record<string, string[]> = {
  // Tours con foto unica
  'tayrona-full-day': ['/tours/TAYRONA%20FULL%20DAY.jpg'],
  'playa-blanca-rodadero': ['/tours/PLAYA%20BLANCA%20RODADERRO.jpg'],
  'pesca-taganga': ['/tours/PESCA%20ARTESANAL%20TAGANGA.jpg'],
  'ciudad-perdida-4d': ['/tours/CIUDAD%20PERDIDO.jpg'],
  'minca-cascadas-cafe': ['/tours/MINCA%20CASCADAS.jpg'],
  'isla-aguja-snorkel': ['/tours/ISLA%20AGUJA%20SNORKEL.jpg'],
  'sendero-sierra-nevada': ['/tours/SENDERO%20CAMINATA%20SIERRA%20NEVADA.jpg'],
  // Tours con multiples fotos
  'centro-historico': [
    '/tours/CENTRO%20HISTORICO%20DE%20SANTA%20MARTA%201.jpg',
    '/tours/CENTRO%20HISTORICO%20DE%20SANTA%20MARTA%202.jpg',
  ],
  'bahia-concha': [
    '/tours/BAHIA%20CONCHA%20UNO.jpg',
    '/tours/BAHIA%20CONCHA%20DOS.jpg',
  ],
  'playa-cristal': [
    '/tours/PLAYA%20CRISTAL%20UNO.jpg',
    '/tours/PLAYA%20CRISTAL%20DOS.jpg',
  ],
  'cabo-san-juan': [
    '/tours/CABO%20SAN%20JUAN%20UNO.jpg',
    '/tours/CABO%20SAN%20JUAN%20DOS.jpg',
  ],
  'guachaca-buritaca': [
    '/tours/BURITACA%20UNO.jpg',
    '/tours/BURITACA%20DOS.jpg',
  ],
  'palomino': [
    '/tours/PALOMINO%20UNO.jpg',
    '/tours/PALOMINO%20DOS.jpg',
    '/tours/PALOMINO%20TRES.jpg',
  ],
  'cabo-de-la-vela': [
    '/tours/CABO%20DE%20LA%20VELA%20UNO.jpg',
    '/tours/CABO%20DE%20LA%20VELA%20DOS.jfif',
  ],
  'chiva-rumbera': [
    '/tours/CHIVA%20RUMBERA%20UNO.jpg',
    '/tours/CHIVA%20RUMBERA%20DOS.jpg',
  ],
  'playa-cristal-lancha': [
    '/tours/PLAYA%20CRISTAL%20EN%20LANCHA%20UNO.jpg',
  ],
  'cabo-san-juan-lancha': [
    '/tours/CABO%20SAN%20JUAN%20EN%20LANCHA.jfif',
    '/tours/CABO%20SAN%20JUAN%20EN%20LANCHA%20DOS.jpg',
  ],
};

// Adds all the extra fields that the tour detail page expects.
// The base mockTours only have the minimal fields for list views.
function enrichTour(t: MockTour): any {
  const customGallery = tourGalleries[t.slug];
  const gallery = customGallery || [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    'https://images.unsplash.com/photo-1559554704-d4934ae2c12b?w=800',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
    'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800',
  ];
  const tourDescriptions: Record<string, { short: string; long: string; includes: string[]; excludes: string[]; departure: string; departureTime: string; returnTime: string; duration: string }> = {
    'bahia-concha': { short: 'Transporte en chiva, entrada al Parque Tayrona, guía, almuerzo y seguro.', long: 'Bahía Concha es una de las playas más hermosas del Parque Tayrona. Llegarás en la clásica chiva colombiana, disfrutarás de aguas cristalinas, arena blanca y un almuerzo típico. Guía profesional incluido.', includes: ['Transporte ida/vuelta en chiva', 'Entrada al Parque Tayrona', 'Guía profesional', 'Almuerzo típico', 'Seguro'], excludes: ['Bebidas alcohólicas', 'Propinas', 'Gastos personales'], departure: 'Hotel en Santa Marta', departureTime: '08:30', returnTime: '16:00', duration: '7.5 horas' },
    'playa-cristal': { short: 'Transporte climatizado, entrada Parque Tayrona, guía, seguro y lancha.', long: 'Playa Cristal es famosa por sus aguas transparentes perfectas para snorkel. Transporte climatizado desde tu hotel, entrada al parque y lancha incluida. Uno de los destinos favoritos de Santa Marta.', includes: ['Transporte climatizado ida/vuelta', 'Entrada al Parque Tayrona', 'Guía profesional', 'Seguro', 'Lancha'], excludes: ['Almuerzo', 'Bebidas', 'Equipo de snorkel'], departure: 'Hotel en Santa Marta', departureTime: '06:30', returnTime: '16:00', duration: '9.5 horas' },
    'cabo-san-juan': { short: 'Entrada al Parque Tayrona, guía y seguro. La playa más icónica de Tayrona.', long: 'Cabo San Juan es la playa más emblemática del Parque Tayrona, con su famosa roca mirador y aguas turquesas. Transporte ida y vuelta, entrada al parque, guía profesional y seguro incluidos. Una experiencia inolvidable.', includes: ['Transporte ida/vuelta', 'Entrada al Parque Tayrona', 'Guía profesional', 'Seguro'], excludes: ['Almuerzo', 'Bebidas', 'Hamacas/camping'], departure: 'Hotel en Santa Marta', departureTime: '06:30', returnTime: '16:00', duration: '9.5 horas' },
    'guachaca-buritaca': { short: 'Transporte climatizado, entradas, guía, desayuno, almuerzo y seguro.', long: 'Recorre los ríos y playas de Guachaca y Buritaca, dos joyas escondidas entre la Sierra Nevada y el mar. Incluye desayuno, almuerzo típico, transporte climatizado y guía. Perfecto para quienes buscan naturaleza sin multitudes.', includes: ['Transporte climatizado ida/vuelta', 'Entradas', 'Guía profesional', 'Desayuno', 'Almuerzo', 'Seguro'], excludes: ['Bebidas alcohólicas', 'Propinas'], departure: 'Hotel en Santa Marta', departureTime: '08:30', returnTime: '17:00', duration: '8.5 horas' },
    'palomino': { short: 'Transporte climatizado, guía, desayuno, almuerzo y seguro.', long: 'Palomino es donde el río se encuentra con el mar Caribe. Disfruta del famoso tubing por el río Palomino, playas paradisíacas y la mejor gastronomía local. Transporte climatizado, desayuno, almuerzo y guía incluidos.', includes: ['Transporte climatizado ida/vuelta', 'Guía profesional', 'Desayuno', 'Almuerzo', 'Seguro'], excludes: ['Tubing (pago aparte)', 'Bebidas alcohólicas', 'Propinas'], departure: 'Hotel en Santa Marta', departureTime: '08:30', returnTime: '16:00', duration: '7.5 horas' },
    'cabo-de-la-vela': { short: 'Tour de 2 días: transporte, guía, hospedaje en ranchería, 3 comidas.', long: 'Viaja al punto más norte de Sudamérica. Cabo de la Vela en La Guajira es un desierto que se encuentra con el mar Caribe. Incluye transporte climatizado, guía, hospedaje en ranchería Wayúu, desayuno, almuerzo y cena del primer día, más desayuno y almuerzo del segundo día. Una experiencia cultural única.', includes: ['Transporte climatizado ida/vuelta', 'Guía profesional', 'Hospedaje en ranchería Wayúu', 'Desayuno día 1 y 2', 'Almuerzo día 1 y 2', 'Cena día 1'], excludes: ['Bebidas', 'Propinas', 'Artesanías'], departure: 'Hotel en Santa Marta', departureTime: '04:00', returnTime: '18:00 (día siguiente)', duration: '2 días' },
    'chiva-rumbera': { short: 'City tour rumbero por Santa Marta en la clásica chiva colombiana, 2 horas.', long: '¡La mejor rumba de Santa Marta sobre ruedas! Recorre la ciudad en la clásica chiva colombiana con música en vivo, luces y la mejor energía del Caribe. Dos horas de puro goce. Disponible en horario nocturno.', includes: ['Recorrido en chiva por la ciudad', 'Música en vivo', '2 horas de recorrido'], excludes: ['Bebidas', 'Comida'], departure: 'Centro de Santa Marta', departureTime: '20:00', returnTime: '22:00', duration: '2 horas' },
    'playa-cristal-lancha': { short: 'Acceso directo en lancha a Playa Cristal, entrada Parque Tayrona y guía.', long: 'Llega directo a Playa Cristal en lancha desde Taganga, sin caminata. La forma más rápida y cómoda de disfrutar esta playa de aguas cristalinas. Entrada al Parque Tayrona y guía incluidos.', includes: ['Transporte en lancha ida/vuelta', 'Entrada al Parque Tayrona', 'Guía profesional'], excludes: ['Almuerzo', 'Bebidas', 'Equipo de snorkel'], departure: 'Taganga', departureTime: '08:30', returnTime: '16:00', duration: '7.5 horas' },
    'cabo-san-juan-lancha': { short: 'Acceso directo en lancha a Cabo San Juan, entrada Parque Tayrona, guía y seguro.', long: 'La forma más exclusiva de llegar a Cabo San Juan: en lancha directa desde Taganga. Sin caminatas, sin filas. Entrada al Parque Tayrona, guía profesional y seguro incluidos. Disfruta de la playa más icónica de Tayrona con más tiempo.', includes: ['Transporte en lancha ida/vuelta', 'Entrada al Parque Tayrona', 'Guía profesional', 'Seguro'], excludes: ['Almuerzo', 'Bebidas', 'Hamacas'], departure: 'Taganga', departureTime: '08:30', returnTime: '16:00', duration: '7.5 horas' },
  };

  const tourInfo = tourDescriptions[t.slug];

  return {
    ...t,
    shortDescription: tourInfo?.short || `Disfruta de ${t.name} con ${t.operator.companyName}. Una experiencia inolvidable en el Caribe colombiano.`,
    description: tourInfo?.long || `${t.name} es una experiencia única organizada por ${t.operator.companyName}. Disfruta de paisajes increíbles, guía profesional, transporte incluido y todas las comodidades para un día perfecto. Ideal para familias, parejas y grupos de amigos que buscan descubrir lo mejor del Caribe colombiano en un ambiente seguro y acogedor.`,
    priceChild: Math.round(t.priceAdult * 0.7),
    maxPeople: 20,
    departurePoint: tourInfo?.departure || 'Hotel en Santa Marta',
    departureTime: tourInfo?.departureTime || '07:00',
    returnTime: tourInfo?.returnTime || '17:00',
    location: 'Santa Marta, Magdalena',
    duration: tourInfo?.duration || '10 horas',
    durationHours: 10,
    includes: tourInfo?.includes || ['Transporte ida y vuelta', 'Guía bilingüe', 'Almuerzo típico', 'Equipo de snorkel', 'Hidratación', 'Seguro del viaje'],
    excludes: tourInfo?.excludes || ['Bebidas alcohólicas', 'Propinas', 'Gastos personales'],
    restrictions: ['No recomendado para mujeres embarazadas', 'Menores acompañados por un adulto'],
    observations: 'Llevar bloqueador solar, gorra y traje de baño. Punto de encuentro confirmado por WhatsApp.',
    galleryUrls: gallery,
    totalReviews: Math.floor(t.totalBookings * 0.6),
    isFeatured: true,
    operator: { ...t.operator, logoUrl: '', score: 92 },
    category: { id: 1, name: 'Playa', slug: 'playa' },
  };
}
