'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LISTING_CATEGORIES, PRICE_UNITS, type Listing } from '@/core/types';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Input, Select, Spinner, Textarea } from '@/components/ui';
import { F } from './business-profile-form';

type Opt = { id: string; name: string };

/** Create or edit a listing. Status is never sent: the server decides draft / pending_review. */
export function ListingEditor({ locale, partners, destinations, listing }: { locale: string; partners: Opt[]; destinations: Opt[]; listing?: Listing & { address?: string | null; availability_note?: string | null } }) {
  const { t } = useI18n(); const L = t.portal.listings;
  const r = useRouter();
  const [f, setF] = useState({
    partner_id: listing?.partnerId ?? partners[0]?.id ?? '', title: listing?.title ?? '', category: listing?.category ?? LISTING_CATEGORIES[0], destination_id: listing?.destinationId ?? destinations[0]?.id ?? '',
    price_usd: listing ? String(listing.priceUsd) : '', price_unit: listing?.unit ?? PRICE_UNITS[0], description: listing?.description ?? '', tags: listing?.tags.join(', ') ?? '',
    lat: listing?.lat != null ? String(listing.lat) : '', lon: listing?.lon != null ? String(listing.lon) : '', address: listing?.address ?? '', availability_note: listing?.availability_note ?? '',
  });
  const [busy, setBusy] = useState<null | 'draft' | 'submit' | 'delete'>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [bad, setBad] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const body = () => ({
    title: f.title, category: f.category, destination_id: f.destination_id, price_usd: Number(f.price_usd), price_unit: f.price_unit, description: f.description,
    tags: f.tags.split(',').map((x) => x.trim()).filter(Boolean), ...(f.address ? { address: f.address } : {}), ...(f.availability_note ? { availability_note: f.availability_note } : {}),
    ...(f.lat && f.lon ? { lat: Number(f.lat), lon: Number(f.lon) } : {}),
  });
  async function save(mode: 'draft' | 'submit') {
    setBusy(mode); setMsg(null); setBad({});
    const res = listing ? await api<{ listing: Listing }>('/api/partner/listings/' + listing.id, body(), 'PATCH') : await api<{ listing: Listing }>('/api/partner/listings', { ...body(), partner_id: f.partner_id, save_as_draft: mode === 'draft' });
    setBusy(null);
    if (!res.ok) {
      const issues = (res.data.details as { path: (string | number)[] }[] | undefined) ?? [];
      setBad(Object.fromEntries(issues.map((i) => [String(i.path[0]), t.errors.check_form])));
      setMsg({ tone: 'error', text: errorText(t, res.data) }); return;
    }
    if (!listing) { r.push('/' + locale + '/partner/listings/' + res.data.listing.id + '?created=' + mode); return; }
    setMsg({ tone: 'ok', text: res.data.listing.status === 'pending_review' ? L.submitted : L.saved }); r.refresh();
  }
  async function submitDraft() {
    if (!listing) return; setBusy('submit');
    const res = await api('/api/partner/listings/' + listing.id + '/submit', {});
    setBusy(null); setMsg(res.ok ? { tone: 'ok', text: L.submitted } : { tone: 'error', text: errorText(t, res.data) }); if (res.ok) r.refresh();
  }
  async function del() {
    if (!listing || !confirm(L.confirmDelete)) return; setBusy('delete');
    const res = await api('/api/partner/listings/' + listing.id, undefined, 'DELETE');
    setBusy(null); if (res.ok) r.push('/' + locale + '/partner/listings'); else setMsg({ tone: 'error', text: errorText(t, res.data) });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(listing && listing.status === 'draft' ? 'draft' : 'submit'); }} className="space-y-4" noValidate>
      <div className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        {!listing && partners.length > 1 && <F id="le-p" label={t.portal.business}><Select id="le-p" value={f.partner_id} onChange={set('partner_id')}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></F>}
        <div className="md:col-span-2"><F id="le-t" label={L.fTitle} err={bad.title}><Input id="le-t" required minLength={3} maxLength={120} value={f.title} onChange={set('title')} /></F></div>
        <F id="le-c" label={L.fCategory}><Select id="le-c" value={f.category} onChange={set('category')}>{LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}</Select></F>
        <F id="le-d" label={L.fDestination} err={bad.destination_id}><Select id="le-d" value={f.destination_id} onChange={set('destination_id')}>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></F>
        <F id="le-pr" label={L.fPrice} err={bad.price_usd}><Input id="le-pr" type="number" inputMode="decimal" min={1} step="0.01" required value={f.price_usd} onChange={set('price_usd')} /></F>
        <F id="le-u" label={L.fUnit}><Select id="le-u" value={f.price_unit} onChange={set('price_unit')}>{PRICE_UNITS.map((u) => <option key={u} value={u}>{t.units[u]}</option>)}</Select></F>
        <div className="md:col-span-2"><F id="le-ds" label={L.fDescription} err={bad.description}><Textarea id="le-ds" rows={6} minLength={20} maxLength={4000} required value={f.description} onChange={set('description')} /></F></div>
        <F id="le-tg" label={L.fTags} err={bad.tags}><Input id="le-tg" value={f.tags} onChange={set('tags')} placeholder={L.fTagsPh} /></F>
        <F id="le-av" label={L.fAvailability}><Input id="le-av" maxLength={300} value={f.availability_note} onChange={set('availability_note')} placeholder={L.fAvailabilityPh} /></F>
        <div className="md:col-span-2"><F id="le-ad" label={L.fAddress}><Input id="le-ad" maxLength={200} value={f.address} onChange={set('address')} /></F></div>
        <F id="le-la" label={L.fLat} err={bad.lat}><Input id="le-la" type="number" step="any" min={39} max={43.5} value={f.lat} onChange={set('lat')} /></F>
        <F id="le-lo" label={L.fLon} err={bad.lon}><Input id="le-lo" type="number" step="any" min={69} max={80.5} value={f.lon} onChange={set('lon')} /></F>
      </div>
      {listing?.status === 'approved' && <Alert tone="info">{L.reviewNote}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        {!listing && <Button type="button" variant="outline" disabled={!!busy} onClick={() => save('draft')}>{busy === 'draft' && <Spinner />}{L.saveDraft}</Button>}
        {!listing && <Button type="button" disabled={!!busy} onClick={() => save('submit')}>{busy === 'submit' && <Spinner />}{L.submit}</Button>}
        {listing && <Button disabled={!!busy}>{busy === 'submit' || busy === 'draft' ? <Spinner /> : null}{L.saveChanges}</Button>}
        {listing && ['draft', 'rejected'].includes(listing.status) && <Button type="button" variant="outline" disabled={!!busy} onClick={submitDraft}>{L.submitDraft}</Button>}
        {listing && listing.status !== 'approved' && <Button type="button" variant="danger" disabled={!!busy} onClick={del}>{busy === 'delete' && <Spinner />}{L.delete}</Button>}
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </form>
  );
}
