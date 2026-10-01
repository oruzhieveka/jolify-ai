import Link from 'next/link';
import type { Dict } from '@/i18n/dict';
import { Logo } from './brand/logo';

export function SiteFooter({ locale, t }: { locale: string; t: Dict }) {
  const l = (p: string) => '/' + locale + p;
  return (
    <footer className="mt-24 bg-ink text-snow/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <Logo tone="dark" size={28} />
          <p className="max-w-sm">{t.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t.nav.main}>
          <Link className="hover:text-snow" href={l('/partner')}>{t.footer.business}</Link>
          <Link className="hover:text-snow" href={l('/legal/terms')}>{t.footer.terms}</Link>
          <Link className="hover:text-snow" href={l('/legal/privacy')}>{t.footer.privacy}</Link>
          <Link className="hover:text-snow" href={l('/legal/partner-terms')}>{t.footer.partnerTerms}</Link>
        </nav>
        <p className="text-xs text-snow/40 md:col-span-2">{t.footer.mapData}</p>
      </div>
    </footer>
  );
}
