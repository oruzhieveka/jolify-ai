import Link from 'next/link';
import type { Listing, Partner } from '@/core/types';
import { usd } from '@/core/pricing';
import type { Dict } from '@/i18n/dict';
import { Badge, Card } from './ui';

/** Card for a marketplace listing. Shows the partner's real cover photo when one exists; otherwise a neutral tile (no stock filler). */
export function ListingCard({ l, partner, locale, t, place, cover }: { l: Listing; partner?: Partner; locale: string; t: Dict; place?: string; cover?: string }) {
  return (
    <Link href={'/' + locale + '/listings/' + l.id} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        {cover && /* eslint-disable-next-line @next/next/no-img-element */ <img src={cover} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-2 text-xs text-ink/50"><span>{t.categories[l.category]}</span>{place && <span>· {place}</span>}</div>
          <h3 className="mt-1 font-semibold leading-snug">{l.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink/60">{l.description}</p>
          <div className="mt-auto flex items-end justify-between pt-3">
            <div className="flex flex-wrap gap-1">
              {l.isDemo && <Badge tone="warn">{t.sampleBadge}</Badge>}
              {partner?.verified && <Badge tone="ok">{t.verified}</Badge>}
            </div>
            <div className="text-right"><span className="font-semibold">{usd(l.priceUsd)}</span> <span className="text-xs text-ink/50">{t.units[l.unit]}</span></div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
