import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDict } from '@/i18n/dict';
import { getRepo } from '@/server/context';
import { coverUrls } from '@/server/photos';
import { dname } from '@/core/catalog';
import { MARKET_SECTIONS, type Lang, type MarketSection } from '@/core/types';
import { ListingCard } from '@/components/listing-card';
import { Empty } from '@/components/ui';

const isSection = (s: string): s is MarketSection => s in MARKET_SECTIONS;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> {
  const { locale, section } = await params;
  const t = getDict(locale);
  return isSection(section) ? { title: t[section] + ' · ' + t.nav.marketplace } : {};
}

export default async function Market({ params, searchParams }: { params: Promise<{ locale: string; section: string }>; searchParams: Promise<{ dest?: string; sort?: string; max?: string; q?: string }> }) {
  const [{ locale, section }, sp] = await Promise.all([params, searchParams]);
  if (!isSection(section)) notFound();
  const lang = locale as Lang; const t = getDict(locale);
  const repo = await getRepo();
  const cats = [...MARKET_SECTIONS[section]] as string[];
  const max = sp.max && Number(sp.max) > 0 ? Number(sp.max) : null;
  const [cat, partners, list] = await Promise.all([repo.catalog(), repo.partners(), repo.searchListings({ categories: cats, destinationId: sp.dest || null, maxPrice: max, q: sp.q || null, sort: sp.sort === 'price' || sp.sort === 'price-desc' ? sp.sort : null })]);
  const covers = await coverUrls(repo, 'listing', list.map((l) => l.id));
  const dests = cat.destinations;
  const base = '/' + locale + '/marketplace/' + section;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{t.nav.marketplace}</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label={t.market.sections}>
        {(Object.keys(MARKET_SECTIONS) as MarketSection[]).map((s) => <Link key={s} href={'/' + locale + '/marketplace/' + s} className={'rounded-full px-4 py-1.5 text-sm ' + (s === section ? 'bg-ink text-white' : 'bg-ink/5 hover:bg-ink/10')}>{t[s]}</Link>)}
      </nav>
      <form className="mt-4 flex flex-wrap items-end gap-3 text-sm" action={base}>
        <label className="flex flex-col gap-1"><span className="text-xs text-ink/50">{t.nav.destinations}</span>
          <select name="dest" defaultValue={sp.dest ?? ''} className="h-9 rounded-lg border border-ink/15 bg-white px-2"><option value="">{t.all}</option>{dests.map((d) => <option key={d.id} value={d.id}>{dname(d, lang)}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="text-xs text-ink/50">{t.search}</span><input name="q" maxLength={60} defaultValue={sp.q ?? ''} className="h-9 w-44 rounded-lg border border-ink/15 bg-white px-2" /></label>
        <label className="flex flex-col gap-1"><span className="text-xs text-ink/50">{t.market.maxUsd}</span><input name="max" type="number" min={1} defaultValue={sp.max ?? ''} className="h-9 w-28 rounded-lg border border-ink/15 bg-white px-2" /></label>
        <label className="flex flex-col gap-1"><span className="text-xs text-ink/50">{t.market.sort}</span>
          <select name="sort" defaultValue={sp.sort ?? ''} className="h-9 rounded-lg border border-ink/15 bg-white px-2"><option value="">{t.market.sortDefault}</option><option value="price">{t.market.sortAsc}</option><option value="price-desc">{t.market.sortDesc}</option></select></label>
        <button className="h-9 rounded-full bg-ink px-4 text-snow">{t.market.apply}</button>
      </form>
      <div className="mt-2 text-xs text-ink/50">{list.length} {t.results}</div>
      {list.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((l) => <ListingCard key={l.id} l={l} partner={partners.find((p) => p.id === l.partnerId)} locale={locale} t={t} place={dname(cat.dest(l.destinationId), lang)} cover={covers[l.id]} />)}</div>
      ) : <div className="mt-6"><Empty>{sp.q || sp.max || sp.dest ? t.market.none : t.noListings}</Empty></div>}
    </div>
  );
}
