type Size = 'sm' | 'md' | 'lg';

type Props = {
  size?: Size;
  className?: string;
  /** Texto accesible para lectores de pantalla. Default: "Cargando". */
  label?: string;
};

const PX_BY_SIZE: Record<Size, number> = {
  sm: 24,
  md: 48,
  lg: 80,
};

/**
 * Spinner con la perla de la marca: gradiente dorado + brillo + rotacion.
 * Usar en estados de carga del proyecto en vez de spinners genericos.
 *
 * Las animaciones (pearlSpin + pearlPulse) se definen en styles/globals.css.
 */
export default function PearlSpinner({ size = 'md', className = '', label = 'Cargando' }: Props) {
  const px = PX_BY_SIZE[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        aria-hidden="true"
        focusable="false"
        style={{ animation: 'pearlSpin 2s linear infinite, pearlPulse 1.6s ease-in-out infinite' }}
      >
        <defs>
          <radialGradient id="pearl-spinner-fill" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#F5E6C8" />
            <stop offset="50%" stopColor="#C9A05C" />
            <stop offset="100%" stopColor="#8B6914" />
          </radialGradient>
          <radialGradient id="pearl-spinner-shine" cx="30%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#pearl-spinner-fill)" />
        <circle cx="35" cy="35" r="15" fill="url(#pearl-spinner-shine)" />
      </svg>
    </span>
  );
}
