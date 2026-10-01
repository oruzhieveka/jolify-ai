import Link from 'next/link';
import type { Metadata } from 'next';
import { getDict } from '@/i18n/dict';
import { getCtx } from '@/server/context';
import { PARTNER_CATEGORIES } from '@/core/types';
import { PARTNER_POLICY_VERSION } from '@/core/consent';
import { Card, buttonClass } from '@/components/ui';
import { PartnerApplyForm } from '@/components/partner-apply-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; return { title: getDict(locale).partnerPage.metaTitle }; }

export default async function PartnerLanding({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await getCtx();
  const memberOf = c.user ? await c.repo.partnerIdsForUser(c.user.id) : [];
  const steps = t.partnerPage.steps;
  const settings = await c.repo.getSettings();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="max-w-3xl text-4xl font-semibold">{t.partner.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/70">{t.partner.sub}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(([h, p], i) => <Card key={h} className="p-5"><div className="text-sm font-semibold text-apricot-600">{i + 1}</div><div className="mt-1 font-semibold">{h}</div><p className="mt-1 text-sm text-ink/60">{p}</p></Card>)}
      </div>
      <p className="mt-4 text-sm text-ink/50">{t.partner.aiNote}</p>
      <section className="mt-12" id="apply">
        <h2 className="text-2xl font-semibold">{t.partner.apply}</h2>
        {memberOf.length > 0 ? (
          <Card className="mt-4 p-5">{t.partner.alreadyPartner} <Link className={buttonClass('primary', 'sm') + ' ml-2'} href={'/' + locale + '/partner/dashboard'}>{t.partner.openPortal}</Link></Card>
        ) : !settings.partner_applications_open ? (
          <Card className="mt-4 p-5">{t.partner.closed}</Card>
        ) : c.user ? (
          <PartnerApplyForm categories={[...PARTNER_CATEGORIES]} policyVersion={PARTNER_POLICY_VERSION} />
        ) : (
          <Card className="mt-4 p-5">{t.partner.needAccount} <Link className={buttonClass('primary', 'sm') + ' ml-2'} href={'/' + locale + '/login?next=' + encodeURIComponent('/' + locale + '/partner#apply')}>{t.nav.login}</Link></Card>
        )}
      </section>
    </div>
  );
}
