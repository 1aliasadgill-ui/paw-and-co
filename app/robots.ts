import type { MetadataRoute } from 'next';
import { catalog } from '@/lib/catalog';
import { runtime } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const data = await catalog();
  const origin = runtime('SITE_ORIGIN');
  return { rules: { userAgent: '*', ...(data.settings.demo_mode ? { disallow: '/' } : { allow: '/', disallow: ['/admin', '/account', '/api', '/checkout', '/cart', '/wishlist', '/search'] }) }, ...(origin ? { sitemap: origin + '/sitemap.xml' } : {}) };
}
