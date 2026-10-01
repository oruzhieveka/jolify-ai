import type { Metadata } from 'next';
import { getDict } from '@/i18n/dict';
import { getCtx } from '@/server/context';
import { PlannerClient } from '@/components/planner-client';
import type { Itinerary } from '@/core/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).nav.plan, alternates: { canonical: '/' + locale + '/plan' } };
}

export default async function PlanPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; trip?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale);
  const c = await getCtx();
  let initial: { itinerary: Itinerary; tripId: string } | null = null;
  if (sp.trip && c.user) {
    const row = await c.repo.getTrip(c.user.id, sp.trip);
    if (row) initial = { itinerary: row.itinerary, tripId: row.id };
  }
  return (
    <PlannerClient
      locale={locale} t={t} signedIn={!!c.user} aiConfigured={!!c.ai.anthropic}
      initialQuery={initial ? '' : (sp.q ?? '').slice(0, 2000)} initial={initial}
    />
  );
}
