type ShareData = {
  title: string;
  text: string;
  url: string;
};

/**
 * Intenta usar Web Share API nativo del OS (menu con WhatsApp, Instagram,
 * Stories, Telegram, Messenger, etc.). Si no esta disponible, abre WhatsApp
 * directo como fallback.
 *
 * Retorna true si el share se intento (incluso si el usuario cancelo).
 */
export async function shareLink(data: ShareData): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err: any) {
      // Cancelado por el usuario — no es error
      if (err?.name === 'AbortError') return true;
      // Cualquier otro error → fallback a WhatsApp
      console.warn('Web Share fallo, abriendo WhatsApp:', err);
    }
  }

  const waText = `${data.text}\n\n${data.url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  return true;
}

/**
 * Copia texto al clipboard. Retorna true si exitoso.
 * Usa navigator.clipboard con fallback a textarea + execCommand para
 * navegadores viejos o contextos no-secure.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard fallo, usando fallback:', err);
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error('Copy fallback fallo:', err);
    return false;
  }
}
