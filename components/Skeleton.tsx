import { CSSProperties } from 'react';

type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  style?: CSSProperties;
};

const ROUNDED_MAP: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Bloque skeleton para loading states. Usa animate-pulse de Tailwind.
 * Reemplaza los <div className="animate-pulse"> hand-rolled de cada pagina.
 *
 * Ejemplos:
 *   <Skeleton className="h-16" />              // alto fijo, ancho 100%
 *   <Skeleton width={200} height={120} />       // dimensiones explicitas
 *   <Skeleton rounded="full" width={48} height={48} />  // avatar circular
 */
export default function Skeleton({
  className = '',
  width,
  height,
  rounded = 'xl',
  style,
}: SkeletonProps) {
  const radius = ROUNDED_MAP[rounded];
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`animate-pulse bg-[#F0F0F0] ${radius} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
    />
  );
}

/** Skeleton para una card de tour (cover + texto). */
export function SkeletonTourCard() {
  return (
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="aspect-[4/3]" rounded="2xl" />
      <div className="pt-3 space-y-2">
        <Skeleton className="h-4 w-3/4" rounded="md" />
        <Skeleton className="h-3 w-1/2" rounded="md" />
      </div>
    </div>
  );
}

/** Grid de N skeleton cards. */
export function SkeletonTourGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTourCard key={i} />
      ))}
    </div>
  );
}
