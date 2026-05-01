import { Component, ReactNode, ErrorInfo } from 'react';
import Link from 'next/link';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error boundary global. Si cualquier componente hijo crashea durante render
 * (NO durante event handlers, async, o SSR), atrapa el error y muestra UI
 * amable en vez de pantalla blanca.
 *
 * Limitaciones de React: NO atrapa errores en
 *   - Event handlers (try/catch en el handler)
 *   - Codigo asincrono (try/catch en el await)
 *   - SSR (Next.js maneja eso con _error.tsx)
 *   - Errores en el propio Error Boundary
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En produccion esto se mandaria a Sentry/etc. Por ahora console.
    console.error('ErrorBoundary atrapo un error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-white">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4" role="img" aria-label="Error">😕</div>
          <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#0A1628' }}>
            Algo salio mal
          </h1>
          <p className="font-sans text-sm mb-6" style={{ color: '#717171' }}>
            Tuvimos un problema mostrando esta pagina. Intentalo de nuevo o vuelve al inicio.
          </p>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="text-left mb-6 p-3 rounded-lg text-xs font-mono" style={{ background: '#F7F7F7', color: '#CC3333' }}>
              <summary className="cursor-pointer font-semibold">Detalles tecnicos (solo en dev)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="btn-primary"
            >
              Reintentar
            </button>
            <Link href="/" className="btn-outline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
