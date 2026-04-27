// Wompi payment gateway integration for Colombia
// Docs: https://docs.wompi.co
//
// Plan 2 refactor (2026-04-27): SANDBOX_KEY removido del codigo.
// Ahora la public key SIEMPRE viene de NEXT_PUBLIC_WOMPI_PUBLIC_KEY.
// En dev usar la key de sandbox (pub_stagtest_*) en .env.local.
// En prod usar la key de produccion (pub_prod_*) en Vercel env vars.
//
// Activar pagos reales:
// 1. Crear cuenta en https://comercios.wompi.co
// 2. Pasar KYC empresarial (Wompi tarda 1-3 dias)
// 3. Copiar la llave publica de prod en NEXT_PUBLIC_WOMPI_PUBLIC_KEY
// 4. Cambiar NEXT_PUBLIC_WOMPI_ENV a "production"
// 5. Configurar webhook URL en https://comercios.wompi.co > Eventos:
//    https://<project>.supabase.co/functions/v1/wompi-webhook
// 6. Copiar el "Eventos secret" en SUPABASE_SECRET WOMPI_EVENTS_SECRET via:
//    supabase secrets set WOMPI_EVENTS_SECRET=xxx

type WompiEnvironment = 'sandbox' | 'production';

const WOMPI_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
const WOMPI_ENV: WompiEnvironment =
  process.env.NEXT_PUBLIC_WOMPI_ENV === 'production' ? 'production' : 'sandbox';

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

export function getWompiPublicKey(): string {
  return WOMPI_PUBLIC_KEY;
}

export function isWompiConfigured(): boolean {
  return !!WOMPI_PUBLIC_KEY;
}

export function isDemoPayment(): boolean {
  return !WOMPI_PUBLIC_KEY;
}

export function getWompiEnv(): WompiEnvironment {
  return WOMPI_ENV;
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

export type WompiTransactionStatus = 'APPROVED' | 'DECLINED' | 'PENDING' | 'VOIDED' | 'ERROR';

interface WompiTransactionResponse {
  data?: {
    id?: string;
    status?: WompiTransactionStatus;
    reference?: string;
    payment_method_type?: string;
    am