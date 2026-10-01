import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') { const { assertEnv } = await import('./lib/env'); assertEnv(); }
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // Sentry is optional; nothing is sent without a DSN
  Sentry.init({ dsn, tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1), environment: process.env.CONTEXT ?? process.env.NODE_ENV });
}
export const onRequestError = Sentry.captureRequestError;
