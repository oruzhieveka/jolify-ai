import type { Destination, Listing, ListingCategory, Lang } from './types.ts';
import { km } from './geo.ts';

export const STAY: ListingCategory[] = ['hotel', 'guesthouse', 'yurt'];
export const ACT: ListingCategory[] = ['tour', 'experience'];

/**
 * Read-only view over the source of truth (destinations + listings).
 * The planner, the modifier and the validator only ever see data through this.
 * On the server it is built from Supabase rows; in demo mode from the seed.
 */
export class Catalog {
  readonly destinations: Destination[];
  readonly listings: Listing[];
  private dById: Map<string, Destination>;
  private lById: Map<string, Listing>;

  constructor(destinations: Destination[], listings: Listing[]) {
    this.destinations = destinations;
    this.listings = listings;
    this.dById = new Map(destinations.map((d) => [d.id, d]));
    this.lById = new Map(listings.map((l) => [l.id, l]));
  }

  dest(id: string | null | undefined) { return id ? this.dById.get(id) : undefined; }
  listing(id: string | null | undefined) { return id ? this.lById.get(id) : undefined; }
  approved() { return this.listings.filter((l) => l.status === 'approved'); }
  approvedListing(id: string | null | undefined) {
    const l = this.listing(id);
    return l && l.status === 'approved' ? l : undefined;
  }
  at(destId: string, cats: readonly ListingCategory[]) {
    return this.approved().filter((l) => l.destinationId === destId && cats.includes(l.category));
  }
  nearestWith(destId: string, cats: readonly ListingCategory[]): string | null {
    if (this.at(destId, cats).length) return destId;
    const d = this.dest(destId);
    if (!d) return null;
    const c = this.destinations
      .filter((x) => x.id !== destId && this.at(x.id, cats).length)
      .sort((a, b) => km(d, a) - km(d, b));
    return c[0]?.id ?? null;
  }
  nearby(destId: string, radiusKm = 80): Destination[] {
    const d = this.dest(destId);
    if (!d) return [];
    return this.destinations
      .filter((x) => x.id !== destId && km(d, x) <= radiusKm)
      .sort((a, b) => km(d, a) - km(d, b));
  }
  /** Transport options by tag (private driver / shared / airport transfer). */
  transport(tag: string) {
    return this.approved().filter((l) => (l.category === 'transport' || l.category === 'car') && l.tags.includes(tag));
  }
}

export const ALIASES: Record<string, string[]> = {
  'issyk-kul': ['issyk', 'иссык', 'ысык'],
  'song-kul': ['song kul', 'songkul', 'сон-кул', 'сонкул', 'соң-көл'],
  'ala-archa': ['ala-archa', 'ала арча'],
  'altyn-arashan': ['arashan', 'арашан'],
  'jeti-oguz': ['jeti', 'джети', 'жети'],
  'cholpon-ata': ['cholpon', 'чолпон'],
  'tash-rabat': ['tash rabat', 'таш рабат'],
};

const LB = 'a-zа-яёөүң0-9';
function hasKey(t: string, k: string) {
  const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^' + LB + '])' + e + (k.length <= 3 ? '($|[^' + LB + '])' : '')).test(t);
}

export function mentionsIn(cat: Catalog, text: string): Destination[] {
  return cat.destinations.filter((d) =>
    [d.name.en, d.name.ru ?? '', d.name.ky ?? '', d.id.replace('-', ' '), ...(ALIASES[d.id] ?? [])]
      .filter(Boolean)
      .some((k) => hasKey(text, k.toLowerCase())),
  );
}

export const dname = (d: Destination | undefined, lang: Lang) => (d ? d.name[lang] || d.name.en : '');
