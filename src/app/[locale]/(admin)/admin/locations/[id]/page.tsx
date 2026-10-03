import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { PageHead } from '@/components/portal/shell';
import { LocationEditor } from '@/components/portal/location-editor';

export default async function EditLocation({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale); const L = t.admin.locations;
  const c = (await adminCtx(locale, '/' + locale + '/admin/locations/' + id))!;
  const d = (await c.repo.allDestinations()).find((x) => x.id === id);
  if (!d) notFound();
  return (
    <>
      <PageHead admin title={L.editData + ': ' + d.name.en} intro={L.form.intro} actions={<Link className="inline-flex min-h-11 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10" href={'/' + locale + '/admin/content/' + d.id}>{t.admin.locations.edit}</Link>} />
      <LocationEditor d={d} />
    </>
  );
}
