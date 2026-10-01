'use client';
/** Small fetch helper for client components: JSON in, JSON out, errors surfaced as messages. */
export async function api<T = any>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<{ ok: boolean; status: number; data: T & { error?: string; code?: string; details?: unknown } }> {
  try {
    const r = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({ error: 'Unexpected server response', code: 'server' }));
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error', code: 'network' } as any };
  }
}

export function track(type: string, props: Record<string, unknown> = {}) {
  const body = JSON.stringify({ type, props });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}
