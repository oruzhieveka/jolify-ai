import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { buttonClass } from './ui';

export function SignInPrompt({ locale, next, text }: { locale: string; next: string; text: string }) {
  const t = getDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-ink/70">{text}</p>
      <Link className={buttonClass('primary') + ' mt-4'} href={'/' + locale + '/login?next=' + encodeURIComponent(next)}>{t.nav.login}</Link>
    </div>
  );
}
