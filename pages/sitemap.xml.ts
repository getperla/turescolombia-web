import type { GetServerSideProps } from 'next';
import { getTours } from '../lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://tourmarta-web.vercel.app';

const STATIC_PAGES = ['', '/explorar', '/login', '/register', '/jaladores'];

function buildSitemap(tourSlugs: string[]): string {
  const urls = [
    ...STATIC_PAGES.map((p) => `${SITE}${p}`),
    ...tourSlugs.map((slug) => `${SITE}/tour/${slug}`),
  ];
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  let slugs: string[] = [];
  try {
    const { data } = await getTours();
    slugs = data.map((t) => t.slug).filter(Boolean);
  } catch {
    // Si la API falla, servimos sitemap con paginas estaticas solamente
  }
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.write(buildSitemap(slugs));
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
