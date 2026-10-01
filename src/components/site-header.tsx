import Link from 'next/link';
import { Suspense } from 'react';
import type { Dict } from '@/i18n/dict';
import type { SessionUser } from '@/server/repo';
import { LangSwitch } from './lang-switch';
import { Logo } from './brand/logo';
import { buttonClass } from './ui';

export function SiteHeader({ locale, t, user }: { locale: string; t: Dict; user: SessionUser | null }) {
  const l = (p: string) => '/' + locale + p;
  const links = [
    { href: l('/plan'), label: t.nav.plan },
    { href: l('/assistant'), label: t.nav.assistant },
    { href: l('/destinations'), label: t.nav.destinations },
    { href: l('/map'), label: t.nav.map },
    { href: l('/marketplace/stay'), label: t.nav.marketplace },
    { href: l('/partner'), label: t.nav.partners },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-snow/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href={l('')} aria-label="Jolify AI"><Logo size={28} /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t.nav.main}>
          {links.map((x) => <Link key={x.href} href={x.href} className="rounded-full px-3 py-1.5 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink">{x.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={null}><LangSwitch locale={locale} /></Suspense>
          {user ? (
            <>
              {user.role === 'admin' && <Link href={l('/admin')} className={buttonClass('ghost', 'sm') + ' hidden sm:inline-flex'}>{t.nav.admin}</Link>}
              {(user.role === 'partner' || user.role === 'admin') && <Link href={l('/partner/dashboard')} className={buttonClass('ghost', 'sm') + ' hidden sm:inline-flex'}>{t.nav.dashboard}</Link>}
              <Link href={l('/trips')} className={buttonClass('outline', 'sm')}>{t.nav.trips}</Link>
              <form action="/api/auth/logout" method="post"><button className={buttonClass('ghost', 'sm')}>{t.nav.logout}</button></form>
            </>
          ) : (
            <Link href={l('/login')} className={buttonClass('primary', 'sm')}>{t.nav.login}</Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label={t.nav.menu}>
        {links.map((x) => <Link key={x.href} href={x.href} className="shrink-0 rounded-full bg-ink/5 px-3 py-1.5 text-xs">{x.label}</Link>)}
        {user && (user.role === 'partner' || user.role === 'admin') && <Link href={l('/partner/dashboard')} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs text-snow sm:hidden">{t.nav.dashboard}</Link>}
      </nav>
    </header>
  );
}
