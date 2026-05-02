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
};

export type MockChatMessage = { role: 'user' | 'assistant'; content: string };

const COMMISSION_RATE = 0.2;

// Catalogo de respaldo si Supabase esta vacio o no configurado.
// Precios redondeados, datos representativos del catalogo real.
export const FALLBACK_CATALOG: MockTour[] = [
  {
    id: 1,
    name: 'Cabo San Juan — Parque Tayrona',
    slug: 'cabo-san-juan',
    price_adult: 160000,
    duration: '8 horas',
    includes: ['Transporte ida y vuelta', 'Entrada al parque', 'Almuerzo tipico'],
    avg_rating: 4.8,
  },
  {
    id: 2,
    name: 'Playa Blanca — Rodadero',
    slug: 'playa-blanca-rodadero',
    price_adult: 95000,
    duration: '6 horas',
    includes: ['Lancha ida y vuelta', 'Snorkel guiado', 'Frutas y agua'],
    avg_rating: 4.6,
  },
  {
    id: 3,
    name: 'Pueblito Tayrona — Sierra Nevada',
    slug: 'pueblito-tayrona',
    price_adult: 220000,
    duration: '10 horas',
    includes: ['Guia indigena Kogui', 'Transporte', 'Almuerzo tipico'],
    avg_rating: 4.9,
  },
  {
    id: 4,
    name: 'Minca — cascadas y cafe',
    slug: 'minca-cascadas',
    price_adult: 130000,
    duration: '7 horas',
    includes: ['Transporte 4x4', 'Tour cafetal', 'Bano en cascada Marinka'],
    avg_rating: 4.7,
  },
  {
    id: 5,
    name: 'City tour Santa Marta',
    slug: 'city-tour-santa-marta',
    price_adult: 60000,
    duration: '4 horas',
    includes: ['Guia bilingue', 'Centro historico', 'Quinta de San Pedro'],
    avg_rating: 4.4,
  },
  {
    id: 6,
    name: 'Bahia Concha — playa virgen',
    slug: 'bahia-concha',
    price_adult: 110000,
    duration: '7 horas',
    includes: ['Transporte', 'Entrada parque', 'Hidratacion'],
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

function isConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  return /^(s[ií]\b|listo|confirm|dale|hagamos|me parece|el primero|la primera|opcion 1|opci[oó]n 1|esa misma|perfecto)/i.test(
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

function formatRecommendation(picks: MockTour[], people: number, jaladorName: string): string {
  if (picks.length === 0) {
    return `${jaladorName ? `Hola ${jaladorName}, ` : ''}con ese presupuesto no me alcanza ni para el tour mas economico (City tour Santa Marta — $${COP(60000)} COP por persona). Quieres que ajustemos el presupuesto o el numero de personas?`;
  }

  const total = picks.reduce((acc, t) => acc + t.price_adult * people, 0);
  const comision = Math.round(total * COMMISSION_RATE);

  const lineas = picks.map((t, i) => {
    const sub = t.price_adult * people;
    const incluye = (t.includes ?? []).slice(0, 3).join(', ');
    return `${i + 1}. *${t.name}*
   • $${COP(t.price_adult)} COP/persona · ${t.duration}
   • Incluye: ${incluye || 'Detalles en la app'}
   • Subtotal grupo: $${COP(sub)} COP`;
  });

  return `Listo, te armo este plan para ${people} ${people === 1 ? 'persona' : 'personas'}:

${lineas.join('\n\n')}

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

export function buildMockResponse(input: MockResponseInput): {
  message: string;
  quiereReservar: boolean;
} {
  const { messages, catalog, jaladorName = '' } = input;
  const last = messages[messages.length - 1];

  if (!last || last.role !== 'user') {
    return { message: formatGreeting(jaladorName), quiereReservar: false };
  }

  if (isConfirmation(last.content)) {
    return { message: formatConfirmation(), quiereReservar: true };
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

  const source = catalog.length > 0 ? catalog : FALLBACK_CATALOG;
  const picks = pickToursForBudget(source, budget, days, people);
  return { message: formatRecommendation(picks, people, jaladorName), quiereReservar: false };
}

export function isLiveMode(): boolean {
  return process.env.AGENT_LIVE === 'true' && !!process.env.ANTHROPIC_API_KEY;
}
