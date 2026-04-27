// API route: POST /api/wompi/sign
// Plan 2: wompi-prod-webhook-idempotente (PAY-01, PAY-03)
// Created: 2026-04-27
//
// Genera la firma de integridad SHA256 que Wompi requiere para checkouts.
// El integrity_secret NUNCA debe llegar al cliente, por eso este endpoint es server-side.
//
// Formula oficial Wompi (verificar contra docs.wompi.co al implementar):
//   sha256(reference + amount_in_cents + currency + integrity_secret)
//
// Request body:
//   { reference: string, amountInCents: number, currency: 'COP' }
// Response:
//   { signature: string }

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';

interface SignRequest {
  reference: string;
  amountInCents: number;
  currency?: 'COP';
}

interface SignResponse {
  signature: string;
}

interface ErrorResponse {
  error: string;
}

const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignResponse | ErrorResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!INTEGRITY_SECRET) {
    res.status(500).json({
      error: 'WOMPI_INTEGRITY_SECRET no configurado en el servidor. Configurarlo en Vercel env vars.',
    });
    return;
  }

  const body = req.body as Partial<SignRequest>;

  if (!body.reference || typeof body.reference !== 'string') {
    res.status(400).json({ error: 'reference es requerido (string)' });
    return;
  }

  if (!body.amountInCents || typeof body.amountInCents !== 'number' || body.amountInCents <= 0) {
    res.status(400).json({ error: 'amountInCents es requerido (number > 0)' });
    return;
  }

  const currency = body.currency ?? 'COP';
  if (currency !== 'COP') {
    res.status(400).json({ error: 'Solo COP soportado' });
    return;
  }

  // Concatenar segun formula Wompi
  const stringToHash = `${body.reference}${body.amountInCents}${currency}${INTEGRITY_SECRET}`;
  const signature = crypto.createHash('sha256').update(stringToHash).digest('hex');

  res.status(200).json({ signature });
}
