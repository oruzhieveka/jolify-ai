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
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
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
    if (mode === 'signUp') {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { setErr(t.auth.failed); setState('idle'); }
      else if (!data.session) { setState('sent'); } // в Supabase включено подтверждение email
      else window.location.assign(next); // подтверждение выключено — вошли сразу
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setErr(/invalid/i.test(error.message) ? t.auth.invalid : t.auth.failed); setState('idle'); }
    else window.location.assign(next);
  }

  async function google() {
    setErr(null);
    const sb = supabaseBrowser();
    if (!sb) { setErr(t.authExtra.notConfigured); return; }
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/api/auth/callback?next=' + encodeURIComponent(next) },
    });
  }
    if (state === 'sent') return <Alert tone="ok" className="mt-4">{fmt(t.auth.confirmEmail, { email })}</Alert>;
    return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div><Label htmlFor="em">{t.auth.email}</Label><Input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label htmlFor="pw">{t.auth.password}</Label><Input id="pw" type="password" required minLength={6} autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {err && <Alert tone="error">{err}</Alert>}
      <Button className="w-full" disabled={state === 'busy' || !email || !password}>{state === 'busy' && <Spinner />}{mode === 'signIn' ? t.auth.signInPass : t.auth.createAccount}</Button>
      <button type="button" onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="w-full text-center text-xs text-ink/60 hover:underline">
        {mode === 'signIn' ? t.auth.switchToSignUp : t.auth.switchToSignIn}
      </button>
      <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-ink/10" /><span className="text-xs text-ink/50">{t.auth.or}</span><span className="h-px flex-1 bg-ink/10" /></div>
      <button type="button" onClick={google} className="w-full rounded-xl border border-ink/10 p-3 text-center font-medium hover:border-ink/30 hover:bg-ink/5">
        {t.auth.google}
      </button>
    </form>
  );
}
