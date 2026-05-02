// Adapter de pagos. Envuelve Wompi y en demo simula transacciones.
// El consumer (lib/sales.ts) NUNCA llama a wompi.ts directamente —
// solo a este modulo. Asi un cambio de proveedor (ej: PayU) toca
// un solo archivo.

import {
  generateReference,
  getWompiCheckoutUrl,
  checkPaymentStatus as checkWompiStatus,
} from '../wompi';
import { isDemo } from '../mode';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'ERROR';

export type PaymentLinkParams = {
  amountCop: number;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  redirectUrl: string;
  description?: string;
};

export type PaymentLink = {
  reference: string;
  paymentUrl: string;
  provider: 'wompi' | 'demo';
};

/**
 * Crea un link de pago. En demo apunta al sandbox de Wompi (sin
 * transaccion real). En produccion apunta al checkout real de Wompi.
 *
 * NOTA: aunque ambos modos retornan una URL de Wompi, el sandbox no
 * mueve dinero — es seguro abrirlo.
 */
export function createPaymentLink(params: PaymentLinkParams): PaymentLink {
  const url = getWompiCheckoutUrl({
    amountInCents: params.amountCop * 100,
    reference: params.reference,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    redirectUrl: params.redirectUrl,
    description: params.description,
  });

  return {
    reference: params.reference,
    paymentUrl: url,
    provider: isDemo() ? 'demo' : 'wompi',
  };
}

/**
 * Consulta el estado de un pago. En demo, si recibe un transactionId
 * devuelve APPROVED automaticamente — esto permite testing del flujo
 * completo sin pagar de verdad.
 *
 * En produccion consulta la API publica de Wompi.
 */
export async function checkPayment(transactionId: string): Promise<{
  status: PaymentStatus;
  reference: string;
  paymentMethod?: string;
}> {
  if (isDemo()) {
    return {
      status: 'APPROVED',
      reference: transactionId,
      paymentMethod: 'demo_card',
    };
  }

  try {
    const result = await checkWompiStatus(transactionId);
    const status: PaymentStatus =
      result.status === 'APPROVED'
        ? 'APPROVED'
        : result.status === 'DECLINED'
          ? 'DECLINED'
          : result.status === 'PENDING'
            ? 'PENDING'
            : result.status === 'VOIDED'
              ? 'CANCELLED'
              : 'ERROR';
    return {
      status,
      reference: result.reference,
      paymentMethod: result.paymentMethod,
    };
  } catch {
    return { status: 'ERROR', reference: transactionId };
  }
}

export { generateReference };
