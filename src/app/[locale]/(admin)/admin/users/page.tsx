import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { ROLES } from '@/core/types';
import { PageHead, Table, td } from '@/components/portal/shell';
import { AdminActions } from '@/components/moderation-buttons';
import { Badge, Empty } from '@/components/ui';

export default async function Users({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const T = t.admin.table;
  const c = (await adminCtx(locale, '/' + locale + '/admin/users'))!;
  const users = await c.repo.listProfiles();
  return (
    <>
      <PageHead admin title={t.admin.nav.users} />
      {!users.length ? <Empty>{t.admin.empty}</Empty> : (
        <Table admin head={[T.name, T.email, T.role, T.joined, T.actions]}>
          {users.map((u) => (
            <tr key={u.id}>
              <td className={td}>{u.full_name || '·'}</td><td className={td}>{u.email}</td>
              <td className={td}><Badge tone={u.role === 'admin' ? 'warn' : u.role === 'partner' ? 'info' : 'neutral'}>{t.auth.roles[u.role]}</Badge></td>
              <td className={td + ' text-snow/50'}>{u.created_at.slice(0, 10)}</td>
              <td className={td}>{u.id !== c.user!.id && <AdminActions endpoint={'/api/admin/users/' + u.id} method="PATCH" actions={ROLES.filter((r) => r !== u.role).map((r) => ({ label: t.admin.saveRole + ': ' + t.auth.roles[r], body: { role: r }, confirm: r === 'admin' }))} />}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
