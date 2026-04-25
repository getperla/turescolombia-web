import { useEffect } from 'react';

type ToastVariant = 'success' | 'info' | 'error';

type ToastProps = {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  variant?: ToastVariant;
};

const VARIANT_STYLES: Record<ToastVariant, { bg: string; fg: string }> = {
  success: { bg: '#222', fg: 'white' },
  info: { bg: '#0D5C8A', fg: 'white' },
  error: { bg: '#CC3333', fg: 'white' },
};

export default function Toast({
  message,
  visible,
  onHide,
  duration = 2200,
  variant = 'success',
}: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onHide]);

  if (!visible) return null;

  const c = VARIANT_STYLES[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full text-sm font-semibold shadow-xl pointer-events-none"
      style={{ background: c.bg, color: c.fg }}
    >
      {message}
    </div>
  );
}
