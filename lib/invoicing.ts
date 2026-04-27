// Invoicing wrapper - DIAN factura electronica via Alegra
// Plan 4: compliance-dian-rnt-habeas-data (CMP-01)
// Created: 2026-04-27
//
// Modelo B (decidido en research/PITFALLS.md #12):
//   - El operador factura al turista (su parte: subtotal del tour)
//   - La Perla factura al operador su platform fee (8%)
//
// Este modulo se llama desde la Edge Function issue-invoice (server-side only).
// Requiere ALEGRA_API_KEY y ALEGRA_USER en env vars (NUNCA en cliente).
//
// Docs Alegra: https://developer.alegra.com/docs/facturas-de-venta
// Endpoint: POST https://api.alegra.com/api/v1/invoices

const ALEGRA_API_BASE = 'https://api.alegra.com/api/v1';
const ALEGRA_USER = process.env.ALEGRA_USER ?? '';
const ALEGRA_API_KEY = process.env.ALEGRA_API_KEY ?? '';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCop: number;
  /** % impuesto (0 si exento). Para servicios turisticos suele ser 19% IVA. */
  taxPct?: number;
}

export interface CreateInvoiceParams {
  bookingId: string;
  /** Quien EMITE la factura: "operator" (Modelo B turista) o "platform" (La Perla al operador) */
  issuerType: 'operator' | 'platform';
  /** NIT/RUT del receptor (sin DV) */
  recipientRut: string;
  recipientName: string;
  recipientEmail: string;
  items: InvoiceLineItem[];
  /** ISO date para fecha de emision; default = hoy */
  issueDate?: string;
}

export interface CreateInvoiceResult {
  ok: true;
  alegraInvoiceId: string;
  invoicePdfUrl: string;
  cufe?: string; // Codigo unico facturacion electronica DIAN
}

export interface CreateInvoiceFailure {
  ok: false;
  error: string;
  retryable: boolean;
}

export type CreateInvoiceResponse = CreateInvoiceResult | CreateInvoiceFailure;

interface AlegraInvoiceResponse {
  id?: number | string;
  status?: string;
  pdfUrl?: string;
  stamp?: { uuid?: string; cufe?: string };
  error?: string;
  message?: string;
}

function getAuthHeader(): string {
  if (!ALEGRA_USER || !ALEGRA_API_KEY) {
    throw new Error('ALEGRA_USER y ALEGRA_API_KEY deben estar configurados');
  }
  const token = btoa(`${ALEGRA_USER}:${ALEGRA_API_KEY}`);
  return `Basic ${token}`;
}

/**
 * Crea una factura en Alegra. Idempotencia delegada al caller (pending_invoices.unique).
 *
 * Esta funcion NO debe correr en el cliente — el ALEGRA_API_KEY es secreto.
 * Pensada para correr en Edge Function issue-invoice o en API route con guard server-side.
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResponse> {
  if (typeof window !== 'undefined') {
    return {
      ok: false,
      error: 'createInvoice no puede llamarse desde el cliente',
      retryable: false,
    };
  }

  const issueDate = params.issueDate ?? new Date().toISOString().slice(0, 10);

  const payload = {
    date: issueDate,
    dueDate: issueDate,
    client: {
      identification: params.recipientRut,
      name: params.recipientName,
      email: params.recipientEmail,
    },
    items: params.items.map((item) => ({
      name: item.description,
      price: item.unitPriceCop,
      quantity: item.quantity,
      tax: item.taxPct && item.taxPct > 0 ? [{ id: 1, percentage: item.taxPct }] : [],
    })),
    stamp: { generateStamp: true }, // CUFE oficial DIAN
    metadata: {
      booking_id: params.bookingId,
      issuer_type: params.issuerType,
      la_perla_invoice_version: '1',
    },
  };

  try {
    const res = await fetch(`${ALEGRA_API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as AlegraInvoiceResponse;

    if (!res.ok) {
      // 5xx = retryable, 4xx = no retryable (data malformada, RUT invalido, etc.)
      return {
        ok: false,
        error: data.error ?? data.message ?? `Alegra HTTP ${res.status}`,
        retryable: res.status >= 500,
      };
    }

    if (!data.id || !data.pdfUrl) {
      return {
        ok: false,
        error: 'Alegra no retorno id o pdfUrl',
        retryable: true,
      };
    }

    return {
      ok: true,
      alegraInvoiceId: String(data.id),
      invoicePdfUrl: data.pdfUrl,
      cufe: data.stamp?.cufe,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error desconocido';
    return {
      ok: false,
      error: message,
      retryable: true,
    };
  }
}

/**
 * Backoff exponencial: 1min, 5min, 30min, 2h, 12h, ...
 */
export function calculateNextAttemptDelay(attempts: number): number {
  const baseSeconds = 60;
  const cap = 12 * 60 * 60; // 12h
  return Math.min(baseSeconds * Math.pow(5, attempts), cap);
}
