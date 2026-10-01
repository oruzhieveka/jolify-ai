'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/client';

// i18n-ignore: language codes are shown as-is in every language
const CODES: Record<string, string> = { en: 'EN', ru: 'RU', ky: 'KG' };

export function LangSwitch({ locale, tone = 'light' }: { locale: string; tone?: 'light' | 'dark' }) {
  const { t } = useI18n();
  const path = usePathname() ?? '/' + locale;
  const qs = useSearchParams()?.toString();
  const rest = path.split('/').slice(2).join('/');
  const dark = tone === 'dark';
  return (
    <div className={'flex rounded-full p-0.5 text-xs ' + (dark ? 'bg-white/10' : 'bg-ink/5')} role="group" aria-label={t.nav.language}>
      {Object.keys(CODES).map((l) => (
        <Link key={l} href={'/' + l + (rest ? '/' + rest : '') + (qs ? '?' + qs : '')} hrefLang={l} aria-current={l === locale ? 'true' : undefined}
          className={'rounded-full px-2 py-1 ' + (l === locale ? (dark ? 'bg-white/90 font-semibold text-ink' : 'bg-white font-semibold shadow-sm') : dark ? 'text-white/60 hover:text-white' : 'text-ink/60 hover:text-ink')}>
          {CODES[l]}
        </Link>
      ))}
    </div>
  );
}
