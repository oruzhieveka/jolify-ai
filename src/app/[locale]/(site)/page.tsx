import Link from 'next/link';
import { getDict, fact } from '@/i18n/dict';
import { localizeDestination } from '@/core/localize';
import { coverUrls } from '@/server/photos';
import { getRepo } from '@/server/context';
import { MARKET_SECTIONS, type Lang } from '@/core/types';
import { PromptBox } from '@/components/prompt-box';
import { Card, buttonClass } from '@/components/ui';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale as Lang;
  const t = getDict(locale);
  const repo = await getRepo();
  const cat = await repo.catalog();
  const top = [...cat.destinations].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const covers = await coverUrls(repo, 'destination', top.map((d) => d.id));
  const counts = Object.fromEntries(Object.entries(MARKET_SECTIONS).map(([k, cats]) => [k, cat.approved().filter((l) => (cats as readonly string[]).includes(l.category)).length]));
  const examples = {
    en: ['5 days from Bishkek, lakes and a yurt night, $800 for two', '10 days, horses and hiking around Karakol, mid-range', 'Weekend from Osh with food and culture'],
    ru: ['5 дней из Бишкека, озёра и ночь в юрте, $800 на двоих', '10 дней, лошади и походы у Каракола', 'Выходные в Оше: еда и культура'],
    ky: ['Бишкектен 5 күн, көлдөр жана боз үй, эки кишиге $800', 'Караколдо 10 күн: ат минүү жана жөө басуу', 'Ошто дем алыш: тамак жана маданият'],
  }[lang];

  return (
    <>
      <section className="hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-16 text-center md:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-ink/70 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-apricot-500" /> {t.heroEyebrow}
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">Jolify AI <span className="block text-ink/50">{t.tagline}</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink/70 md:text-lg">{t.heroSub}</p>
          <div className="mt-8"><PromptBox locale={locale} placeholder={t.promptPlaceholder} cta={t.plan} examples={examples} /></div>
        </div>
        <div className="ridge absolute inset-x-0 bottom-0 h-28" aria-hidden />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold md:text-3xl">{t.featured}</h2>
          <Link href={'/' + locale + '/destinations'} className="text-sm font-medium text-glacier-700">{t.explore} →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((d) => {
            const loc = localizeDestination(d, lang);
            return (
              <Link key={d.id} href={'/' + locale + '/destinations/' + d.id} className="group">
                <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  {covers[d.id] && <img src={covers[d.id]} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-wide text-ink/50">{fact(t, 'regions', d.region)}</div>
                    <h3 className="mt-1 text-lg font-semibold">{loc.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-ink/70" lang={loc.fallback.includes('description') ? 'en' : undefined}>{loc.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">{d.tags.slice(0, 3).map((x) => <span key={x} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">{fact(t, 'tags', x)}</span>)}</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-semibold md:text-3xl">{t.sections}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {(Object.keys(MARKET_SECTIONS) as (keyof typeof MARKET_SECTIONS)[]).map((s) => (
            <Link key={s} href={'/' + locale + '/marketplace/' + s}>
              <Card className="p-4 transition hover:shadow-lg">
                <div className="font-medium">{t[s]}</div>
                <div className="text-xs text-ink/50">{counts[s]} {t.results}</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4">
        <Card className="flex flex-col items-start gap-4 bg-ink p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{t.partner.title}</h2>
            <p className="mt-2 max-w-2xl text-white/70">{t.partner.sub}</p>
          </div>
          <Link href={'/' + locale + '/partner'} className={buttonClass('secondary', 'lg')}>{t.partner.apply}</Link>
        </Card>
      </section>
    </>
  );
}
