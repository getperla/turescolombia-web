// Wompi payment gateway integration for Colombia
// Docs: https://docs.wompi.co
//
// Para activar pagos reales:
// 1. Crea cuenta en https://comercios.wompi.co
// 2. Copia tu llave publica (pub_test_xxx o pub_prod_xxx)
// 3. Ponla en NEXT_PUBLIC_WOMPI_PUBLIC_KEY (en .env.production o Vercel env vars)
// 4. Setea LAPERLA_MODE=production (NEXT_PUBLIC_WOMPI_ENV puede sobreescribir)

import { isProd } from './mode';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';

// Resolucion del entorno Wompi en runtime, no en module-load:
// 1. Si NEXT_PUBLIC_WOMPI_ENV esta seteada explicitamente, manda esa.
// 2. Si no, deriva de LAPERLA_MODE (server-only, no NEXT_PUBLIC_).
// 3. En el cliente LAPERLA_MODE es undefined → siempre 'sandbox'. Eso es
//    seguro porque las decisiones criticas (sandbox vs produccion para la
//    API de transactions) las hace el server.
function getWompiEnv(): 'sandbox' | 'production' {
  const explicit = process.env.NEXT_PUBLIC_WOMPI_ENV;
  if (explicit === 'production' || explicit === 'sandbox') return explicit;
  return isProd() ? 'production' : 'sandbox';
}

// El URL del checkout es identico para ambos entornos — lo que cambia es la
// public-key (pub_test_xxx vs pub_prod_xxx). Se mantiene aqui para semantica.
const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

// Sandbox test keys (Wompi provee estas para pruebas)
const SANDBOX_KEY = 'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7';

export function getWompiPublicKey(): string {
  return WOMPI_PUBLIC_KEY || SANDBOX_KEY;
}

export function isWompiConfigured(): boolean {
  return !!WOMPI_PUBLIC_KEY;
}

export function isDemoPayment(): boolean {
  return !WOMPI_PUBLIC_KEY;
}

export type WompiPaymentParams = {
  amountInCents: number;
  reference: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  redirectUrl: string;
  description?: string;
};

/** Generates the Wompi checkout redirect URL */
export function getWompiCheckoutUrl(params: WompiPaymentParams): string {
  const key = getWompiPublicKey();
  const qs = new URLSearchParams({
    'public-key': key,
    currency: 'COP',
    'amount-in-cents': String(params.amountInCents),
    reference: params.reference,
    'redirect-url': params.redirectUrl,
  });
  return `${WOMPI_CHECKOUT_URL}?${qs.toString()}`;
}

/** Loads the Wompi widget script dynamically */
export function loadWompiWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return; }
    if (document.getElementById('wompi-widget-script')) { resolve(); return; }
    const script = document.createElement('script');
    script.id = 'wompi-widget-script';
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Wompi'));
    document.head.appendChild(script);
  });
}

/**
 * Opens Wompi checkout popup/widget.
 * If Wompi key is not configured, falls back to demo mode.
 */
export async function openWompiCheckout(params: WompiPaymentParams): Promise<'wompi' | 'demo'> {
  if (isDemoPayment()) {
    return 'demo';
  }

  // Redirect to Wompi checkout page
  const url = getWompiCheckoutUrl(params);
  window.location.href = url;
  return 'wompi';
}

/** Generate a unique payment reference */
export function generateReference(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `LP-${ts}-${rand}`.toUpperCase();
}

/**
 * Check payment status via Wompi API (public endpoint, no auth needed)
 * In production, this should be done server-side for security
 */
export async function checkPaymentStatus(transactionId: string): Promise<{
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR';
  paymentMethod: string;
  reference: string;
}> {
  const baseUrl = getWompiEnv() === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';

  const res = await fetch(`${baseUrl}/transactions/${transactionId}`);
  const data = await res.json();

  return {
    status: data.data?.status || 'ERROR',
    paymentMethod: data.data?.payment_method_type || 'unknown',
    reference: data.data?.reference || '',
  };
}
