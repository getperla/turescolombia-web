import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_CATALOG, type MockTour } from '../../../lib/agente/mock';
import {
  generateReference,
  getWompiCheckoutUrl,
  isWompiConfigured,
} from '../../../lib/wompi';

// Endpoint que arma la reserva atomica del itinerario propuesto por el agente.
// Genera una referencia unica + URL de checkout de Wompi (sandbox por defecto).
//
// Por ahora NO persiste la reserva — eso vendra cuando AGENT_LIVE+SUPABASE
// esten activos. El sandbox de Wompi es gratis y devuelve transacciones de
// prueba sin movimiento real de dinero.

type RequestBody = {
  tourIds: number[];
  people: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  refCode?: string;
};

type ResponseBody =
  | {
      reference: string;
      paymentUrl: string;
      totalCop: number;
      commissionCop: number;
      mock: boolean;
      tours: { id: number; name: string; slug: string; price_adult: number }[];
    }
  | { error: string };

const COMMISSION_RATE = 0.2;

async function loadCatalog(): Promise<MockTour[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return FALLBACK_CATALOG;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('tours')
      .select('id, name, slug, price_adult, duration, includes, avg_rating')
      .eq('status', 'active');
    if (error || !data || data.length === 0) return FALLBACK_CATALOG;
    return data as unknown as MockTour[];
  } catch {
    return FALLBACK_CATALOG;
  }
}

function getOrigin(req: NextApiRequest): string {
  const host = req.headers.host || 'localhost:3000';
  const proto =
    (req.headers['x-forwarded-proto'] as string) ||
    (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const body = (req.body || {}) as RequestBody;
  const { tourIds, people, clientName, clientPhone, clientEmail, refCode } = body;

  if (!Array.isArray(tourIds) || tourIds.length === 0) {
    return res.status(400).json({ error: 'tourIds vacio o invalido.' });
  }
  if (!people || people < 1) {
    return res.status(400).json({ error: 'people debe ser >= 1.' });
  }
  if (!clientName || !clientPhone) {
    return res.status(400).json({ error: 'clientName y clientPhone son requeridos.' });
  }

  const catalog = await loadCatalog();
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const selected: MockTour[] = [];
  for (const id of tourIds) {
    const t = byId.get(id);
    if (!t) {
      return res.status(404).json({ error: `Tour ${id} no encontrado en catalogo.` });
    }
    selected.push(t);
  }

  const totalCop = selected.reduce((acc, t) => acc + t.price_adult * people, 0);
  const commissionCop = Math.round(totalCop * COMMISSION_RATE);
  const reference = generateReference();

  const origin = getOrigin(req);
  const paymentUrl = getWompiCheckoutUrl({
    amountInCents: totalCop * 100,
    reference,
    customerEmail: clientEmail || `${clientPhone}@laperla.demo`,
    customerName: clientName,
    customerPhone: clientPhone,
    redirectUrl: `${origin}/pago-resultado?ref=${reference}${refCode ? `&jal=${refCode}` : ''}`,
    description: `La Perla — ${selected.length} tour(s) Santa Marta`,
  });

  return res.status(200).json({
    reference,
    paymentUrl,
    totalCop,
    commissionCop,
    mock: !isWompiConfigured(),
    tours: selected.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      price_adult: t.price_adult,
    })),
  });
}
