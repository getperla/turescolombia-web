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
};

module.exports = nextConfig;
