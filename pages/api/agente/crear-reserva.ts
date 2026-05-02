import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_CATALOG, type MockTour } from '../../../lib/agente/mock';
import {
  createPaymentLink,
  generateReference,
} from '../../../lib/payments';
import { createSale } from '../../../lib/sales';
import { isDemo } from '../../../lib/mode';

// Endpoint que arma la reserva atomica del itinerario propuesto por el agente.
//
// Si NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY estan seteadas:
//   → persiste la venta en sales + sale_items via lib/sales.createSale
// Si no estan:
//   → genera link de pago sin persistir (modo "fly-by", para dev local)
//
// El modo demo/produccion lo controla LAPERLA_MODE — el adapter de pagos
// (lib/payments) hace el switch interno al sandbox/produccion de Wompi.

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
      saleId?: string;
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
      .select('id, name, slug, price_adult, duration, includes, avg_rating, cover_image_url')
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

function hasSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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

  const origin = getOrigin(req);
  const totalCop = selected.reduce((acc, t) => acc + t.price_adult * people, 0);
  const commissionCop = Math.round(totalCop * COMMISSION_RATE);

  // Path A: Supabase disponible — persistir venta atomicamente
  if (hasSupabase()) {
    try {
      const result = await createSale({
        jaladorRefCode: refCode || 'SIN-REF',
        clientName,
        clientPhone,
        clientEmail,
        people,
        tours: selected,
        redirectUrl: `${origin}/pago-resultado?ref={REFERENCE}${refCode ? `&jal=${refCode}` : ''}`,
      });

      return res.status(200).json({
        reference: result.reference,
        paymentUrl: result.paymentUrl,
        totalCop: result.sale.total_cop,
        commissionCop: result.sale.commission_cop,
        mock: result.sale.is_demo,
        saleId: result.sale.id,
        tours: selected.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          price_adult: t.price_adult,
        })),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Error desconocido';
      return res.status(500).json({ error: `Persistencia fallo: ${detail}` });
    }
  }

  // Path B: Supabase no configurado — solo generar link sin persistir
  const reference = generateReference();
  const link = createPaymentLink({
    amountCop: totalCop,
    reference,
    customerName: clientName,
    customerPhone: clientPhone,
    customerEmail: clientEmail || `${clientPhone}@laperla.demo`,
    redirectUrl: `${origin}/pago-resultado?ref=${reference}${refCode ? `&jal=${refCode}` : ''}`,
    description: `La Perla — ${selected.length} tour(s) Santa Marta`,
  });

  return res.status(200).json({
    reference: link.reference,
    paymentUrl: link.paymentUrl,
    totalCop,
    commissionCop,
    mock: isDemo(),
    tours: selected.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      price_adult: t.price_adult,
    })),
  });
}
