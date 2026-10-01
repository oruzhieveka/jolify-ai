import type { Metadata } from 'next';
import { getDict } from '@/i18n/dict';
import { env } from '@/lib/env';
import { Card } from '@/components/ui';
import { LoginForm } from '@/components/login-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).nav.login, robots: { index: false } };
}

const safeNext = (n: string | undefined, locale: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/' + locale);

export default async function Login({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold">{t.nav.login}</h1>
        <LoginForm demo={env.demoMode} next={safeNext(sp.next, locale)} error={sp.error ?? null} />
      </Card>
    </div>
  );
}
