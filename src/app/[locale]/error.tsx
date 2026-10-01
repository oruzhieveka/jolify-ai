'use client';
import { useEffect } from 'react';
import { useI18n } from '@/i18n/client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t.errorPage.title}</h1>
      <p className="mt-2 text-ink/60">{t.errorPage.body}{error.digest ? ' (' + error.digest + ')' : ''}</p>
      <button onClick={reset} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm text-snow">{t.errorPage.retry}</button>
    </div>
  );
}
