'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Button } from './ui';

type Action = { label: string; body: unknown; variant?: 'primary' | 'outline' | 'danger'; confirm?: boolean };

/** Generic admin action buttons: POST/PATCH to an endpoint, then refresh server data. */
export function AdminActions({ endpoint, method = 'POST', actions }: { endpoint: string; method?: 'POST' | 'PATCH'; actions: Action[] }) {
  const { t } = useI18n();
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function act(a: Action) {
    if (a.confirm && !confirm(t.bookingConfirm)) return;
    setBusy(true); setErr(null);
    const res = await api(endpoint, a.body, method);
    setBusy(false);
    if (res.ok) r.refresh(); else setErr(errorText(t, res.data));
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => <Button key={a.label} size="sm" variant={a.variant ?? 'outline'} disabled={busy} onClick={() => act(a)}>{a.label}</Button>)}
      {err && <span className="text-xs text-red-400" role="alert">{err}</span>}
    </div>
  );
}

export function ModerationButtons({ kind, id }: { kind: 'application' | 'listing'; id: string }) {
  const { t } = useI18n();
  const ep = kind === 'application' ? '/api/admin/applications/' + id : '/api/admin/listings/' + id;
  const key = kind === 'application' ? 'decision' : 'status';
  return <AdminActions endpoint={ep} actions={[{ label: t.admin.approve, body: { [key]: 'approved' }, variant: 'primary' }, { label: t.admin.reject, body: { [key]: 'rejected' }, confirm: true }]} />;
}
