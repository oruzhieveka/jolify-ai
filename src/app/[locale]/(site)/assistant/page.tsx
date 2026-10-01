import type { Metadata } from 'next';
import { getDict } from '@/i18n/dict';
import { getCtx } from '@/server/context';
import { AssistantChat } from '@/components/assistant-chat';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const t = getDict(locale);
  return { title: t.assistant.title, description: t.assistant.intro, alternates: { canonical: '/' + locale + '/assistant' } };
}

export default async function AssistantPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale);
  const c = await getCtx();
  const conv = c.user && sp.c ? await c.repo.getConversation(c.user.id, sp.c).catch(() => null) : null;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <h1 className="text-3xl font-semibold">{t.assistant.title}</h1>
      <AssistantChat key={conv?.id ?? 'new'} signedIn={!!c.user} initial={conv ? { id: conv.id, messages: conv.messages.map((m) => ({ role: m.role, content: m.content })) } : null} />
    </div>
  );
}
