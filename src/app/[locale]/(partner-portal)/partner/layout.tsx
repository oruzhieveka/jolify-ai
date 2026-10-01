import Link from 'next/link';
import type { Metadata } from 'next';
import { fmt, getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { managedPartnerIds } from '@/server/handlers-portal';
import { PortalShell } from '@/components/portal/shell';
import { buttonClass } from '@/components/ui';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Partner Portal shell. Access requires sign-in AND membership of at least one partner (checked on the server). */
export default async function PartnerPortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await portalCtx(locale, '/' + locale + '/partner/dashboard');
  const ids = c.user!.role === 'admin' ? await c.repo.partnerIdsForUser(c.user!.id) : await managedPartnerIds(c);
  if (!ids.length) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-4 text-center text-snow">
        <div className="max-w-md">
          <Logo tone="dark" size={34} sub={t.portal.name} />
          <h1 className="mt-8 text-2xl font-semibold">{t.portal.noPartner}</h1>
          <p className="mt-2 text-snow/60">{t.portal.noPartnerBody}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href={'/' + locale + '/partner#apply'} className={buttonClass('primary') + ' !bg-apricot-500 !text-ink'}>{t.partner.apply}</Link>
            <Link href={'/' + locale} className={buttonClass('ghost') + ' !text-snow'}>{t.portal.switchToSite}</Link>
          </div>
        </div>
      </div>
    );
  }
  const pending = (await c.repo.bookingsForPartners(ids)).filter((b) => b.status === 'pending').length;
  const l = (p: string) => '/' + locale + '/partner/' + p;
  const n = t.portal.nav;
  return (
    <PortalShell locale={locale} variant="partner" title={t.portal.name} siteLabel={t.portal.switchToSite} logoutLabel={t.nav.logout} signedIn={fmt(t.portal.settings.account) + ' ' + (c.user!.email ?? '')}
      items={[
        { href: l('dashboard'), label: n.dashboard }, { href: l('profile'), label: n.profile }, { href: l('listings'), label: n.listings },
        { href: l('photos'), label: n.photos }, { href: l('leads'), label: n.leads, badge: pending }, { href: l('bookings'), label: n.bookings },
        { href: l('analytics'), label: n.analytics }, { href: l('settings'), label: n.settings },
      ]}>
      {children}
    </PortalShell>
  );
}
