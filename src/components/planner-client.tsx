'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dict } from '@/i18n/dict';
import type { Itinerary, ItineraryItem } from '@/core/types';
import { usd } from '@/core/pricing';
import { api } from '@/lib/client';
import { errorText } from '@/i18n/dict';
import { MapView, type MapPoint } from './map-view';
import { Alert, Badge, Button, Card, Spinner, Textarea, buttonClass } from './ui';

type Msg = { role: 'user' | 'ai'; text: string; tone?: 'error' };
interface Outcome { ok: boolean; itinerary: Itinerary | null; reply: string; provider: 'anthropic' | 'openai_compatible' | 'rules'; fallbackReason?: string; changed?: number[]; applied?: boolean; error?: string }

export function PlannerClient({ locale, t, signedIn, aiConfigured, initialQuery, initial }: {
  locale: string; t: Dict; signedIn: boolean; aiConfigured: boolean; initialQuery: string; initial: { itinerary: Itinerary; tripId: string } | null;
}) {
  const [it, setIt] = useState<Itinerary | null>(initial?.itinerary ?? null);
  const [tripId, setTripId] = useState<string | null>(initial?.tripId ?? null);
  const [provider, setProvider] = useState<'anthropic' | 'openai_compatible' | 'rules' | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState(initial ? '' : initialQuery);
  const [changed, setChanged] = useState<number[]>([]);
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>(initial ? 'saved' : 'idle');
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const started = useRef(false);
  const L = (p: string) => '/' + locale + p;

  async function plan(text: string) {
    setBusy(true); setMsgs((m) => [...m, { role: 'user', text }]);
    const r = await api<Outcome>('/api/ai/plan', { text, lang: locale });
    setBusy(false);
    if (!r.ok || !r.data.itinerary) { setMsgs((m) => [...m, { role: 'ai', text: r.data.reply || errorText(t, r.data), tone: 'error' }]); return; }
    setIt(r.data.itinerary); setProvider(r.data.provider); setTripId(null); setSave('idle'); setChanged([]);
    setMsgs((m) => [...m, { role: 'ai', text: r.data.reply }]);
    setInput('');
  }
  async function modify(text: string) {
    if (!it) return;
    setBusy(true); setMsgs((m) => [...m, { role: 'user', text }]);
    const r = await api<Outcome>('/api/ai/modify', { itinerary: it, instruction: text, lang: locale, trip_id: tripId ?? undefined });
    setBusy(false); setInput('');
    if (!r.ok) { setMsgs((m) => [...m, { role: 'ai', text: r.data.reply || errorText(t, r.data), tone: 'error' }]); return; }
    if (r.data.applied && r.data.itinerary) { setIt(r.data.itinerary); setChanged(r.data.changed ?? []); if (save === 'saved' && !tripId) setSave('idle'); }
    setProvider(r.data.provider);
    setMsgs((m) => [...m, { role: 'ai', text: r.data.reply }]);
  }
  async function saveTrip() {
    if (!it) return;
    setSave('saving'); setSaveErr(null);
    const r = await api<{ trip: { id: string } }>('/api/trips', { itinerary: it, trip_id: tripId ?? undefined });
    if (r.ok) { setTripId(r.data.trip.id); setSave('saved'); } else { setSave('error'); setSaveErr(errorText(t, r.data)); }
  }

  useEffect(() => {
    if (!started.current && initialQuery && !initial) { started.current = true; plan(initialQuery); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const points: MapPoint[] = useMemo(() => {
    if (!it) return [];
    const seen = new Map<string, MapPoint>();
    for (const d of it.days) {
      const k = d.location;
      if (!seen.has(k)) seen.set(k, { id: 'day-' + d.day, lat: d.coordinates[0], lon: d.coordinates[1], title: t.day + ' ' + d.day + ': ' + d.title, kind: 'day', order: d.day });
      else { const p = seen.get(k)!; p.title += ', ' + d.day; }
    }
    return [...seen.values()];
  }, [it, t.day]);
  const route = useMemo(() => (it ? it.days.map((d) => [d.coordinates[1], d.coordinates[0]] as [number, number]) : []), [it]);

  const send = () => { const x = input.trim(); if (x.length < 2 || busy) return; it ? modify(x) : plan(x); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!it && (
        <div className="mx-auto max-w-2xl py-10 text-center">
          <h1 className="text-3xl font-semibold">{t.nav.plan}</h1>
          <p className="mt-2 text-ink/60">{t.heroSub}</p>
          {!aiConfigured && <Alert tone="warn" className="mt-4 text-left">{t.providerRules}</Alert>}
        </div>
      )}

      <div className={it ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]' : ''}>
        {it && (
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold md:text-3xl" data-testid="trip-title">{it.trip_title}</h1>
                <p className="mt-1 max-w-2xl text-ink/70">{it.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={provider === 'rules' ? 'neutral' : 'info'}>{provider === 'rules' ? t.providerRules : t.providerAi}</Badge>
                  <Badge tone="ok">{t.validatedNote}</Badge>
                </div>
              </div>
              <Card className="p-4 text-right">
                <div className="text-xs uppercase tracking-wide text-ink/50">{t.total}</div>
                <div className="text-2xl font-semibold" data-testid="trip-total">{usd(it.estimated_budget.amount)}</div>
                <div className="text-xs text-ink/50">{it.travelers} × {it.days.length} {t.day.toLowerCase()}{it.budget_target ? ' \u00b7 target ' + usd(it.budget_target) : ''}</div>
                <div className="mt-3">
                  {signedIn ? (
                    <Button size="sm" onClick={saveTrip} disabled={save === 'saving' || save === 'saved'} data-testid="save-trip">
                      {save === 'saving' ? <Spinner /> : null}{save === 'saved' ? t.saved : t.save}
                    </Button>
                  ) : (
                    <Link className={buttonClass('outline', 'sm')} href={L('/login?next=' + encodeURIComponent(L('/plan')))}>{t.signInToSave}</Link>
                  )}
                  {saveErr && <div className="mt-1 text-xs text-red-700">{saveErr}</div>}
                </div>
              </Card>
            </div>

            <ol className="space-y-4">
              {it.days.map((d) => (
                <li key={d.day} id={'day-' + d.day}>
                  <Card className={'p-5 transition ' + (changed.includes(d.day) ? 'ring-2 ring-apricot-500' : '') + (day === d.day ? ' ring-2 ring-glacier-500' : '')}>
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" className="text-left" onClick={() => setDay(d.day)}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-apricot-600">{t.day} {d.day}</div>
                        <h2 className="text-lg font-semibold">{d.title}</h2>
                      </button>
                      <div className="text-right text-sm"><div className="text-ink/50">{t.perDay}</div><div className="font-semibold">{usd(d.estimated_cost)}</div></div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Section title={t.activities} items={d.activities} locale={locale} free={t.free} />
                      <Section title={t.food} items={d.restaurants} locale={locale} free={t.free} />
                      <Section title={t.staying} items={d.accommodation ? [d.accommodation] : []} locale={locale} free={t.free} />
                      <Section title={t.moving} items={d.transportation} locale={locale} free={t.free} />
                    </div>
                    {d.notes.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink/60">{d.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                    <div className="mt-3 text-xs"><Link className="text-glacier-700 hover:underline" href={L('/destinations/' + d.location)}>{t.explore} →</Link></div>
                  </Card>
                </li>
              ))}
            </ol>
            {it.practical_info.length > 0 && (
              <Card className="mt-4 p-5"><h2 className="font-semibold">{t.safety}</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">{it.practical_info.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>
            )}
          </div>
        )}

        <aside className={it ? 'space-y-4 lg:sticky lg:top-20 lg:self-start' : 'mx-auto max-w-2xl'}>
          {it && (
            <MapView points={points} route={route} numbered className="h-[320px]"
              selectedId={day ? points.find((p) => p.title.includes(t.day + ' ' + day))?.id ?? null : null}
              onSelect={(id) => { const n = Number(id.replace('day-', '')); setDay(n); document.getElementById('day-' + n)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              labels={{ loading: t.mapLoading, error: t.mapError, locate: t.locateMe, map: t.mapLabel, geoDenied: t.geoDenied, geoFailed: t.geoFailed, geoUnsupported: t.geoUnsupported }} />
          )}
          <Card className="flex max-h-[60vh] flex-col p-3">
            <div className="flex-1 space-y-2 overflow-y-auto p-1" aria-live="polite" data-testid="chat-log">
              {msgs.map((m, i) => (
                <div key={i} className={'max-w-[90%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ' + (m.role === 'user' ? 'ml-auto bg-ink text-white' : m.tone === 'error' ? 'bg-red-50 text-red-900' : 'bg-glacier-50 text-ink')}>{m.text}</div>
              ))}
              {busy && <div className="flex items-center gap-2 px-2 text-sm text-ink/50"><Spinner /> {t.planning}</div>}
            </div>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <label htmlFor="planner-input" className="sr-only">{t.message}</label>
              <Textarea id="planner-input" data-testid="planner-input" rows={2} value={input} maxLength={it ? 500 : 2000} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={it ? t.modifyPlaceholder : t.promptPlaceholder} className="resize-none" />
              <Button type="submit" disabled={busy || input.trim().length < 2}>{it ? t.send : t.plan}</Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, items, locale, free }: { title: string; items: ItineraryItem[]; locale: string; free: string }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">{title}</div>
      <ul className="space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            {x.listing_id ? <Link href={'/' + locale + '/listings/' + x.listing_id} className="hover:text-glacier-700 hover:underline">{x.name}</Link> : <span>{x.name}</span>}
            <span className="shrink-0 tabular-nums text-ink/60">{x.cost ? usd(x.cost) : free}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
