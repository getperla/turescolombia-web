import Image from 'next/image';
import type { Tour } from '../lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  tour: Tour;
  url: string;
};

/**
 * Modal que muestra como se vera la tarjeta del link cuando el cliente lo
 * abra en WhatsApp/Telegram/etc. Replica el render de OG meta tags que hacen
 * los messengers al pegar un link.
 */
export default function LinkPreviewModal({ visible, onClose, tour, url }: Props) {
  if (!visible) return null;

  const domain = (() => {
    try {
      return new URL(url).host;
    } catch {
      return 'tourmarta-web.vercel.app';
    }
  })();

  const description = tour.shortDescription || tour.description?.slice(0, 120) || '';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-preview-title"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b" style={{ borderColor: '#EBEBEB' }}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h3 id="link-preview-title" className="font-bold text-base" style={{ color: '#222' }}>
                Vista previa del link
              </h3>
              <p className="text-xs mt-1" style={{ color: '#717171' }}>
                Asi se vera la tarjeta cuando alguien pegue tu link en WhatsApp, Telegram o Messenger.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none -mt-1 -mr-1 px-2"
              style={{ color: '#717171' }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5" style={{ background: '#ECE5DD' }}>
          {/* Mock de mensaje de WhatsApp con preview */}
          <div className="rounded-xl overflow-hidden shadow-md max-w-[85%]" style={{ background: 'white' }}>
            {tour.coverImageUrl && (
              <div className="relative aspect-[1.91/1]">
                <Image
                  src={tour.coverImageUrl}
                  alt={tour.name}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="px-3 py-2.5">
              <div className="font-semibold text-sm line-clamp-2" style={{ color: '#222' }}>
                {tour.name}
              </div>
              {description && (
                <div className="text-xs mt-1 line-clamp-2" style={{ color: '#5E6A7A' }}>
                  {description}
                </div>
              )}
              <div className="text-[11px] mt-2 uppercase tracking-wide" style={{ color: '#A0A4AB' }}>
                {domain}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t" style={{ borderColor: '#EBEBEB' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: '#F7F7F7', color: '#222' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
