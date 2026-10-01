import { getDict } from '@/i18n/dict';
import { adminCtx, } from '@/server/guards';
import { getLlm } from '@/server/context';
import { mapProvider } from '@/lib/map-provider';
import { env } from '@/lib/env';
import { PageHead, Panel } from '@/components/portal/shell';
import { SettingsForm } from '@/components/portal/settings-form';
import { Badge } from '@/components/ui';

export default async function AdminSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const S = t.admin.settings;
  const c = (await adminCtx(locale, '/' + locale + '/admin/settings'))!;
  const settings = await c.repo.getSettings();
  const llm = getLlm();
  const integrations: [string, boolean, string][] = [
    ['Supabase', !env.demoMode, env.demoMode ? 'DEMO_MODE' : 'NEXT_PUBLIC_SUPABASE_URL'],
    ['Mapbox', mapProvider() === 'mapbox', 'NEXT_PUBLIC_MAPBOX_TOKEN'],
    ['AI', !!llm, llm ? llm.id + ' · ' + llm.model : 'AI_PROVIDER / AI_API_KEY'],
  ];
  return (
    <>
      <PageHead admin title={S.title} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsForm initial={settings} />
        <Panel admin><h2 className="font-semibold">{S.env}</h2><p className="mb-3 mt-1 text-sm text-snow/60">{S.envNote}</p>
          <ul className="space-y-2 text-sm">{integrations.map(([name, ok, hint]) => <li key={name} className="flex items-center justify-between gap-3"><span>{name} <span className="text-xs text-snow/40">{hint}</span></span><Badge tone={ok ? 'ok' : 'warn'}>{ok ? S.configured : S.missing}</Badge></li>)}</ul>
        </Panel>
      </div>
    </>
  );
}
