import type { AnthropicConfig } from './anthropic.ts';
import { LlmError, httpCode, type ChatTurn } from './provider.ts';
import { sseData } from './sse.ts';

const API = 'https:' + '//api.anthropic.com/v1/messages';

/** Streaming text chat via the Anthropic Messages API (stream: true). */
export async function* anthropicStreamChat(cfg: AnthropicConfig, system: string, messages: ChatTurn[], signal?: AbortSignal): AsyncIterable<string> {
  const f = cfg.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(cfg.baseUrl ?? API, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1500, temperature: 0.3, stream: true, system, messages }),
    });
  } catch (e) { throw new LlmError((e as Error).name === 'AbortError' ? 'timeout' : 'unavailable', String((e as Error).message)); }
  if (!res.ok || !res.body) throw new LlmError(httpCode(res.status), 'Anthropic HTTP ' + res.status, res.status);
  for await (const data of sseData(res.body)) {
    let ev: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
    try { ev = JSON.parse(data); } catch { continue; }
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) yield ev.delta.text;
    else if (ev.type === 'error') throw new LlmError('unavailable', ev.error?.message ?? 'stream error');
    else if (ev.type === 'message_stop') return;
  }
}
