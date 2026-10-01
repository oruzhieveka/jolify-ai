import { getDict } from '@/i18n/dict';
import { getSessionUser } from '@/server/context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/** Public consumer site chrome. Partner Portal and Admin have their own layouts. */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = await getSessionUser();
  return (
    <>
      <SiteHeader locale={locale} t={t} user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} t={t} />
    </>
  );
}
