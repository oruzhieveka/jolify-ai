import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { PageHead, Table, td } from '@/components/portal/shell';
import { AdminActions } from '@/components/moderation-buttons';
import { Badge, Empty } from '@/components/ui';

export default async function Partners({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const T = t.admin.table; const A = t.admin;
  const c = (await adminCtx(locale, '/' + locale + '/admin/partners'))!;
  const [partners, listings] = await Promise.all([c.repo.listPartnerProfiles(), c.repo.allListings()]);
  return (
    <>
      <PageHead admin title={A.nav.partners} />
      {!partners.length ? <Empty>{A.empty}</Empty> : (
        <Table admin head={[T.name, T.category, T.city, t.portal.nav.listings, T.verified, T.status, T.actions]}>
          {partners.map((p) => (
            <tr key={p.id}>
              <td className={td}><div className="font-medium">{p.name}</div><div className="text-xs text-snow/50">{p.email} {p.phone}</div>{p.isDemo && <Badge tone="warn">{A.sample}</Badge>}</td>
              <td className={td}>{t.partnerCategories[p.category]}</td><td className={td}>{p.city}</td>
              <td className={td + ' tabular-nums'}>{listings.filter((l) => l.partnerId === p.id).length}</td>
              <td className={td}>{p.verified ? A.yes : A.no}</td>
              <td className={td}><Badge tone={p.status === 'active' ? 'ok' : 'bad'}>{p.status === 'active' ? A.active : A.suspended}</Badge></td>
              <td className={td}><AdminActions endpoint={'/api/admin/partners/' + p.id} method="PATCH" actions={[
                { label: p.verified ? A.unverify : A.verify, body: { verified: !p.verified } },
                p.status === 'active' ? { label: A.suspend, body: { status: 'suspended' }, variant: 'danger', confirm: true } : { label: A.activate, body: { status: 'active' } },
              ]} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
