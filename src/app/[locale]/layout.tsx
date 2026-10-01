import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import '../globals.css';
import { getDict, isLang } from '@/i18n/dict';
import { I18nProvider } from '@/i18n/client';
import { LANGS, type Lang } from '@/core/types';
import { env } from '@/lib/env';
import { getRepo } from '@/server/context';
import { PageViewTracker } from '@/components/page-view-tracker';

const inter = Inter({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], display: 'swap', variable: '--font-inter' });

export function generateStaticParams() { return LANGS.map((locale) => ({ locale })); }
export const viewport: Viewport = { themeColor: '#0F1B26', width: 'device-width', initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: 'Jolify AI · ' + t.tagline, template: '%s · Jolify AI' },
    description: t.heroSub,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, '/' + l])) },
    openGraph: { siteName: 'Jolify AI', type: 'website', locale, images: [{ url: '/brand/jolify-logo-dark.svg' }] },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLang(locale)) notFound();
  const t = getDict(locale);
  const settings = await (await getRepo()).getSettings().catch(() => null);
  const banner = settings?.maintenance_banner;
  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider t={t} lang={locale as Lang}>
          {env.demoMode && <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900" role="note" data-testid="demo-banner">{t.demoBanner}</div>}
          {banner?.en && <div className="bg-ink px-4 py-2 text-center text-sm text-snow" role="status">{banner[locale as Lang] || banner.en}</div>}
          {children}
          <PageViewTracker />
        </I18nProvider>
      </body>
    </html>
  );
}
