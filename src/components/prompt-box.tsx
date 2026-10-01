'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './ui';
import { useI18n } from '@/i18n/client';

export function PromptBox({ locale, placeholder, cta, examples }: { locale: string; placeholder: string; cta: string; examples: string[] }) {
  const { t } = useI18n();
  const r = useRouter();
  const [q, setQ] = useState('');
  const go = (text: string) => { if (text.trim().length >= 3) r.push('/' + locale + '/plan?q=' + encodeURIComponent(text.trim())); };
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="mx-auto max-w-3xl text-left">
      <div className="rounded-3xl border border-ink/10 bg-white p-2 shadow-[0_20px_60px_-20px_rgba(11,18,32,.35)] focus-within:ring-4 focus-within:ring-glacier-500/15">
        <label htmlFor="trip-prompt" className="sr-only">{t.promptLabel}</label>
        <textarea id="trip-prompt" data-testid="prompt" value={q} onChange={(e) => setQ(e.target.value)} rows={3} maxLength={2000} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(q); } }}
          className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-ink/40 md:text-lg" />
        <div className="flex items-center justify-end px-2 pb-1">
          <Button type="submit" size="lg" disabled={q.trim().length < 3}>{cta} →</Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {examples.map((x) => (
          <button key={x} type="button" onClick={() => go(x)} className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-xs text-ink/70 hover:bg-white">{x}</button>
        ))}
      </div>
    </form>
  );
}
