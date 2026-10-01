import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { Metric, PageHead, Table, td } from '@/components/portal/shell';
import { Alert, Badge, Empty } from '@/components/ui';

export default async function AdminPayments({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const T = t.admin.table;
  const c = (await adminCtx(locale, '/' + locale + '/admin/payments'))!;
  const pays = await c.repo.payments();
  const real = pays.filter((p) => p.status === 'paid' && !p.is_test);
  return (
    <>
      <PageHead admin title={t.admin.nav.payments} />
      <Alert tone="info" className="mb-4">{t.admin.payments.intro}</Alert>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric admin label={t.admin.counts.paymentsPaid} value={real.length} />
        <Metric admin label={t.admin.payments.revenue} value={'$' + real.reduce((s, p) => s + p.amount_usd, 0).toLocaleString('en-US')} />
        <Metric admin label={T.test} value={pays.filter((p) => p.is_test).length} />
      </div>
      {!pays.length ? <Empty>{t.admin.payments.empty}</Empty> : (
        <Table admin head={[T.created, T.provider, T.amount, T.status, T.test]}>
          {pays.map((p) => <tr key={p.id}><td className={td}>{p.created_at.slice(0, 10)}</td><td className={td}>{p.provider}</td><td className={td + ' tabular-nums'}>{p.amount_usd} {p.currency}</td><td className={td}><Badge tone={p.status === 'paid' ? 'ok' : 'neutral'}>{t.payStatus[p.status]}</Badge></td><td className={td}>{p.is_test ? t.admin.yes : t.admin.no}</td></tr>)}
        </Table>
      )}
    </>
  );
}
