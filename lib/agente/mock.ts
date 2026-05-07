// Mock determinista del agente. Cero llamadas a Claude → cero costo.
// Usado por /api/agente y /api/asesor cuando AGENT_LIVE !== 'true'.
//
// Parsea el ultimo mensaje del usuario con regex (dias, presupuesto,
// personas), ordena el catalogo por rating, hace greedy selection
// hasta llenar el presupuesto y devuelve una respuesta formateada
// que imita el output esperado del LLM.

export type MockTour = {
  id: number;
  name: string;
  slug: string;
  price_adult: number;
  duration: string;
  includes: string[] | null;
  avg_rating: number;
  cover_image_url?: string | null;
};

export type MockChatMessage = { role: 'user' | 'assistant'; content: string };

const COMMISSION_RATE = 0.2;

// Catalogo de respaldo si Supabase esta vacio o no configurado.
// Precios redondeados, datos representativos del catalogo real.
// Imagenes de Unsplash (host whitelisted en next.config.js remotePatterns).
export const FALLBACK_CATALOG: MockTour[] = [
  {
    id: 1,
    name: 'Cabo San Juan — Parque Tayrona',
    slug: 'cabo-san-juan',
    price_adult: 160000,
    duration: '8 horas',
    includes: ['Transporte ida y vuelta', 'Entrada al parque', 'Almuerzo tipico'],
    avg_rating: 4.8,
    cover_image_url:
      'https://images.unsplash.com/photo-1583309217394-d3f9b9c1c4f2?w=600&q=70',
  },
  {
    id: 2,
    name: 'Playa Blanca — Rodadero',
    slug: 'playa-blanca-rodadero',
    price_adult: 95000,
    duration: '6 horas',
    includes: ['Lancha ida y vuelta', 'Snorkel guiado', 'Frutas y agua'],
    avg_rating: 4.6,
    cover_image_url:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
  },
  {
    id: 3,
    name: 'Pueblito Tayrona — Sierra Nevada',
    slug: 'pueblito-tayrona',
    price_adult: 220000,
    duration: '10 horas',
    includes: ['Guia indigena Kogui', 'Transporte', 'Almuerzo tipico'],
    avg_rating: 4.9,
    cover_image_url:
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=70',
  },
  {
    id: 4,
    name: 'Minca — cascadas y cafe',
    slug: 'minca-cascadas',
    price_adult: 130000,
    duration: '7 horas',
    includes: ['Transporte 4x4', 'Tour cafetal', 'Bano en cascada Marinka'],
    avg_rating: 4.7,
    cover_image_url:
      'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600&q=70',
  },
  {
    id: 5,
    name: 'City tour Santa Marta',
    slug: 'city-tour-santa-marta',
    price_adult: 60000,
    duration: '4 horas',
    includes: ['Guia bilingue', 'Centro historico', 'Quinta de San Pedro'],
    avg_rating: 4.4,
    cover_image_url:
      'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=600&q=70',
  },
  {
    id: 6,
    name: 'Bahia Concha — playa virgen',
    slug: 'bahia-concha',
    price_adult: 110000,
    duration: '7 horas',
    includes: ['Transporte', 'Entrada parque', 'Hidratacion'],
    cover_image_url:
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=70',
    avg_rating: 4.5,
  },
];

const COP = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

function parseBudget(text: string): number | null {
  const lower = text.toLowerCase().replace(/\$/g, '');

  // "3 millones", "1.5 millones"
  const millones = lower.match(/(\d+(?:[.,]\d+)?)\s*millones?/);
  if (millones) {
    const n = parseFloat(millones[1].replace(',', '.'));
    return Math.round(n * 1_000_000);
  }

  // "500 mil", "800k"
  const mil = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/);
  if (mil) {
    const n = parseFloat(mil[1].replace(',', '.'));
    return Math.round(n * 1000);
  }

  // "800.000", "1.500.000", "800,000" — numeros con separador de miles
  const numero = lower.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:pesos|cop)?/);
  if (numero) {
    return parseInt(numero[1].replace(/[.,]/g, ''), 10);
  }

  // "200000 pesos"
  const llano = lower.match(/(\d{4,})\s*(?:pesos|cop)/);
  if (llano) return parseInt(llano[1], 10);

  return null;
}

function parseDays(text: string): number | null {
  const m = text.toLowerCase().match(/(\d+)\s*d[ií]as?/);
  return m ? parseInt(m[1], 10) : null;
}

function parsePeople(text: string): number {
  const lower = text.toLowerCase();
  const m = lower.match(/(\d+)\s*personas?/);
  if (m) return parseInt(m[1], 10);
  if (/\bpareja\b/.test(lower)) return 2;
  if (/\bfamilia\b/.test(lower)) return 4;
  return 1;
}

// Normaliza texto del usuario: lowercase + quita tildes/diacríticos.
// Permite que regex ASCII matcheen palabras con tildes ("sí" → "si",
// "opción" → "opcion", etc). Resuelve P2 de Cowork QA: "sí, dale" no
// se reconocía como confirmación porque \b en regex JS sin flag u
// no maneja bien caracteres unicode con diacríticos.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function isConfirmation(text: string): boolean {
  const t = normalize(text);
  return /^(si\b|listo|confirm|dale|hagamos|me parece|el primero|la primera|opcion 1|esa misma|perfecto|de una|claro|esta bien)/i.test(
    t,
  );
}

function pickToursForBudget(
  catalog: MockTour[],
  budget: number,
  days: number,
  people: number,
): MockTour[] {
  // Ordena por rating desc, luego greedy hasta llenar dias o presupuesto.
  const sorted = [...catalog].sort((a, b) => b.avg_rating - a.avg_rating);
  const picked: MockTour[] = [];
  let remaining = budget;
  for (const tour of sorted) {
    if (picked.length >= days) break;
    const cost = tour.price_adult * people;
    if (cost > remaining) continue;
    picked.push(tour);
    remaining -= cost;
  }
  return picked;
}

function formatRecommendation(
  picks: MockTour[],
  people: number,
  jaladorName: string,
  daysRequested: number,
): string {
  if (picks.length === 0) {
    return `${jaladorName ? `Hola ${jaladorName}, ` : ''}con ese presupuesto no me alcanza ni para el tour mas economico (City tour Santa Marta — $${COP(60000)} COP por persona). Quieres que ajustemos el presupuesto o el numero de personas?`;
  }

  const total = picks.reduce((acc, t) => acc + t.price_adult * people, 0);
  const comision = Math.round(total * COMMISSION_RATE);
  const personas = people === 1 ? 'persona' : 'personas';
  const planes = picks.length === 1 ? 'este plan' : `un plan de ${picks.length} dias`;

  // Resuelve P2 de Cowork QA: si el presupuesto no alcanza para todos los
  // dias pedidos, avisamos en lugar de devolver silenciosamente menos planes
  // que los solicitados (el jalador no se daba cuenta y prometia mal al cliente).
  const aviso =
    picks.length < daysRequested
      ? `\n\n⚠️ Con tu presupuesto solo me alcanza para ${picks.length} de los ${daysRequested} dias que pediste. Quieres ajustar presupuesto o reducir dias?`
      : '';

  return `Listo, te armo ${planes} para ${people} ${personas}:${aviso}

💰 *Total grupo:* $${COP(total)} COP
🪙 *Tu comision (20%):* $${COP(comision)} COP

Te sirve este plan? Si confirmas escribo "si, dale" y armamos la reserva. 🏖️`;
}

function formatConfirmation(): string {
  return `Perfecto, voy a generar la reserva.

ACCION: CREAR_RESERVA

(modo demo: el flujo de pago Wompi se conectara cuando activemos las APIs)`;
}

function formatGreeting(jaladorName: string): string {
  const nombre = jaladorName && jaladorName !== 'Asesor' ? `, ${jaladorName.split(' ')[0]}` : '';
  return `¡Hola${nombre}! 👋 Soy tu asistente de ventas demo de La Perla.

Cuentame: cuantos dias tiene tu cliente y cual es su presupuesto aproximado?

Ejemplo: "4 dias, 800.000 pesos, 2 personas"`;
}

export type MockResponseInput = {
  messages: MockChatMessage[];
  catalog: MockTour[];
  jaladorName?: string;
};

export type MockResponseOutput = {
  message: string;
  quiereReservar: boolean;
  picks?: MockTour[];
  people?: number;
};

// Busca hacia atras el mensaje del usuario mas reciente con dias+presupuesto.
// Usado al confirmar reserva para re-derivar las recomendaciones sin estado.
function findLastConstraints(
  messages: MockChatMessage[],
): { days: number; budget: number; people: number } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const days = parseDays(m.content);
    const budget = parseBudget(m.content);
    if (days && budget) {
      return { days, budget, people: parsePeople(m.content) };
    }
  }
  return null;
}

export function buildMockResponse(input: MockResponseInput): MockResponseOutput {
  const { messages, catalog, jaladorName = '' } = input;
  const last = messages[messages.length - 1];
  const source = catalog.length > 0 ? catalog : FALLBACK_CATALOG;

  if (!last || last.role !== 'user') {
    return { message: formatGreeting(jaladorName), quiereReservar: false };
  }

  if (isConfirmation(last.content)) {
    const ctx = findLastConstraints(messages);
    if (!ctx) {
      return {
        message: 'Antes de confirmar necesito el plan. Cuantos dias y que presupuesto?',
        quiereReservar: false,
      };
    }
    const picks = pickToursForBudget(source, ctx.budget, ctx.days, ctx.people);
    return {
      message: formatConfirmation(),
      quiereReservar: true,
      picks,
      people: ctx.people,
    };
  }

  const days = parseDays(last.content);
  const budget = parseBudget(last.content);
  const people = parsePeople(last.content);

  if (!days || !budget) {
    const faltan = [];
    if (!days) faltan.push('cuantos dias');
    if (!budget) faltan.push('presupuesto en pesos');
    return {
      message: `Para armarte el plan necesito: ${faltan.join(' y ')}. Ejemplo: "3 dias, 600.000 pesos".`,
      quiereReservar: false,
    };
  }

  const picks = pickToursForBudget(source, budget, days, people);
  return {
    message: formatRecommendation(picks, people, jaladorName, days),
    quiereReservar: false,
    picks,
    people,
  };
}

export function isLiveMode(): boolean {
  return process.env.AGENT_LIVE === 'true' && !!process.env.ANTHROPIC_API_KEY;
}
