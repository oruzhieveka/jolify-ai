/** Client for any OpenAI-compatible /chat/completions endpoint (tools + streaming). Server-only. */
import { SYSTEM_PROMPT, TOOL_INPUT_SCHEMA, TOOL_NAME } from '../../core/ai-contract.ts';
import type { Lang } from '../../core/types.ts';
import type { ToolCallError, ToolCallResult } from './anthropic.ts';
import { LlmError, httpCode, type ChatTurn } from './provider.ts';
import { sseData } from './sse.ts';

export interface OpenAiConfig { apiKey: string; model: string; baseUrl: string; fetchImpl?: typeof fetch; timeoutMs?: number }

const headers = (k: string) => ({ 'content-type': 'application/json', authorization: 'Bearer ' + k });

export async function openAiCallTool(cfg: OpenAiConfig, lang: Lang, ctx: string, messages: ChatTurn[]): Promise<ToolCallResult | ToolCallError> {
  const f = cfg.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 45000);
  try {
    const res = await f(cfg.baseUrl + '/chat/completions', {
      method: 'POST', signal: ctrl.signal, headers: headers(cfg.apiKey),
      body: JSON.stringify({
        model: cfg.model, temperature: 0.4, max_tokens: 4096,
        messages: [{ role: 'system', content: SYSTEM_PROMPT(lang) + '\n\n' + ctx }, ...messages],
        tools: [{ type: 'function', function: { name: TOOL_NAME, description: 'Return the structured itinerary built only from catalogue ids.', parameters: TOOL_INPUT_SCHEMA } }],
        tool_choice: { type: 'function', function: { name: TOOL_NAME } },
      }),
    });
    if (!res.ok) return { ok: false, status: res.status, error: 'LLM HTTP ' + res.status };
    const j = (await res.json()) as { choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
    const call = j.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === TOOL_NAME);
    if (!call?.function?.arguments) return { ok: false, error: 'Model did not call the itinerary tool' };
    let input: unknown;
    try { input = JSON.parse(call.function.arguments); } catch { return { ok: false, error: 'Tool arguments were not valid JSON' }; }
    return { ok: true, input, usage: j.usage ? { input_tokens: j.usage.prompt_tokens, output_tokens: j.usage.completion_tokens } : undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'LLM request timed out' : 'LLM network error' };
  } finally { clearTimeout(timer); }
}

export async function* openAiStreamChat(cfg: OpenAiConfig, system: string, messages: ChatTurn[], signal?: AbortSignal): AsyncIterable<string> {
  const f = cfg.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(cfg.baseUrl + '/chat/completions', {
      method: 'POST', signal, headers: headers(cfg.apiKey),
      body: JSON.stringify({ model: cfg.model, temperature: 0.3, max_tokens: 1500, stream: true, messages: [{ role: 'system', content: system }, ...messages] }),
    });
  } catch (e) { throw new LlmError((e as Error).name === 'AbortError' ? 'timeout' : 'unavailable', String((e as Error).message)); }
  if (!res.ok || !res.body) throw new LlmError(httpCode(res.status), 'LLM HTTP ' + res.status, res.status);
  for await (const data of sseData(res.body)) {
    if (data === '[DONE]') return;
    try {
      const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
      const piece = j.choices?.[0]?.delta?.content;
      if (piece) yield piece;
    } catch { /* keep-alive or partial line */ }
  }
}
