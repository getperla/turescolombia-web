import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Endpoint del asistente de ventas para el jalador. Recibe el historial
// del chat + el contexto del jalador (nombre, refCode) y delega a Claude
// con el catalogo de tours embebido en el system prompt.
//
// Variables requeridas:
//   ANTHROPIC_API_KEY            (server-only, NO exponer al cliente)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (server-only)

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  messages: ChatMessage[];
  refCode?: string;
  context?: { jaladorName?: string };
};

type ResponseBody =
  | { message: string; quiereReservar: boolean; usage?: Anthropic.Messages.Usage }
  | { error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return res
      .status(500)
      .json({ error: 'Variables de Supabase faltantes (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).' });
  }

  const { messages, refCode, context } = (req.body || {}) as RequestBody;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Falta el campo messages.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const anthropic = new Anthropic({ apiKey });

  try {
    const { data: tours, error: dbError } = await supabase
      .from('tours')
      .select(
        `
        id, name, slug, description, short_description,
        price_adult, price_child, duration, departure_time,
        return_time, departure_point, max_people,
        includes, excludes, avg_rating, total_bookings,
        category:categories(name)
      `,
      )
      .eq('status', 'active')
      .order('avg_rating', { ascending: false });

    if (dbError) {
      return res.status(500).json({
        error: 'No pude leer el catalogo de tours.',
        details: dbError.message,
      });
    }

    const catalog = tours ?? [];

    const systemPrompt = `Eres el asistente de ventas de La Perla, plataforma de tours verificados en Santa Marta, Colombia.

Tu trabajo es ayudar al jalador (vendedor) a crear el itinerario perfecto para su cliente y generar la reserva.

TOURS DISPONIBLES HOY:
${JSON.stringify(catalog, null, 2)}

REGLAS DE NEGOCIO:
- La comision del jalador es siempre el 20% del precio
- El precio minimo de un tour es lo que aparece en la BD
- Maximo puedes recomendar tours que quepan en el presupuesto
- Siempre muestra el precio total Y la comision del jalador
- La moneda es siempre pesos colombianos (COP)

COMO RESPONDER:
1. Saluda de forma breve y calida
2. Entiende el presupuesto y los dias disponibles
3. Recomienda 2 o 3 combinaciones de tours que quepan
4. Muestra para cada opcion:
   - Nombre del tour
   - Precio por persona
   - Duracion
   - Que incluye (maximo 3 puntos)
   - Comision que gana el jalador
5. Pregunta cual prefiere el cliente
6. Cuando el cliente confirme, responde con:
   ACCION: CREAR_RESERVA
   tours: [lista de IDs]
   total: numero

TONO:
- Amigable y profesional
- Respuestas cortas — el jalador esta en la calle
- En espanol colombiano natural
- Maximo 150 palabras por respuesta
- Usa emojis con moderacion 🏖️

CONTEXTO ACTUAL:
Jalador: ${context?.jaladorName || 'Asesor La Perla'}
Codigo: ${refCode || 'SIN-REF'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const first = response.content.find((b) => b.type === 'text');
    if (!first || first.type !== 'text') {
      return res.status(500).json({ error: 'Respuesta inesperada del agente.' });
    }

    const responseText = first.text;
    const quiereReservar =
      responseText.includes('ACCION: CREAR_RESERVA') ||
      responseText.includes('ACCIÓN: CREAR_RESERVA');

    return res.status(200).json({
      message: responseText,
      quiereReservar,
      usage: response.usage,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error del agente:', err);
    return res.status(500).json({
      error: 'El agente no esta disponible ahora',
      details: detail,
    });
  }
}
