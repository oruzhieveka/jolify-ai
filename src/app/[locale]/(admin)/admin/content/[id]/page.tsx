import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fmt, getDict } from '@/i18n/dict';
import { env } from '@/lib/env';
import { adminCtx } from '@/server/guards';
import { PageHead, Panel } from '@/components/portal/shell';
import { ContentEditor } from '@/components/portal/content-editor';
import { PhotoManager } from '@/components/portal/photo-manager';

export default async function ContentEdit({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale); const C = t.admin.content;
  const c = (await adminCtx(locale, '/' + locale + '/admin/content/' + id))!;
  const d = (await c.repo.allDestinations()).find((x) => x.id === id);
  if (!d) notFound();
  return (
    <>
      <Link href={'/' + locale + '/admin/content'} className="text-sm text-snow/50 hover:underline">← {C.back}</Link>
      <PageHead admin title={fmt(C.title, { name: d.name.en })} intro={C.intro} />
      <ContentEditor d={d} />
      <Panel admin className="mt-6"><h2 className="font-semibold">{C.photos}</h2><p className="mb-3 mt-1 text-sm text-snow/60">{C.photosNote}</p><PhotoManager ownerType="destination" ownerId={d.id} demo={env.demoMode} attribution dark /></Panel>
    </>
  );
}
