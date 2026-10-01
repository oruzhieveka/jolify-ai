import type { Metadata } from 'next';
import { fmt, getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { Forbidden, PortalShell } from '@/components/portal/shell';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Admin Portal. role === 'admin' is enforced here on the server, again in every handler, and by RLS in Postgres. */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await adminCtx(locale, '/' + locale + '/admin');
  if (!c) return <div className="min-h-dvh bg-night-900 text-snow"><Forbidden title={t.errorPage.forbiddenTitle} body={fmt(t.errorPage.forbiddenBody, { role: t.auth.roles.admin })} /></div>;
  const [listings, apps] = await Promise.all([c.repo.listingsByStatus('pending_review'), c.repo.listApplications('submitted')]);
  const n = t.admin.nav; const l = (p: string) => '/' + locale + '/admin' + (p ? '/' + p : '');
  return (
    <PortalShell locale={locale} variant="admin" title={t.admin.name} siteLabel={t.portal.switchToSite} logoutLabel={t.nav.logout} signedIn={c.user!.email ?? c.user!.id}
      items={[
        { href: l(''), label: n.overview }, { href: l('moderation'), label: n.moderation, badge: listings.length + apps.length }, { href: l('users'), label: n.users }, { href: l('partners'), label: n.partners },
        { href: l('listings'), label: n.listings }, { href: l('locations'), label: n.locations }, { href: l('content'), label: n.content }, { href: l('leads'), label: n.leads },
        { href: l('bookings'), label: n.bookings }, { href: l('payments'), label: n.payments }, { href: l('analytics'), label: n.analytics }, { href: l('settings'), label: n.settings },
      ]}>
      {children}
    </PortalShell>
  );
}
