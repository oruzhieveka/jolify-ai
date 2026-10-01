'use client';
import Link from 'next/link';
import { useState } from 'react';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Input, Label, Spinner, Textarea } from './ui';

export function InquiryForm({ listingId, today }: { listingId: string; today: string }) {
  const { t, lang } = useI18n();
  const [f, setF] = useState({ start_date: '', end_date: '', guests: 2, message: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: k === 'guests' ? Number(e.target.value) : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (f.end_date && f.end_date < f.start_date) { setErr(t.errors.end_before_start); return; }
    setState('busy');
    const r = await api('/api/inquiries', { listing_id: listingId, ...f, end_date: f.end_date || null });
    if (r.ok) setState('done'); else { setState('idle'); setErr(errorText(t, r.data)); }
  }
  if (state === 'done') return (
    <Alert tone="ok" data-testid="inquiry-sent">
      <strong>{t.status.pending}.</strong> {t.inquirySent} <Link className="underline" href={'/' + lang + '/trips'}>{t.nav.trips}</Link>
    </Alert>
  );
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-2">
        <div><Label htmlFor="sd">{t.startDate}</Label><Input id="sd" type="date" required min={today} value={f.start_date} onChange={set('start_date')} /></div>
        <div><Label htmlFor="ed">{t.endDate}</Label><Input id="ed" type="date" min={f.start_date || today} value={f.end_date} onChange={set('end_date')} /></div>
      </div>
      <div><Label htmlFor="gu">{t.guests}</Label><Input id="gu" type="number" min={1} max={50} value={f.guests} onChange={set('guests')} /></div>
      <div><Label htmlFor="msg">{t.message}</Label><Textarea id="msg" rows={3} minLength={5} maxLength={2000} required value={f.message} onChange={set('message')} /></div>
      {err && <Alert tone="error">{err}</Alert>}
      <Button className="w-full" disabled={state === 'busy' || !f.start_date || f.message.trim().length < 5}>{state === 'busy' && <Spinner />}{t.sendInquiry}</Button>
      <p className="text-xs text-ink/50">{t.inquiryNote}</p>
    </form>
  );
}
