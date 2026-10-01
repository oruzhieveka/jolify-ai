import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint runs separately (`npm run lint`) so a style warning can never block a deploy.
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : [] },
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
};

export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, { silent: true, org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT })
  : config;
