/**
 * AI orchestration: LLM provider (Anthropic) when configured, deterministic rules provider otherwise.
 * Every itinerary returned to a client has passed validateItinerary against the catalogue.
 */
import { Catalog } from '../../core/catalog.ts';
import { catalogContext, hydrate, toSkeleton } from '../../core/ai-contract.ts';
import { parseRequest, type ParsePrefs } from '../../core/parse.ts';
import { planTrip } from '../../core/planner.ts';
import { modifyTrip } from '../../core/modify.ts';
import { validateItinerary } from '../../core/validate.ts';
import { msg } from '../../core/messages.ts';
import type { Itinerary, Lang } from '../../core/types.ts';
import type { AnthropicConfig } from './anthropic.ts';
import { anthropicProvider, type LlmProvider } from './provider.ts';

export type Provider = 'anthropic' | 'openai_compatible' | 'rules';
export interface AiDeps {
  anthropic: AnthropicConfig | null; // legacy shortcut; prefer `llm`
  llm?: LlmProvider | null;          // null/undefined + anthropic null => rules provider (labelled in UI)
  track?: (type: string, props?: Record<string, unknown>) => void | Promise<void>;
}
export interface AiOutcome {
  ok: boolean;
  itinerary: Itinerary | null;
  reply: string;
  provider: Provider;
  fallbackReason?: string;
  rejected: string[]; // validator errors from attempts that were NOT shown
  changed?: number[];
  applied?: boolean;
}

export async function planWithAi(cat: Catalog, text: string, lang: Lang, deps: AiDeps, prefs?: ParsePrefs): Promise<AiOutcome> {
  const req = parseRequest(cat, text, prefs);
  const rejected: string[] = [];
  const llm = llmOf(deps);
  await deps.track?.('ai_plan_requested', { lang, provider: llm?.id ?? 'rules' });
  if (llm) {
    const ctx = catalogContext(cat, req);
    const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: text }];
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await llm.callTool(lang, ctx, messages);
      if (!r.ok) { rejected.push(r.error); break; }
      const h = hydrate(cat, r.input, req, lang, `${llm.id}:${llm.model}`);
      const errs = h.it ? validateItinerary(cat, h.it).errors : h.errors;
      if (h.it && !errs.length) {
        await deps.track?.('ai_plan_succeeded', { provider: llm.id, attempt, days: h.it.days.length });
        return { ok: true, itinerary: h.it, provider: llm.id, rejected, reply: msg('created', lang, { days: h.it.days.length, title: h.it.trip_title, total: h.it.estimated_budget.amount, trav: h.it.travelers, budget: req.budget }) };
      }
      rejected.push(...errs);
      await deps.track?.('ai_validation_rejected', { attempt, errors: errs.slice(0, 5) });
      messages.push({ role: 'assistant', content: 'Previous tool call was rejected.' }, { role: 'user', content: `Your itinerary was rejected by the validator: ${errs.slice(0, 8).join('; ')}. Use only ids from the catalogue and call the tool again.` });
    }
    await deps.track?.('ai_plan_fallback', { reason: rejected[0]?.slice(0, 120) });
  }
  const it = planTrip(cat, req, lang);
  const v = validateItinerary(cat, it);
  if (!v.valid) {
    await deps.track?.('ai_plan_failed', { errors: v.errors.slice(0, 5) });
    return { ok: false, itinerary: null, provider: 'rules', rejected: [...rejected, ...v.errors], reply: msg('planFailed', lang, {}) };
  }
  await deps.track?.('ai_plan_succeeded', { provider: 'rules', days: it.days.length });
  return {
    ok: true, itinerary: it, provider: 'rules', rejected, fallbackReason: llm ? 'llm_output_rejected_or_unavailable' : 'no_llm_configured',
    reply: msg('created', lang, { days: it.days.length, title: it.trip_title, total: it.estimated_budget.amount, trav: it.travelers, budget: req.budget }),
  };
}

export async function modifyWithAi(cat: Catalog, current: Itinerary, instruction: string, lang: Lang, deps: AiDeps): Promise<AiOutcome> {
  await deps.track?.('ai_modify_requested', { lang });
  // The current itinerary came from the client: re-validate before trusting it.
  const cur = validateItinerary(cat, current);
  if (!cur.valid) return { ok: false, itinerary: null, provider: 'rules', rejected: cur.errors, reply: msg('staleItinerary', lang, {}) };
  const llm = llmOf(deps);

  // Deterministic edits first: they are exact, cheap and preserve untouched days.
  const rule = modifyTrip(cat, current, instruction, lang);
  if (rule.applied || !llm) {
    const v = validateItinerary(cat, rule.it);
    if (!v.valid) return { ok: false, itinerary: current, provider: 'rules', rejected: v.errors, reply: msg('changeInvalid', lang, {}), applied: false };
    if (rule.applied) await deps.track?.('ai_modify_applied', { provider: 'rules', intent: rule.intent });
    return { ok: true, itinerary: rule.it, provider: 'rules', rejected: [], reply: rule.reply, changed: rule.changed, applied: rule.applied };
  }

  // Free-form instruction: ask the LLM to edit the skeleton.
  const ctx = catalogContext(cat, current.request);
  const r = await llm.callTool(lang, ctx, [{
    role: 'user',
    content: `Current itinerary (ids only):\n${JSON.stringify(toSkeleton(current))}\n\nChange request: ${instruction}\nKeep every day the request does not mention exactly as it is.`,
  }]);
  if (!r.ok) return { ok: true, itinerary: current, provider: 'rules', rejected: [r.error], reply: rule.reply, applied: false };
  const h = hydrate(cat, r.input, current.request, lang, `${llm.id}:${llm.model}`, current.budget_target);
  const errs = h.it ? validateItinerary(cat, h.it).errors : h.errors;
  if (!h.it || errs.length) {
    await deps.track?.('ai_validation_rejected', { phase: 'modify', errors: errs.slice(0, 5) });
    return { ok: true, itinerary: current, provider: llm.id, rejected: errs, reply: msg('changeNotPossible', lang, {}), applied: false };
  }
  const changed = h.it.days.map((d, i) => (JSON.stringify(d) !== JSON.stringify(current.days[i]) ? d.day : 0)).filter(Boolean);
  await deps.track?.('ai_modify_applied', { provider: llm.id });
  return { ok: true, itinerary: h.it, provider: llm.id, rejected: [], reply: msg('updated', lang, { total: h.it.estimated_budget.amount }), changed, applied: true };
}

function llmOf(d: AiDeps): LlmProvider | null { return d.llm ?? (d.anthropic ? anthropicProvider(d.anthropic) : null); }
