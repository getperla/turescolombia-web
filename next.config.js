/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compresion gzip/brotli para responses
  compress: true,
  // Remove X-Powered-By header (pequeño security + bytes menos)
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Hosts conocidos primero (más seguros, prioridad de matching)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      // Wildcard de respaldo: el backend Render legacy puede devolver URLs
      // de operadores con hosts variables (sus propios CDNs, S3 buckets,
      // etc). Sin esto, next/image bloquea la imagen y queda placeholder
      // gris en /explorar, /tour/[id] y dashboards. Cuando las imágenes
      // vivan 100% en Supabase Storage (migración futura), se puede quitar.
      { protocol: 'https', hostname: '**' },
    ],
    // Formatos modernos primero, con fallback a jpg
    formats: ['image/avif', 'image/webp'],
    // Cache de imagenes optimizadas — 60 dias
    minimumCacheTTL: 5184000,
  },
  // Prefetch inteligente en links
  experimental: {
    optimizePackageImports: ['recharts', '@supabase/supabase-js'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
