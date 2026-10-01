/** Streaming AI assistant handler. Returns an error Res or a token stream; the route turns it into SSE. */
import { z } from 'zod';
import { err, track, type Ctx, type Res } from './handlers.ts';
import { chatSystemPrompt, sanitizeHistory, unverifiedPrices } from './ai/chat.ts';
import { LlmError, type ChatTurn, type LlmProvider } from './ai/provider.ts';
import { LANGS } from '../core/types.ts';

export type ChatEvent = { type: 'token'; text: string } | { type: 'done'; conversation_id: string | null; unverified_prices: number[]; model: string } | { type: 'error'; code: string };

export async function aiChat(c: Ctx, llm: LlmProvider | null, body: unknown, signal?: AbortSignal): Promise<Res | AsyncIterable<ChatEvent>> {
  const p = z.object({ messages: z.unknown(), lang: z.enum(LANGS).default('en'), conversation_id: z.string().max(80).nullable().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Invalid request');
  const turns = sanitizeHistory(p.data.messages);
  if (!turns) return err(400, 'Empty message', undefined, 'empty_message');
  const settings = await c.repo.getSettings();
  if (!llm || !settings.ai_enabled) return err(503, 'AI assistant is not configured', undefined, 'ai_not_configured'); // never a fake answer
  const cat = await c.repo.catalog();
  const system = chatSystemPrompt(cat, p.data.lang);
  const lang = p.data.lang; const convId = p.data.conversation_id ?? null;
  await track(c)('ai_chat_requested', { lang, provider: llm.id, turns: turns.length });
  return (async function* (): AsyncIterable<ChatEvent> {
    let answer = '';
    try {
      for await (const t of llm.streamChat(system, turns, signal)) { answer += t; yield { type: 'token', text: t }; }
    } catch (e) {
      await track(c)('ai_chat_failed', { code: e instanceof LlmError ? e.code : 'unavailable' });
      yield { type: 'error', code: e instanceof LlmError ? 'ai_' + e.code : 'ai_unavailable' };
      return;
    }
    if (!answer.trim()) { yield { type: 'error', code: 'ai_bad_response' }; return; }
    const all: ChatTurn[] = [...turns, { role: 'assistant', content: answer }];
    let saved: string | null = null;
    if (c.user) saved = (await c.repo.saveConversation(c.user.id, convId, lang, all).catch(() => null))?.id ?? null;
    await track(c)('ai_chat_succeeded', { provider: llm.id });
    yield { type: 'done', conversation_id: saved, unverified_prices: unverifiedPrices(answer, cat, turns), model: llm.id + ':' + llm.model };
  })();
}
