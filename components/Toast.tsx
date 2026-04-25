import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

export type ToastOptions = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastType, { bg: string; fg: string }> = {
  success: { bg: '#222', fg: 'white' },
  info: { bg: '#0D5C8A', fg: 'white' },
  error: { bg: '#CC3333', fg: 'white' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback(({ message, type = 'success', duration = 3000 }: ToastOptions) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
      >
        {items.map((t) => {
          const c = VARIANT_STYLES[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="px-5 py-3 rounded-full text-sm font-semibold shadow-xl toast-enter"
              style={{ background: c.bg, color: c.fg }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook para disparar toasts desde cualquier componente.
 * Si se llama sin ToastProvider arriba (SSR inicial o tests), hace
 * fallback silencioso: el toast se ignora pero no crashea.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {
        if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn('useToast(): no ToastProvider en el arbol — toast ignorado');
        }
      },
    };
  }
  return ctx;
}
