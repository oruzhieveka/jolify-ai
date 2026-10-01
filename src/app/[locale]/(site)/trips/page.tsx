import Link from 'next/link';
import type { Metadata } from 'next';
import { fmt, getDict } from '@/i18n/dict';
import { getCtx } from '@/server/context';
import { travelerOverview } from '@/server/handlers';
import type { ConversationRow, TripRow } from '@/server/repo';
import { usd } from '@/core/pricing';
import { Card, Empty, buttonClass } from '@/components/ui';
import { BookingThread, type BookingView } from '@/components/booking-thread';
import { SignInPrompt } from '@/components/require-user';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; return { title: getDict(locale).nav.trips, robots: { index: false } }; }
export const dynamic = 'force-dynamic';

export default async function Trips({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await getCtx();
  if (!c.user) return <SignInPrompt locale={locale} next={'/' + locale + '/trips'} text={t.trips.signIn} />;
  const [data, conversations] = await Promise.all([
    travelerOverview(c).then((r) => r.body as { trips: TripRow[]; bookings: BookingView[] }),
    c.repo.listConversations(c.user.id).catch((): ConversationRow[] => []),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{t.nav.trips}</h1>
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">{t.trips.title}</h2><Link href={'/' + locale + '/plan'} className={buttonClass('outline', 'sm')}>{t.nav.plan}</Link></div>
        {data.trips.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.trips.map((tr) => (
              <Link key={tr.id} href={'/' + locale + '/plan?trip=' + tr.id} data-testid="saved-trip">
                <Card className="p-4 transition hover:shadow-lg">
                  <div className="font-semibold">{tr.title}</div>
                  <div className="text-sm text-ink/60">{fmt(t.trips.days, { n: tr.itinerary.days.length })} · {usd(tr.itinerary.estimated_budget.amount)} · {fmt(t.trips.updated, { date: tr.updated_at.slice(0, 10) })}</div>
                </Card>
              </Link>
            ))}
          </div>
        ) : <Empty>{t.empty.trips}</Empty>}
      </section>
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">{t.trips.conversations}</h2><Link href={'/' + locale + '/assistant'} className={buttonClass('outline', 'sm')}>{t.nav.assistant}</Link></div>
        {conversations.length ? (
          <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
            {conversations.map((cv) => (
              <li key={cv.id}><Link href={'/' + locale + '/assistant?c=' + cv.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-ink/[0.03]">
                <span className="truncate font-medium">{cv.title}</span>
                <span className="shrink-0 text-xs text-ink/50">{fmt(t.trips.updated, { date: cv.updated_at.slice(0, 10) })}</span>
              </Link></li>
            ))}
          </ul>
        ) : <Empty>{t.trips.noConversations}</Empty>}
      </section>
      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">{t.trips.requests}</h2>
        {data.bookings.length ? <div className="space-y-3">{data.bookings.map((b) => <BookingThread key={b.id} b={b} role="traveler" me={c.user!.id} />)}</div> : <Empty>{t.empty.bookings}</Empty>}
      </section>
    </div>
  );
}
