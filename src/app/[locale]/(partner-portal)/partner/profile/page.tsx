import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { managedPartnerIds } from '@/server/handlers-portal';
import { dname } from '@/core/catalog';
import type { Lang } from '@/core/types';
import { PageHead } from '@/components/portal/shell';
import { BusinessProfileForm } from '@/components/portal/business-profile-form';

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ p?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale);
  const c = await portalCtx(locale, '/' + locale + '/partner/profile');
  const ids = c.user!.role === 'admin' ? await c.repo.partnerIdsForUser(c.user!.id) : await managedPartnerIds(c);
  const id = sp.p && ids.includes(sp.p) ? sp.p : ids[0];
  const [partner, cat, all] = await Promise.all([c.repo.getPartner(id), c.repo.catalog(), Promise.all(ids.map((x) => c.repo.getPartner(x)))]);
  if (!partner) return null;
  return (
    <>
      <PageHead title={t.portal.profile.title} intro={t.portal.profile.intro} actions={all.length > 1 ? all.map((x) => x && <a key={x.id} href={'?p=' + x.id} className={'rounded-full px-3 py-1 text-sm ' + (x.id === id ? 'bg-ink text-snow' : 'bg-ink/5')}>{x.name}</a>) : undefined} />
      <BusinessProfileForm partner={partner} destinations={cat.destinations.map((d) => ({ id: d.id, name: dname(d, locale as Lang) }))} />
    </>
  );
}
