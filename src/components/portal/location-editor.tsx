'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Destination } from '@/core/types';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Input, Label, Select, Spinner, Textarea } from '@/components/ui';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const zones = ['hub', 'north', 'south', 'remote', 'west'] as const;

type Form = {
  id: string;
  nameEn: string; nameRu: string; nameKy: string;
  descriptionEn: string; descriptionRu: string; descriptionKy: string;
  region: string; lat: string; lon: string; season: string; duration: string; difficulty: string;
  budgetPerDayUsd: string; tags: string; activities: string; tips: string; order: string; popularity: string;
  zone: (typeof zones)[number]; dayTitle: string; altitudeM: string; howToGetThere: string; history: string; culture: string; safety: string; nearby: string;
  published: boolean;
};

const fromDestination = (d?: Destination): Form => ({
  id: d?.id ?? '',
  nameEn: d?.name.en ?? '', nameRu: d?.name.ru ?? '', nameKy: d?.name.ky ?? '',
  descriptionEn: d?.description.en ?? '', descriptionRu: d?.description.ru ?? '', descriptionKy: d?.description.ky ?? '',
  region: d?.region ?? '', lat: d ? String(d.lat) : '', lon: d ? String(d.lon) : '',
  season: d?.season ?? '', duration: d?.duration ?? '', difficulty: d?.difficulty ?? '',
  budgetPerDayUsd: d ? String(d.budgetPerDayUsd) : '30', tags: (d?.tags ?? []).join(', '),
  activities: (d?.activities ?? []).join('\n'), tips: (d?.tips ?? []).join('\n'),
  order: d ? String(d.order) : '0', popularity: d ? String(d.popularity) : '0', zone: d?.zone ?? 'north',
  dayTitle: d?.dayTitle ?? '', altitudeM: d?.details?.altitudeM ? String(d.details.altitudeM) : '',
  howToGetThere: d?.details?.howToGetThere ?? '', history: d?.details?.history ?? '', culture: d?.details?.culture ?? '', safety: d?.details?.safety ?? '',
  nearby: (d?.details?.nearby ?? []).join(', '), published: d?.published !== false,
});

/** Full destination editor used by admins to create catalogue records and update data consumed by the planner. */
export function LocationEditor({ d }: { d?: Destination }) {
  const { t } = useI18n(); const F = t.admin.locations.form;
  const router = useRouter(); const pathname = usePathname(); const locale = pathname.split('/')[1] || 'en';
  const [v, setV] = useState<Form>(() => fromDestination(d));
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const setChecked = (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, published: e.target.checked }));

  async function save() {
    setBusy(true); setMsg(null);
    const details = {
      ...(v.altitudeM.trim() ? { altitudeM: Number(v.altitudeM) } : {}),
      ...(v.howToGetThere.trim() ? { howToGetThere: v.howToGetThere.trim() } : {}),
      ...(v.history.trim() ? { history: v.history.trim() } : {}),
      ...(v.culture.trim() ? { culture: v.culture.trim() } : {}),
      ...(v.safety.trim() ? { safety: v.safety.trim() } : {}),
      ...(csv(v.nearby).length ? { nearby: csv(v.nearby) } : {}),
    };
    const body = {
      ...(d ? {} : { id: v.id.trim().toLowerCase() }),
      name: { en: v.nameEn.trim(), ru: v.nameRu.trim(), ky: v.nameKy.trim() },
      description: { en: v.descriptionEn.trim(), ru: v.descriptionRu.trim(), ky: v.descriptionKy.trim() },
      region: v.region.trim(), lat: Number(v.lat), lon: Number(v.lon), season: v.season.trim(), duration: v.duration.trim(),
      difficulty: v.difficulty.trim() || null, budgetPerDayUsd: Number(v.budgetPerDayUsd), tags: csv(v.tags), activities: lines(v.activities), tips: lines(v.tips),
      order: Number(v.order), popularity: Number(v.popularity), zone: v.zone, dayTitle: v.dayTitle.trim(), details, published: v.published,
    };
    const res = await api(d ? '/api/admin/destinations/' + d.id : '/api/admin/destinations', body, d ? 'PATCH' : 'POST');
    setBusy(false);
    if (!res.ok) { setMsg({ tone: 'error', text: errorText(t, res.data) }); return; }
    setMsg({ tone: 'ok', text: d ? F.saved : F.created });
    if (d) router.refresh(); else router.push('/' + locale + '/admin/content/' + encodeURIComponent(v.id.trim().toLowerCase()));
  }

  const Field = ({ k, label, multi = false, type = 'text', disabled = false }: { k: keyof Form; label: string; multi?: boolean; type?: string; disabled?: boolean }) => (
    <div>
      <Label htmlFor={'loc-' + k} className="!text-snow/70">{label}</Label>
      {multi
        ? <Textarea id={'loc-' + k} rows={4} value={String(v[k])} onChange={set(k)} disabled={disabled} />
        : <Input id={'loc-' + k} type={type} value={String(v[k])} onChange={set(k)} disabled={disabled} />}
    </div>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-white/5 bg-night-800 p-4 sm:p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <Section title={F.base}>
        <Field k="id" label={F.id} disabled={!!d} />
        <Field k="region" label={F.region} />
        <Field k="nameEn" label={F.nameEn} />
        <Field k="dayTitle" label={F.dayTitle} />
        <Field k="nameRu" label={F.nameRu} />
        <Field k="nameKy" label={F.nameKy} />
        <div className="md:col-span-2"><Field k="descriptionEn" label={F.descriptionEn} multi /></div>
        <Field k="descriptionRu" label={F.descriptionRu} multi />
        <Field k="descriptionKy" label={F.descriptionKy} multi />
      </Section>

      <Section title={F.planner}>
        <Field k="lat" label={F.lat} type="number" />
        <Field k="lon" label={F.lon} type="number" />
        <Field k="season" label={F.season} />
        <Field k="duration" label={F.duration} />
        <Field k="difficulty" label={F.difficulty} />
        <Field k="budgetPerDayUsd" label={F.budget} type="number" />
        <Field k="order" label={F.order} type="number" />
        <Field k="popularity" label={F.popularity} type="number" />
        <div>
          <Label htmlFor="loc-zone" className="!text-snow/70">{F.zone}</Label>
          <Select id="loc-zone" value={v.zone} onChange={set('zone')}>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</Select>
        </div>
        <Field k="tags" label={F.tags} />
        <Field k="activities" label={F.activities} multi />
        <Field k="tips" label={F.tips} multi />
      </Section>

      <Section title={F.details}>
        <Field k="altitudeM" label={F.altitude} type="number" />
        <Field k="nearby" label={F.nearby} />
        <div className="md:col-span-2"><Field k="howToGetThere" label={F.howToGetThere} multi /></div>
        <Field k="history" label={F.history} multi />
        <Field k="culture" label={F.culture} multi />
        <div className="md:col-span-2"><Field k="safety" label={F.safety} multi /></div>
      </Section>

      <div className="flex min-h-11 flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-night-800 p-4">
        <label className="flex min-h-11 items-center gap-2 text-sm text-snow/80">
          <input type="checkbox" className="h-5 w-5" checked={v.published} onChange={setChecked} /> {F.published}
        </label>
        <Button onClick={save} disabled={busy} className="min-h-11">{busy && <Spinner />}{d ? F.save : F.create}</Button>
        {msg && <Alert tone={msg.tone} className="flex-1 py-2">{msg.text}</Alert>}
      </div>
    </div>
  );
}
