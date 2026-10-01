'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Destination } from '@/core/types';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Input, Label, Spinner, Textarea } from '@/components/ui';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const DETAIL = ['howToGetThere', 'history', 'culture', 'safety'] as const;
// i18n-ignore: language tabs are shown as codes in every language
const TABS = [['ru', 'RU'], ['ky', 'KG']] as const;

/** Side-by-side editor: English source (read-only) next to the curated RU / KY text. */
export function ContentEditor({ d }: { d: Destination }) {
  const { t } = useI18n(); const C = t.admin.content;
  const r = useRouter();
  const [lang, setLang] = useState<'ru' | 'ky'>('ru');
  const init = (l: 'ru' | 'ky') => ({ name: d.name[l] ?? '', description: d.description[l] ?? '', activities: (d.i18n?.[l]?.activities ?? []).join('\n'), tips: (d.i18n?.[l]?.tips ?? []).join('\n'), ...Object.fromEntries(DETAIL.map((k) => [k, d.i18n?.[l]?.details?.[k] ?? ''])) as Record<(typeof DETAIL)[number], string> });
  const [v, setV] = useState({ ru: init('ru'), ky: init('ky') });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const cur = v[lang]; const set = (k: keyof typeof cur) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [lang]: { ...cur, [k]: e.target.value } });
  async function save() {
    setBusy(true); setMsg(null);
    const block = (l: 'ru' | 'ky') => ({ activities: lines(v[l].activities), tips: lines(v[l].tips), details: Object.fromEntries(DETAIL.filter((k) => v[l][k].trim()).map((k) => [k, v[l][k].trim()])) });
    const res = await api('/api/admin/destinations/' + d.id, {
      name: { en: d.name.en, ru: v.ru.name, ky: v.ky.name }, description: { en: d.description.en, ru: v.ru.description, ky: v.ky.description }, i18n: { ru: block('ru'), ky: block('ky') },
    }, 'PATCH');
    setBusy(false); setMsg(res.ok ? { tone: 'ok', text: C.saved } : { tone: 'error', text: errorText(t, res.data) }); if (res.ok) r.refresh();
  }
  const Row = (k: keyof typeof cur, label: string, en: string, multi = true) => (
    <div className="grid gap-3 lg:grid-cols-2">
      <div><Label className="!text-snow/50">{label} · {C.english}</Label><p className="whitespace-pre-line rounded-xl bg-white/5 p-3 text-sm text-snow/70">{en || '·'}</p></div>
      <div><Label htmlFor={'ce-' + k} className="!text-snow/80">{label} · {lang === 'ru' ? 'RU' : 'KG'}</Label>{multi ? <Textarea id={'ce-' + k} rows={4} value={cur[k]} onChange={set(k)} /> : <Input id={'ce-' + k} value={cur[k]} onChange={set(k)} />}</div>
    </div>
  );
  return (
    <div className="space-y-5 rounded-2xl border border-white/5 bg-night-800 p-5">
      <div className="flex gap-2" role="tablist">{TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={lang === k} onClick={() => setLang(k)} className={'rounded-full px-4 py-1.5 text-sm ' + (lang === k ? 'bg-apricot-500 text-ink' : 'bg-white/5')}>{label}</button>)}</div>
      {Row('name', C.nameField, d.name.en, false)}
      {Row('description', C.descriptionField, d.description.en)}
      {Row('activities', C.activities, d.activities.join('\n'))}
      {Row('tips', C.tips, d.tips.join('\n'))}
      {DETAIL.filter((k) => d.details?.[k]).map((k) => <div key={k}>{Row(k, C[k], d.details?.[k] ?? '')}</div>)}
      <div className="flex items-center gap-3"><Button onClick={save} disabled={busy}>{busy && <Spinner />}{C.save}</Button>{msg && <Alert tone={msg.tone} className="flex-1 py-2">{msg.text}</Alert>}</div>
    </div>
  );
}
