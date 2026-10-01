'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { errorText, fmt } from '@/i18n/dict';
import { createSseParser } from '@/core/sse-parse';
import { Button } from './ui';

type Msg = { role: 'user' | 'assistant'; content: string; unverified?: number[]; failed?: string };
const LOCAL_KEY = 'jolify.assistant.v1';
const MAX_TURNS = 30;

/** Streaming assistant UI. Anonymous history stays in localStorage; signed-in history is saved server-side. */
export function AssistantChat({ signedIn, initial }: { signedIn: boolean; initial?: { id: string; messages: Msg[] } | null }) {
  const { t, lang } = useI18n();
  const a = t.assistant;
  const [msgs, setMsgs] = useState<Msg[]>(initial?.messages ?? []);
  const [convId, setConvId] = useState<string | null>(initial?.id ?? null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (signedIn || initial) return;
    try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) setMsgs((JSON.parse(raw) as Msg[]).slice(-MAX_TURNS)); } catch { /* corrupt storage is ignored */ }
  }, [signedIn, initial]);
  useEffect(() => {
    if (!signedIn) try { localStorage.setItem(LOCAL_KEY, JSON.stringify(msgs.filter((m) => !m.failed).slice(-MAX_TURNS))); } catch { /* quota */ }
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, signedIn]);
  useEffect(() => () => abort.current?.abort(), []);

  const send = useCallback(async (text: string, base: Msg[]) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null); setBusy(true);
    const history: Msg[] = [...base, { role: 'user', content }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    const ctrl = new AbortController(); abort.current = ctrl;
    let answer = ''; let failure: string | null = null;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ lang, conversation_id: convId, messages: history.slice(-MAX_TURNS).map(({ role, content: c }) => ({ role, content: c })) }),
      });
      if (!res.ok || !res.body) { failure = errorText(t, await res.json().catch(() => null)); }
      else {
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        const parse = createSseParser((data) => {
          let ev: { type: string; text?: string; code?: string; conversation_id?: string | null; unverified_prices?: number[] };
          try { ev = JSON.parse(data); } catch { return; }
          if (ev.type === 'token' && ev.text) { answer += ev.text; setMsgs([...history, { role: 'assistant', content: answer }]); }
          else if (ev.type === 'error') failure = errorText(t, { code: ev.code });
          else if (ev.type === 'done') {
            if (ev.conversation_id) setConvId(ev.conversation_id);
            setMsgs([...history, { role: 'assistant', content: answer, unverified: ev.unverified_prices?.length ? ev.unverified_prices : undefined }]);
          }
        });
        for (;;) { const { value, done } = await reader.read(); if (done) break; parse(value); }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setBusy(false); setMsgs(answer ? [...history, { role: 'assistant', content: answer }] : history); return; }
      failure = t.errors.network;
    }
    if (failure) { setError(failure); setMsgs(answer ? [...history, { role: 'assistant', content: answer }] : [...history.slice(0, -1), { role: 'user', content, failed: failure }]); }
    setBusy(false); abort.current = null;
  }, [busy, convId, lang, t]);

  const retry = () => {
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    if (!last) return;
    const idx = msgs.lastIndexOf(last);
    void send(last.content, msgs.slice(0, idx));
  };
  const reset = () => { abort.current?.abort(); setMsgs([]); setConvId(null); setError(null); if (!signedIn) localStorage.removeItem(LOCAL_KEY); };

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex-1 space-y-5" aria-live="polite" aria-busy={busy}>
        {msgs.length === 0 && (
          <div className="py-6">
            <p className="max-w-[65ch] text-ink/70">{a.intro}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {a.suggestions.map((s) => <button key={s} type="button" onClick={() => void send(s, [])} className="rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink/75 transition hover:border-ink/35 hover:text-ink">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-snow' : 'max-w-[70ch]'}>
              <div className="sr-only">{m.role === 'user' ? a.you : a.ai}</div>
              {m.role === 'assistant' && !m.content && busy && i === msgs.length - 1
                ? <span className="inline-flex items-center gap-2 text-sm text-ink/50"><span className="h-2 w-2 animate-pulse rounded-full bg-apricot-500" />{a.thinking}</span>
                : <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
              {m.unverified && <p className="mt-2 rounded-lg bg-apricot-100 px-3 py-2 text-xs text-ink/75">{fmt(a.unverifiedPrice, { list: m.unverified.map((p) => '$' + p).join(', ') })}</p>}
              {m.failed && <p className="mt-1 text-xs text-snow/70">{m.failed}</p>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span>{error}</span><Button size="sm" variant="outline" onClick={retry}>{a.retry}</Button>
        </div>
      )}

      <form className="sticky bottom-0 mt-6 bg-paper pb-4 pt-2" onSubmit={(e) => { e.preventDefault(); const v = input; setInput(''); void send(v, msgs.filter((m) => !m.failed)); }}>
        <label htmlFor="assistant-input" className="sr-only">{a.placeholder}</label>
        <div className="rounded-2xl border border-ink/15 bg-white p-2 focus-within:border-glacier-500">
          <textarea id="assistant-input" rows={2} maxLength={4000} value={input} placeholder={a.placeholder} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            className="w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-ink/40" />
          <div className="flex items-center justify-between gap-2 px-2 pb-1">
            <button type="button" onClick={reset} className="text-xs text-ink/50 hover:text-ink" disabled={!msgs.length}>{a.newChat}</button>
            {busy ? <Button type="button" size="sm" variant="outline" onClick={() => abort.current?.abort()}>{a.stop}</Button>
              : <Button type="submit" size="sm" disabled={!input.trim()}>{t.send}</Button>}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink/50">{signedIn ? a.savedHint : a.localHint} {a.disclaimer}</p>
      </form>
    </div>
  );
}
