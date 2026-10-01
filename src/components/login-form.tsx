'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { fmt } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { Alert, Button, Input, Label, Spinner } from './ui';

const ROLES = ['traveler', 'partner', 'admin'] as const;

export function LoginForm({ demo, next, error }: { demo: boolean; next: string; error: string | null }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [err, setErr] = useState<string | null>(error);

  if (demo) {
    return (
      <div className="mt-4 space-y-3">
        <Alert tone="warn">{t.auth.demoIntro}</Alert>
        {ROLES.map((r) => (
          <form key={r} action="/api/auth/demo" method="post">
            <input type="hidden" name="role" value={r} />
            <input type="hidden" name="next" value={next} />
            <button className="w-full rounded-xl border border-ink/10 p-3 text-left hover:border-ink/30 hover:bg-ink/5" data-testid={'demo-' + r}>
              <div className="font-medium">{fmt(t.auth.demoAs, { role: t.auth.roles[r] })}</div><div className="text-xs text-ink/60">{t.authExtra.roleDesc[r]}</div>
            </button>
          </form>
        ))}
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setState('busy');
    const sb = supabaseBrowser();
    if (!sb) { setErr(t.authExtra.notConfigured); setState('idle'); return; }
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/api/auth/callback?next=' + encodeURIComponent(next) } });
    if (error) { setErr(/rate|limit/i.test(error.message) ? t.errors.rate_limited : t.auth.failed); setState('idle'); } else setState('sent');
  }
  if (state === 'sent') return <Alert tone="ok" className="mt-4">{fmt(t.auth.checkInbox, { email })}</Alert>;
  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div><Label htmlFor="em">{t.auth.email}</Label><Input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {err && <Alert tone="error">{err}</Alert>}
      <Button className="w-full" disabled={state === 'busy' || !email}>{state === 'busy' && <Spinner />}{t.auth.sendLink}</Button>
      <p className="text-xs text-ink/50">{t.auth.noPassword}</p>
    </form>
  );
}
