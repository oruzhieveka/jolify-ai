import { Suspense } from 'react';
import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { PageHead, Panel } from '@/components/portal/shell';
import { LangSwitch } from '@/components/lang-switch';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const S = t.portal.settings;
  const c = await portalCtx(locale, '/' + locale + '/partner/settings');
  return (
    <>
      <PageHead title={S.title} />
      <div className="grid max-w-2xl gap-4">
        <Panel><h2 className="font-semibold">{S.account}</h2><p className="mt-1 text-sm text-ink/70">{c.user!.email ?? c.user!.id} · {t.auth.roles[c.user!.role]}</p></Panel>
        <Panel><h2 className="mb-2 font-semibold">{S.language}</h2><Suspense fallback={null}><LangSwitch locale={locale} /></Suspense></Panel>
        <Panel><h2 className="font-semibold">{S.members}</h2><p className="mt-1 text-sm text-ink/60">{S.membersNote}</p></Panel>
        <Panel><h2 className="font-semibold">{S.notify}</h2><p className="mt-1 text-sm text-ink/60">{S.notifyNote}</p></Panel>
      </div>
    </>
  );
}
