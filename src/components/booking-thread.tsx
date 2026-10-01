'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { BookingStatus, Role } from '@/core/types';
import { nextStatuses } from '@/core/bookings';
import { usd } from '@/core/pricing';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Badge, Button, Card, Input } from './ui';

export interface BookingView {
  id: string; listing_title: string; status: BookingStatus; start_date: string; end_date: string | null; guests: number; message: string; total_usd: number; created_at: string;
  messages: { id: string; sender_id: string; body: string; created_at: string }[];
  events: { from_status: string | null; to_status: string; created_at: string; note: string | null }[];
}
const TONE: Record<BookingStatus, 'warn' | 'ok' | 'bad' | 'neutral' | 'info'> = { pending: 'warn', confirmed: 'ok', rejected: 'bad', cancelled: 'neutral', completed: 'info' };

export function BookingThread({ b, role, me }: { b: BookingView; role: Role; me: string }) {
  const { t, f, lang } = useI18n();
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const st = (s: string) => t.status[s as BookingStatus] ?? s;

  async function setStatus(s: BookingStatus) {
    if ((s === 'cancelled' || s === 'rejected') && !confirm(t.bookingConfirm)) return;
    setBusy(true); setErr(null);
    const res = await api('/api/bookings/' + b.id + '/status', { status: s });
    setBusy(false);
    if (!res.ok) setErr(errorText(t, res.data)); else r.refresh();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true); setErr(null);
    const res = await api('/api/bookings/' + b.id + '/messages', { body: text });
    setBusy(false);
    if (!res.ok) setErr(errorText(t, res.data)); else { setText(''); r.refresh(); }
  }
  const actions = nextStatuses(b.status, role);
  const when = (iso: string) => new Date(iso).toLocaleString(lang === 'ky' ? 'ky-KG' : lang === 'ru' ? 'ru-RU' : 'en-GB');
  return (
    <Card className="p-4" data-testid="booking">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{b.listing_title}</div>
          <div className="text-sm text-ink/60">{b.start_date}{b.end_date ? ' → ' + b.end_date : ''} · {t.guests}: {b.guests} · {usd(b.total_usd)} ({t.bookingThread.estimate})</div>
        </div>
        <Badge tone={TONE[b.status]} data-testid="booking-status">{st(b.status)}</Badge>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-ink/70">“{b.message}”</p>
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((s) => <Button key={s} size="sm" variant={s === 'confirmed' || s === 'completed' ? 'primary' : 'outline'} disabled={busy} onClick={() => setStatus(s)}>{t.bookingAction[s]}</Button>)}
        </div>
      )}
      <button type="button" className="mt-3 text-xs font-medium text-glacier-700" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t.bookingThread.hide : f(t.bookingThread.show, { n: b.messages.length })}</button>
      {open && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-1 text-xs text-ink/50">{b.events.map((e, i) => <li key={i}>{when(e.created_at)}: {e.from_status ? st(e.from_status) + ' → ' : ''}{st(e.to_status)}{e.note ? ' (' + e.note + ')' : ''}</li>)}</ul>
          <div className="space-y-1.5">
            {b.messages.map((m) => <div key={m.id} className={'max-w-[85%] whitespace-pre-line rounded-xl px-3 py-1.5 text-sm ' + (m.sender_id === me ? 'ml-auto bg-ink text-snow' : 'bg-ink/5')}>{m.body}</div>)}
          </div>
          <form onSubmit={send} className="flex gap-2">
            <Input aria-label={t.message} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={t.message} />
            <Button size="md" disabled={busy || !text.trim()}>{t.send}</Button>
          </form>
        </div>
      )}
      {err && <Alert tone="error" className="mt-2">{err}</Alert>}
    </Card>
  );
}
