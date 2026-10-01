'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformSettings } from '@/server/repo';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { Alert, Button, Input, Label, Spinner } from '@/components/ui';

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const { t } = useI18n(); const S = t.admin.settings;
  const r = useRouter();
  const [v, setV] = useState({ ...initial, banner: { en: initial.maintenance_banner?.en ?? '', ru: initial.maintenance_banner?.ru ?? '', ky: initial.maintenance_banner?.ky ?? '' } });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = await api('/api/admin/settings', { maintenance_banner: v.banner.en ? v.banner : null, inquiries_enabled: v.inquiries_enabled, ai_enabled: v.ai_enabled, partner_applications_open: v.partner_applications_open }, 'PATCH');
    setBusy(false); setMsg(res.ok ? { tone: 'ok', text: S.saved } : { tone: 'error', text: errorText(t, res.data) }); if (res.ok) r.refresh();
  }
  const Toggle = (k: 'inquiries_enabled' | 'ai_enabled' | 'partner_applications_open', label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-apricot-500" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} /></label>
  );
  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/5 bg-night-800 p-5">
      {Toggle('inquiries_enabled', S.inquiries)}{Toggle('ai_enabled', S.ai)}{Toggle('partner_applications_open', S.applications)}
      <div><Label className="!text-snow/80">{S.banner}</Label>
        <div className="grid gap-2">{(['en', 'ru', 'ky'] as const).map((l) => <Input key={l} aria-label={S.banner + ' ' + l} placeholder={l.toUpperCase()} maxLength={300} value={v.banner[l]} onChange={(e) => setV({ ...v, banner: { ...v.banner, [l]: e.target.value } })} />)}</div></div>
      <div className="flex items-center gap-3"><Button disabled={busy}>{busy && <Spinner />}{S.save}</Button>{msg && <Alert tone={msg.tone} className="flex-1 py-2">{msg.text}</Alert>}</div>
    </form>
  );
}
