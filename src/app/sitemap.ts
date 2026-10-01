import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { LANGS, MARKET_SECTIONS } from '@/core/types';
import { DESTINATIONS } from '@/core/seed';
import { getRepo } from '@/server/context';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let dests = DESTINATIONS.map((d) => d.id);
  let listings: string[] = [];
  try {
    const cat = await (await getRepo()).catalog();
    dests = cat.destinations.map((d) => d.id);
    listings = cat.approved().map((l) => l.id);
  } catch { /* fall back to seed destinations */ }
  const paths = ['', '/plan', '/destinations', '/map', '/partner', ...Object.keys(MARKET_SECTIONS).map((s) => '/marketplace/' + s), ...dests.map((d) => '/destinations/' + d), ...listings.map((l) => '/listings/' + l)];
  return paths.flatMap((p) => LANGS.map((l) => ({
    url: env.siteUrl + '/' + l + p,
    alternates: { languages: Object.fromEntries(LANGS.map((x) => [x, env.siteUrl + '/' + x + p])) },
  })));
}
