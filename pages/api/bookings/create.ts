import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_CATALOG, type MockTour } from '../../../lib/agente/mock';
import { createSale } from '../../../lib/sales';
import { generateReference } from '../../../lib/payments';
import { isDemo } from '../../../lib/mode';

// Endpoint que crea reserva de turista directo (flujo /tour/[slug]).
// Reemplaza la llamada a backend Render legacy que devolvia 401 Unauthorized
// para invitados. Persiste en Supabase via lib/sales.createSale.
//
// Compatible con el body que pages/tour/[id].tsx envia hoy:
//   { tourId, tourDate, numAdults, numChildren, refCode, clientName,
//     clientLastName, clientPhone, clientHotel, paymentMethod }
//
// Y devuelve un shape compatible con el frontend:
//   { bookingCode, qrCode, totalAmount, ... }

type RequestBody = {
  tourId: number;
  tourDate: string;
  numAdults: number;
  numChildren?: number;
  refCode?: string;
  clientName: string;
  clientLastName?: string;
  clientPhone: string;
  clientHotel?: string;
  clientEmail?: string;
  paymentMethod?: string;
};

type ResponseBody =
  | {
      bookingCode: string;
      qrCode: string;
      totalAmount: number;
      reference: string;
      paymentUrl?: string;
      saleId?: string;
    }
  | { message: string; statusCode: number };

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

// Genera un bookingCode legible para mostrar al cliente (LP-XXXXXX).
function generateBookingCode(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 5);
  return `LP-${ts}${rand}`.toUpperCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Metodo no permitido', statusCode: 405 });
  }

  const body = (req.body || {}) as RequestBody;
  const {
    tourId,
    tourDate,
    numAdults,
    numChildren = 0,
    refCode,
    clientName,
    clientLastName,
    clientPhone,
    clientEmail,
  } = body;

  // Validaciones basicas — si fallan, devolvemos shape compatible con el
  // frontend que ya espera { message, statusCode } por axios-style errors.
  if (!tourId) return res.status(400).json({ message: 'tourId requerido', statusCode: 400 });
  if (!tourDate) return res.status(400).json({ message: 'tourDate requerido', statusCode: 400 });
  if (!numAdults || numAdults < 1) return res.status(400).json({ message: 'numAdults debe ser >= 1', statusCode: 400 });
  if (!clientName?.trim()) return res.status(400).json({ message: 'clientName requerido', statusCode: 400 });
  if (!clientPhone?.trim()) return res.status(400).json({ message: 'clientPhone requerido', statusCode: 400 });

  const fullClientName = clientLastName ? `${clientName.trim()} ${clientLastName.trim()}` : clientName.trim();
  const totalPeople = numAdults + numChildren;

  // Path A — Supabase configurada: persistir via createSale.
  if (hasSupabase()) {
    try {
      const catalog = await loadCatalog();
      const tour = catalog.find((t) => t.id === tourId);
      if (!tour) {
        return res.status(404).json({ message: `Tour ${tourId} no encontrado`, statusCode: 404 });
      }

      const origin = getOrigin(req);
      const result = await createSale({
        jaladorRefCode: refCode || 'DIRECTO',
        clientName: fullClientName,
        clientPhone: clientPhone.trim(),
        clientEmail,
        people: totalPeople,
        tours: [tour],
        redirectUrl: `${origin}/pago-resultado?ref={REFERENCE}${refCode ? `&jal=${refCode}` : ''}`,
      });

      // bookingCode es human-friendly para mostrar; el QR contiene la
      // referencia de pago (o el bookingCode mismo).
      const bookingCode = generateBookingCode();
      const qrCode = result.reference;

      return res.status(200).json({
        bookingCode,
        qrCode,
        totalAmount: result.sale.total_cop,
        reference: result.reference,
        paymentUrl: result.paymentUrl,
        saleId: result.sale.id,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Error desconocido';
      return res.status(500).json({ message: `No se pudo crear la reserva: ${detail}`, statusCode: 500 });
    }
  }

  // Path B — Sin Supabase: respuesta simulada para que el flujo demo siga
  // funcionando aunque no haya BD configurada (dev local sin .env).
  const reference = generateReference();
  const bookingCode = generateBookingCode();
  return res.status(200).json({
    bookingCode,
    qrCode: reference,
    // Estimado simple sin lookup de BD; el frontend ya muestra el total
    // calculado localmente con el precio del tour.
    totalAmount: 0,
    reference,
  });
}
