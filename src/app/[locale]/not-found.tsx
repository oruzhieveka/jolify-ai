'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/client';

export default function NotFound() {
  const { t, lang } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t.errorPage.notFoundTitle}</h1>
      <p className="mt-2 text-ink/60">{t.errorPage.notFoundBody}</p>
      <Link href={'/' + lang} className="mt-4 inline-block text-glacier-700 underline">{t.errorPage.home}</Link>
    </div>
  );
}
