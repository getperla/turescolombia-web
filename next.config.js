/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compresion gzip/brotli para responses
  compress: true,
  // Remove X-Powered-By header (pequeño security + bytes menos)
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
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
