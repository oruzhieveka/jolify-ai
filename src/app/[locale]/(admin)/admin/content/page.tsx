import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { translationStatus } from '@/core/localize';
import { PageHead, Table, td } from '@/components/portal/shell';
import { Badge } from '@/components/ui';

export default async function Content({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const T = t.admin.table;
  const c = (await adminCtx(locale, '/' + locale + '/admin/content'))!;
  const dests = await c.repo.allDestinations();
  const cell = (s: { done: number; total: number }) => <Badge tone={s.done === s.total ? 'ok' : s.done ? 'warn' : 'bad'}>{s.done}/{s.total}</Badge>;
  return (
    <>
      <PageHead admin title={t.admin.nav.content} intro={t.admin.content.intro} />
      <Table admin head={[T.name, 'RU', 'KG', T.actions]}>
        {dests.map((d) => (
          <tr key={d.id}>
            <td className={td}>{d.name.en}</td><td className={td}>{cell(translationStatus(d, 'ru'))}</td><td className={td}>{cell(translationStatus(d, 'ky'))}</td>
            <td className={td}><Link href={'/' + locale + '/admin/content/' + d.id} className="rounded-full bg-white/5 px-3 py-1 text-sm hover:bg-white/10">{t.admin.locations.edit}</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
