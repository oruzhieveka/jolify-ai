import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PARTNER_POLICY_VERSION } from '@/core/consent';
import { fmt, getDict, type Dict } from '@/i18n/dict';
import { Alert } from '@/components/ui';

const KEY: Record<string, keyof Dict['legal']> = { terms: 'terms', privacy: 'privacy', 'partner-terms': 'partnerTerms' };
const doc = (t: Dict, k: string) => (KEY[k] ? (t.legal[KEY[k]] as { title: string; body: string[] }) : null);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }): Promise<Metadata> {
  const { locale, doc: k } = await params;
  return { title: doc(getDict(locale), k)?.title };
}

export default async function Legal({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc: k } = await params;
  const t = getDict(locale);
  const d = doc(t, k);
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">{d.title}</h1>
      <p className="mt-1 text-sm text-ink/50">{fmt(t.legal.version, { v: PARTNER_POLICY_VERSION })}</p>
      <Alert tone="warn" className="mt-4">{t.legal.draft}</Alert>
      <div className="mt-6 space-y-4 leading-relaxed text-ink/80">{d.body.map((p, i) => <p key={i}>{p}</p>)}</div>
    </article>
  );
}
