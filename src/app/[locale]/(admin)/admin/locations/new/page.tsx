import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { PageHead } from '@/components/portal/shell';
import { LocationEditor } from '@/components/portal/location-editor';

export default async function NewLocation({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  (await adminCtx(locale, '/' + locale + '/admin/locations/new'))!;
  return (
    <>
      <PageHead admin title={t.admin.locations.new} intro={t.admin.locations.form.intro} />
      <LocationEditor />
    </>
  );
}
