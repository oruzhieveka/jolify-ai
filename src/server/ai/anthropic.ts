/**
 * Minimal Anthropic Messages API client using fetch (no SDK dependency, server-only).
 * Forces a single tool call so output is always structured JSON.
 */
import { SYSTEM_PROMPT, TOOL_INPUT_SCHEMA, TOOL_NAME } from '../../core/ai-contract.ts';
import type { Lang } from '../../core/types.ts';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  baseUrl?: string;
}

export interface ToolCallResult { ok: true; input: unknown; usage?: { input_tokens: number; output_tokens: number } }
export interface ToolCallError { ok: false; error: string; status?: number }

const API = 'https:' + '//api.anthropic.com/v1/messages';

export async function callItineraryTool(
  cfg: AnthropicConfig,
  lang: Lang,
  catalogContext: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<ToolCallResult | ToolCallError> {
  const f = cfg.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 45000);
  try {
    const res = await f(cfg.baseUrl ?? API, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 4096,
        temperature: 0.4,
        system: [{ type: 'text', text: SYSTEM_PROMPT(lang) }, { type: 'text', text: catalogContext, cache_control: { type: 'ephemeral' } }],
        tools: [{ name: TOOL_NAME, description: 'Return the structured itinerary built only from catalogue ids.', input_schema: TOOL_INPUT_SCHEMA }],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: `Anthropic HTTP ${res.status}: ${text.slice(0, 300)}` };
    }
    const json = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[]; usage?: ToolCallResult['usage'] };
    const block = json.content?.find((c) => c.type === 'tool_use' && c.name === TOOL_NAME);
    if (!block) return { ok: false, error: 'Model did not call the itinerary tool' };
    return { ok: true, input: block.input, usage: json.usage };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'Anthropic request timed out' : String((e as Error).message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}
