'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PARTNER_CATEGORIES, type PartnerProfile } from '@/core/types';
import { WEEK_DAYS } from '@/core/partner-profile';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Badge, Button, Input, Label, Select, Spinner, Textarea } from '@/components/ui';

type Hours = Record<string, { closed: boolean; open: string; close: string } | null>;
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** Declared at module level: an inline component would remount inputs on every keystroke and drop focus. */
export function F({ id, label, children, err }: { id: string; label: string; children: React.ReactNode; err?: string }) {
  return <div><Label htmlFor={id}>{label}</Label>{children}{err && <p className="mt-1 text-xs text-red-700" role="alert">{err}</p>}</div>;
}

export function BusinessProfileForm({ partner, destinations }: { partner: PartnerProfile; destinations: { id: string; name: string }[] }) {
  const { t } = useI18n(); const p = t.portal.profile;
  const r = useRouter();
  const [f, setF] = useState({
    name: partner.name, category: partner.category, description: partner.description, destination_id: partner.destinationId ?? '', city: partner.city, address: partner.address,
    phone: partner.phone, email: partner.email, website: partner.website, ...partner.social,
    services: partner.services.join('\n'), amenities: partner.amenities.join('\n'), price_note: partner.priceNote,
  });
  const [hoursOn, setHoursOn] = useState(!!partner.openingHours);
  const [hours, setHours] = useState<Hours>(partner.openingHours ?? Object.fromEntries(WEEK_DAYS.map((d) => [d, { closed: d === 'sun', open: '09:00', close: '18:00' }])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [bad, setBad] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); setBad({});
    const res = await api('/api/partner/' + partner.id + '/profile', {
      name: f.name, category: f.category, description: f.description, destination_id: f.destination_id || null, city: f.city, address: f.address, phone: f.phone, email: f.email, website: f.website,
      social: { instagram: f.instagram, facebook: f.facebook, telegram: f.telegram, whatsapp: f.whatsapp },
      opening_hours: hoursOn ? hours : null, services: lines(f.services), amenities: lines(f.amenities), price_note: f.price_note,
    }, 'PUT');
    setBusy(false);
    if (res.ok) { setMsg({ tone: 'ok', text: p.saved }); r.refresh(); return; }
    const issues = (res.data.details as { path: (string | number)[]; message: string }[] | undefined) ?? [];
    setBad(Object.fromEntries(issues.map((i) => [i.path.join('.'), (t.errors as Record<string, string>)[i.message] ?? t.errors.check_form])));
    setMsg({ tone: 'error', text: errorText(t, res.data) });
  }
  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <section className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <F id="bp-name" label={p.name} err={bad.name}><Input id="bp-name" required minLength={2} maxLength={120} value={f.name} onChange={set('name')} /></F>
        <F id="bp-cat" label={p.category}><Select id="bp-cat" value={f.category} onChange={set('category')}>{PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{t.partnerCategories[c]}</option>)}</Select></F>
        <div className="md:col-span-2"><F id="bp-desc" label={p.description} err={bad.description}><Textarea id="bp-desc" rows={5} maxLength={4000} value={f.description} onChange={set('description')} /></F></div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2"><Badge tone={partner.verified ? 'ok' : 'neutral'}>{partner.verified ? t.verified : '—'}</Badge><span className="text-xs text-ink/50">{p.verifiedNote}</span></div>
      </section>
      <section className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <F id="bp-dest" label={p.location}><Select id="bp-dest" value={f.destination_id} onChange={set('destination_id')}><option value="">{p.none}</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></F>
        <F id="bp-city" label={p.city} err={bad.city}><Input id="bp-city" required value={f.city} onChange={set('city')} /></F>
        <div className="md:col-span-2"><F id="bp-addr" label={p.address}><Input id="bp-addr" maxLength={200} value={f.address} onChange={set('address')} /></F></div>
        <F id="bp-phone" label={p.phone} err={bad.phone}><Input id="bp-phone" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} /></F>
        <F id="bp-email" label={p.email} err={bad.email}><Input id="bp-email" type="email" value={f.email} onChange={set('email')} /></F>
        <div className="md:col-span-2"><F id="bp-web" label={p.website} err={bad.website}><Input id="bp-web" type="url" inputMode="url" placeholder="https://" value={f.website} onChange={set('website')} /></F></div>
        <fieldset className="grid gap-3 sm:grid-cols-2 md:col-span-2"><legend className="mb-2 text-sm font-medium">{p.social}</legend>
          {(['instagram', 'facebook', 'telegram', 'whatsapp'] as const).map((k) => <F key={k} id={'bp-' + k} label={p[k]} err={bad['social.' + k]}><Input id={'bp-' + k} value={f[k]} onChange={set(k)} /></F>)}
        </fieldset>
      </section>
      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{p.hours}</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!hoursOn} onChange={(e) => setHoursOn(!e.target.checked)} />{p.hoursOff}</label></div>
        {hoursOn && (
          <div className="mt-3 space-y-2">
            {WEEK_DAYS.map((d) => { const h = hours[d] ?? { closed: true, open: '09:00', close: '18:00' }; const up = (x: Partial<typeof h>) => setHours({ ...hours, [d]: { ...h, ...x } }); return (
              <div key={d} className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm sm:grid-cols-[140px_auto_1fr_1fr]">
                <span className="font-medium">{p.days[d]}</span>
                <label className="flex items-center gap-2"><input type="checkbox" checked={h.closed} onChange={(e) => up({ closed: e.target.checked })} />{p.closed}</label>
                {!h.closed && <><label className="flex items-center gap-2"><span className="text-ink/50">{p.open}</span><Input type="time" value={h.open} onChange={(e) => up({ open: e.target.value })} className="w-32" /></label>
                <label className="flex items-center gap-2"><span className="text-ink/50">{p.close}</span><Input type="time" value={h.close} onChange={(e) => up({ close: e.target.value })} className="w-32" /></label></>}
                {bad['opening_hours.' + d] && <p className="col-span-full text-xs text-red-700">{bad['opening_hours.' + d]}</p>}
              </div>); })}
          </div>
        )}
      </section>
      <section className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <F id="bp-svc" label={p.services + ' · ' + p.listHint}><Textarea id="bp-svc" rows={5} value={f.services} onChange={set('services')} /></F>
        <F id="bp-am" label={p.amenities + ' · ' + p.listHint}><Textarea id="bp-am" rows={5} value={f.amenities} onChange={set('amenities')} /></F>
        <div className="md:col-span-2"><F id="bp-pr" label={p.pricing}><Input id="bp-pr" maxLength={300} value={f.price_note} onChange={set('price_note')} /></F><p className="mt-1 text-xs text-ink/50">{p.pricingHint}</p></div>
      </section>
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <Button disabled={busy}>{busy && <Spinner />}{p.save}</Button>
        {msg && <Alert tone={msg.tone} className="flex-1 py-2">{msg.text}</Alert>}
      </div>
    </form>
  );
}
