import Link from 'next/link';
import type { Metadata } from 'next';
import { getDict, fact } from '@/i18n/dict';
import { localizeDestination } from '@/core/localize';
import { coverUrls } from '@/server/photos';
import { getRepo } from '@/server/context';
import type { Lang } from '@/core/types';
import { Card } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const t = getDict(locale);
  return { title: t.destMetaTitle, alternates: { canonical: '/' + locale + '/destinations' } };
}

export default async function Destinations({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ region?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const lang = locale as Lang; const t = getDict(locale);
  const repo = await getRepo();
  const cat = await repo.catalog();
  const regions = [...new Set(cat.destinations.map((d) => d.region))].sort();
  const list = cat.destinations.filter((d) => !sp.region || d.region === sp.region).sort((a, b) => b.popularity - a.popularity);
  const covers = await coverUrls(repo, 'destination', list.map((d) => d.id));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{t.nav.destinations}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={'/' + locale + '/destinations'} className={'rounded-full px-3 py-1 text-sm ' + (!sp.region ? 'bg-ink text-white' : 'bg-ink/5')}>{t.all}</Link>
        {regions.map((r) => <Link key={r} href={'/' + locale + '/destinations?region=' + encodeURIComponent(r)} className={'rounded-full px-3 py-1 text-sm ' + (sp.region === r ? 'bg-ink text-white' : 'bg-ink/5')}>{fact(t, 'regions', r)}</Link>)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => {
          const n = cat.approved().filter((l) => l.destinationId === d.id).length;
          const loc = localizeDestination(d, lang);
          return (
            <Link key={d.id} href={'/' + locale + '/destinations/' + d.id} className="group">
              <Card className="h-full overflow-hidden transition group-hover:shadow-lg">
                {covers[d.id] && <img src={covers[d.id]} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-5">
                  <div className="flex justify-between text-xs text-ink/50"><span>{fact(t, 'regions', d.region)}</span><span>{fact(t, 'seasons', d.season)}</span></div>
                  <h2 className="mt-1 text-lg font-semibold">{loc.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-ink/70" lang={loc.fallback.includes('description') ? 'en' : undefined}>{loc.description}</p>
                  <div className="mt-3 text-xs text-ink/50">{fact(t, 'durations', d.duration)}{d.difficulty ? ' · ' + fact(t, 'difficulty', d.difficulty) : ''} · {n} {t.results}</div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
