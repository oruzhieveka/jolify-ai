/**
 * LLM provider abstraction. The rest of the app talks to `LlmProvider` only, so switching
 * vendor/model is an env change, not a code change. Server-only: keys never reach the browser.
 *
 *   AI_PROVIDER=anthropic          AI_API_KEY (or ANTHROPIC_API_KEY), AI_MODEL (default claude-sonnet-4-5)
 *   AI_PROVIDER=openai_compatible  AI_API_KEY, AI_MODEL (required), AI_BASE_URL (required)
 *       works with any /chat/completions endpoint that supports tools + streaming
 *       (e.g. OpenAI, OpenRouter, Groq, Google Gemini's OpenAI-compatible endpoint, Mistral).
 */
import type { Lang } from '../../core/types.ts';
import { callItineraryTool, type AnthropicConfig, type ToolCallError, type ToolCallResult } from './anthropic.ts';
import { openAiCallTool, openAiStreamChat, type OpenAiConfig } from './openai-compatible.ts';
import { anthropicStreamChat } from './anthropic-chat.ts';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export interface LlmProvider {
  readonly id: 'anthropic' | 'openai_compatible';
  readonly model: string;
  /** Forces one structured tool call (itinerary JSON). */
  callTool(lang: Lang, catalogContext: string, messages: ChatTurn[]): Promise<ToolCallResult | ToolCallError>;
  /** Streams plain-text assistant tokens. Throws LlmError on HTTP/network failure. */
  streamChat(system: string, messages: ChatTurn[], signal?: AbortSignal): AsyncIterable<string>;
}

export type LlmErrorCode = 'unauthorized' | 'rate_limited' | 'unavailable' | 'timeout' | 'bad_response';
export class LlmError extends Error {
  code: LlmErrorCode; status?: number;
  constructor(code: LlmErrorCode, message: string, status?: number) { super(message); this.code = code; this.status = status; }
}
export const httpCode = (s: number): LlmErrorCode => (s === 401 || s === 403 ? 'unauthorized' : s === 429 ? 'rate_limited' : s >= 500 ? 'unavailable' : 'bad_response');

export function anthropicProvider(cfg: AnthropicConfig): LlmProvider {
  return {
    id: 'anthropic', model: cfg.model,
    callTool: (lang, ctx, messages) => callItineraryTool(cfg, lang, ctx, messages),
    streamChat: (system, messages, signal) => anthropicStreamChat(cfg, system, messages, signal),
  };
}

export function openAiProvider(cfg: OpenAiConfig): LlmProvider {
  return {
    id: 'openai_compatible', model: cfg.model,
    callTool: (lang, ctx, messages) => openAiCallTool(cfg, lang, ctx, messages),
    streamChat: (system, messages, signal) => openAiStreamChat(cfg, system, messages, signal),
  };
}

export interface AiEnv { AI_PROVIDER?: string; AI_API_KEY?: string; AI_MODEL?: string; AI_BASE_URL?: string; ANTHROPIC_API_KEY?: string; ANTHROPIC_MODEL?: string }

/** Returns null when no provider is configured. Callers must then say so; they must not fake an answer. */
export function providerFromEnv(e: AiEnv): LlmProvider | null {
  const p = (e.AI_PROVIDER || (e.ANTHROPIC_API_KEY ? 'anthropic' : '')).toLowerCase();
  if (p === 'anthropic') {
    const apiKey = e.AI_API_KEY || e.ANTHROPIC_API_KEY;
    return apiKey ? anthropicProvider({ apiKey, model: e.AI_MODEL || e.ANTHROPIC_MODEL || 'claude-sonnet-4-5' }) : null;
  }
  if (p === 'openai_compatible') {
    if (!e.AI_API_KEY || !e.AI_MODEL || !e.AI_BASE_URL) return null;
    if (!/^https:\/\//.test(e.AI_BASE_URL)) throw new Error('[ai] AI_BASE_URL must be https');
    return openAiProvider({ apiKey: e.AI_API_KEY, model: e.AI_MODEL, baseUrl: e.AI_BASE_URL.replace(/\/$/, '') });
  }
  return null;
}
