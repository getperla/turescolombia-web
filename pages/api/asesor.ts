import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { getTours, type Tour } from '../../lib/api';
import {
  buildMockResponse,
  FALLBACK_CATALOG,
  findLastConstraints,
  isLiveMode,
  type MockTour,
} from '../../lib/agente/mock';

// Endpoint del asesor inteligente. Recibe el historial de chat con las
// restricciones del cliente final (dias, presupuesto, intereses) y devuelve
// una recomendacion natural + un itinerario estructurado opcional.
//
// Por defecto corre en MODO MOCK (cero llamadas a Claude → cero costo).
// Activar real Claude API: setear AGENT_LIVE=true Y ANTHROPIC_API_KEY.

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type RequestBody = {
  messages: ChatMessage[];
};

type ItineraryDay = {
  day: number;
  tourId: number;
  tourName: string;
  tourSlug: string;
  pricePerPerson: number;
};

type Itinerary = {
  totalDays: number;
  totalCostPerPerson: number;
  groupSize: number;
  totalCostGroup: number;
  days: ItineraryDay[];
};

type ResponseBody =
  | { message: string; itinerary?: Itinerary; recommendedTours?: Tour[]; mock?: boolean }
  | { error: string };

function buildMockItinerary(messages: { role: string; content: string }[]): Itinerary | undefined {
  // Usamos el mismo helper que buildMockResponse para tener la fuente
  // unica de verdad sobre constraints. findLastConstraints hace merge
  // de overrides parciales (Codex P2 #34) — sin esto el itinerario se
  // quedaba con valores viejos cuando el user decia "somos 3 personas"
  // o "subamos a 1.2 millones" en un follow-up.
  const ctx = findLastConstraints(messages as { role: 'user' | 'assistant'; content: string }[]);
  if (!ctx) return undefined;
  const { days: numDays, budget, people } = ctx;
  let remaining = budget;
  const sorted = [...FALLBACK_CATALOG].sort((a, b) => b.avg_rating - a.avg_rating);
  const picks: MockTour[] = [];
  for (const t of sorted) {
    if (picks.length >= numDays) break;
    const cost = t.price_adult * people;
    if (cost > remaining) continue;
    picks.push(t);
    remaining -= cost;
  }
  if (picks.length === 0) return undefined;

  const totalCostPerPerson = picks.reduce((acc, t) => acc + t.price_adult, 0);
  return {
    totalDays: picks.length,
    totalCostPerPerson,
    groupSize: people,
    totalCostGroup: totalCostPerPerson * people,
    days: picks.map((t, i) => ({
      day: i + 1,
      tourId: t.id,
      tourName: t.name,
      tourSlug: t.slug,
      pricePerPerson: t.price_adult,
    })),
  };
}

const SYSTEM_PROMPT = `Eres el asesor turistico de La Perla, la plataforma que conecta turistas con tours verificados en Santa Marta y la region Caribe colombiana.

Tu trabajo es escuchar al cliente final, entender sus restricciones (dias disponibles, presupuesto en pesos colombianos, tamano del grupo, intereses como playa/aventura/cultura) y armar el mejor itinerario posible con los tours reales que tenemos en catalogo.

REGLAS:
1. Habla en espanol colombiano natural, sin tecnicismos. Trato de "tu".
2. Antes de recomendar, asegurate de tener: dias disponibles, presupuesto total y numero de personas. Si falta info, pregunta UNA cosa a la vez (no abrumes).
3. Cuando tengas la info, llama a la herramienta buscar_tours para ver el catalogo real.
4. NO inventes tours, precios ni horarios. Solo usa lo que devuelve buscar_tours.
5. Arma el itinerario priorizando: variedad (no dos playas seguidas si hay otras opciones), calidad (avgRating alto), y que el costo total quepa en el presupuesto.
6. Maximo un tour por dia (los tours suelen ser de 8h+).
7. Si el presupuesto no alcanza para todos los dias, ajusta y explicale al cliente con honestidad.
8. Cuando entregues el itinerario final, llama a la herramienta proponer_itinerario con la lista de tours seleccionados.
9. Responde SIEMPRE de forma corta y clara. Maximo 3 parrafos por turno.`;

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'buscar_tours',
    description:
      'Devuelve la lista de tours activos del catalogo de La Perla con precio por adulto, ubicacion, duracion y rating. Usalo una sola vez por conversacion para tener el catalogo en contexto.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'proponer_itinerario',
    description:
      'Registra el itinerario final propuesto al cliente. Solo llamalo cuando tengas la lista definitiva de tours por dia, despues de haber confirmado las restricciones del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        groupSize: { type: 'number', description: 'Numero de personas en el grupo.' },
        days: {
          type: 'array',
          description: 'Un objeto por cada dia del itinerario.',
          items: {
            type: 'object',
            properties: {
              day: { type: 'number', description: 'Numero de dia (1, 2, 3...)' },
              tourId: { type: 'number', description: 'ID del tour en el catalogo.' },
            },
            required: ['day', 'tourId'],
          },
        },
      },
      required: ['groupSize', 'days'],
    },
  },
];

const MAX_TURNS = 6;

function summarizeToursForAgent(tours: Tour[]) {
  return tours.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    location: t.location,
    duration: t.duration,
    priceAdult: t.priceAdult,
    avgRating: t.avgRating,
    category: t.category?.name ?? null,
    shortDescription: t.shortDescription ?? t.description?.slice(0, 200),
  }));
}

function buildItinerary(
  toolInput: { groupSize: number; days: { day: number; tourId: number }[] },
  catalog: Tour[],
): Itinerary | null {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const days: ItineraryDay[] = [];
  for (const d of toolInput.days) {
    const tour = byId.get(d.tourId);
    if (!tour) return null;
    days.push({
      day: d.day,
      tourId: tour.id,
      tourName: tour.name,
      tourSlug: tour.slug,
      pricePerPerson: tour.priceAdult,
    });
  }
  const totalCostPerPerson = days.reduce((acc, d) => acc + d.pricePerPerson, 0);
  return {
    totalDays: days.length,
    totalCostPerPerson,
    groupSize: toolInput.groupSize,
    totalCostGroup: totalCostPerPerson * toolInput.groupSize,
    days,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido.' });
  }

  const body = req.body as RequestBody;
  if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'Falta el campo messages.' });
  }

  // Modo mock — default. Cero llamadas a Claude.
  if (!isLiveMode()) {
    const { message } = buildMockResponse({
      messages: body.messages,
      catalog: [],
    });
    const itinerary = buildMockItinerary(body.messages);
    return res.status(200).json({ message, itinerary, mock: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const client = new Anthropic({ apiKey });

  let catalog: Tour[] | null = null;
  let finalItinerary: Itinerary | null = null;

  const conversation: Anthropic.Messages.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
        const textBlock = response.content.find((b) => b.type === 'text');
        const message = textBlock && textBlock.type === 'text' ? textBlock.text : '';
        return res.status(200).json({
          message,
          itinerary: finalItinerary ?? undefined,
          recommendedTours: finalItinerary
            ? (catalog ?? []).filter((t) => finalItinerary!.days.some((d) => d.tourId === t.id))
            : undefined,
        });
      }

      if (response.stop_reason !== 'tool_use') {
        const textBlock = response.content.find((b) => b.type === 'text');
        const message = textBlock && textBlock.type === 'text' ? textBlock.text : '';
        return res.status(200).json({ message });
      }

      conversation.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        if (block.name === 'buscar_tours') {
          if (!catalog) {
            const result = await getTours({ limit: '50' });
            catalog = result.data;
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(summarizeToursForAgent(catalog)),
          });
        } else if (block.name === 'proponer_itinerario') {
          if (!catalog) {
            const result = await getTours({ limit: '50' });
            catalog = result.data;
          }
          const built = buildItinerary(
            block.input as { groupSize: number; days: { day: number; tourId: number }[] },
            catalog,
          );
          if (!built) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Error: alguno de los tourId no existe en el catalogo. Revisa los IDs.',
              is_error: true,
            });
          } else {
            finalItinerary = built;
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Itinerario registrado. Resume al cliente y cierra el turno.',
            });
          }
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Herramienta desconocida: ${block.name}`,
            is_error: true,
          });
        }
      }

      conversation.push({ role: 'user', content: toolResults });
    }

    return res.status(200).json({
      message:
        'No pude armar el itinerario en pocos pasos. Cuentame de nuevo dias, presupuesto y numero de personas.',
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : 'Error desconocido del servidor.';
    return res.status(500).json({ error: detail });
  }
}
