import type { MetadataRoute } from 'next';
import { catalog } from '@/lib/catalog';
import { runtime } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await catalog();
  const origin = runtime('SITE_ORIGIN');
  if (!origin || data.settings.demo_mode || !data.available) return [];
  return [ { url: origin, priority: 1 }, { url: origin + '/shop', priority: 0.9 },
    ...data.categories.filter(c => c.kind === 'pet').map(c => ({ url: origin + '/' + c.slug, priority: 0.8 })),
    ...data.products.filter(p => !p.demo).map(p => ({ url: origin + '/products/' + p.slug, lastModified: new Date(p.updated_at), priority: 0.7 })),
    ...data.pages.map(p => ({ url: origin + (p.type === 'article' ? '/pet-care/' : '/') + p.slug, lastModified: new Date(p.updated_at), priority: 0.5 })),
  ];
}
