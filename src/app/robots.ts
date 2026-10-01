import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/admin', '/*/trips', '/*/partner/dashboard', '/*/login'] }], sitemap: env.siteUrl + '/sitemap.xml' };
}
