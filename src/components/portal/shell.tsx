import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/brand/logo';
import { LangSwitch } from '@/components/lang-switch';
import { PortalNav } from './nav';

export interface ShellItem { href: string; label: string; badge?: number }

/**
 * Operational chrome shared by Partner Portal and Admin. Deliberately unlike the consumer site:
 * fixed dark sidebar, dense content area, no marketing header/footer.
 * variant="admin" also darkens the work area so the two portals are never confused.
 */
export function PortalShell({ locale, variant, title, items, siteLabel, signedIn, logoutLabel, children }: {
  locale: string; variant: 'partner' | 'admin'; title: string; items: ShellItem[]; siteLabel: string; signedIn: string; logoutLabel: string; children: React.ReactNode;
}) {
  const admin = variant === 'admin';
  return (
    <div className={'flex min-h-dvh flex-col lg:flex-row ' + (admin ? 'bg-night-900 text-snow' : 'bg-paper')}>
      <aside className={'shrink-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col ' + (admin ? 'border-b border-white/5 bg-night-800 lg:border-b-0 lg:border-r' : 'bg-ink')}>
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href={'/' + locale + (admin ? '/admin' : '/partner/dashboard')}><Logo tone="dark" size={26} sub={title} /></Link>
          <div className="lg:hidden"><Suspense fallback={null}><LangSwitch locale={locale} tone="dark" /></Suspense></div>
        </div>
        <PortalNav items={items} admin={admin} />
        <div className="hidden space-y-3 px-5 pb-6 pt-4 text-xs text-snow/50 lg:mt-auto lg:block">
          <Suspense fallback={null}><LangSwitch locale={locale} tone="dark" /></Suspense>
          <p className="truncate" title={signedIn}>{signedIn}</p>
          <div className="flex gap-3">
            <Link href={'/' + locale} className="hover:text-snow">{siteLabel}</Link>
            <form action="/api/auth/logout" method="post"><button className="hover:text-snow">{logoutLabel}</button></form>
          </div>
        </div>
        <div className="flex gap-4 px-4 pb-3 text-xs text-snow/50 lg:hidden">
          <Link href={'/' + locale} className="hover:text-snow">{siteLabel}</Link>
          <form action="/api/auth/logout" method="post"><button className="hover:text-snow">{logoutLabel}</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function PageHead({ title, intro, actions, admin }: { title: string; intro?: string; actions?: React.ReactNode; admin?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {intro && <p className={'mt-1 max-w-2xl text-sm ' + (admin ? 'text-snow/60' : 'text-ink/60')}>{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Metric tile. Missing values render as 0: portals never show invented numbers. */
export function Metric({ label, value, admin, hint }: { label: string; value: number | string | null | undefined; admin?: boolean; hint?: string }) {
  return (
    <div className={'rounded-2xl p-4 ' + (admin ? 'border border-white/5 bg-night-800' : 'border border-ink/10 bg-white')}>
      <div className={'text-xs ' + (admin ? 'text-snow/50' : 'text-ink/50')}>{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value ?? 0}</div>
      {hint && <div className={'mt-1 text-xs ' + (admin ? 'text-snow/40' : 'text-ink/40')}>{hint}</div>}
    </div>
  );
}

export function Panel({ children, admin, className }: { children: React.ReactNode; admin?: boolean; className?: string }) {
  return <section className={'rounded-2xl p-4 sm:p-5 ' + (admin ? 'border border-white/5 bg-night-800' : 'border border-ink/10 bg-white') + ' ' + (className ?? '')}>{children}</section>;
}

export function Forbidden({ title, body }: { title: string; body: string }) {
  return <div className="mx-auto max-w-md py-24 text-center"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 opacity-60">{body}</p></div>;
}

export function Table({ head, children, admin }: { head: string[]; children: React.ReactNode; admin?: boolean }) {
  return (
    <div className={'overflow-x-auto rounded-2xl ' + (admin ? 'border border-white/5 bg-night-800' : 'border border-ink/10 bg-white')}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className={admin ? 'text-snow/50' : 'text-ink/50'}>{head.map((h, i) => <th key={i} className="px-4 py-3 text-xs font-medium uppercase tracking-wide">{h}</th>)}</tr></thead>
        <tbody className={admin ? 'divide-y divide-white/5' : 'divide-y divide-ink/5'}>{children}</tbody>
      </table>
    </div>
  );
}
export const td = 'px-4 py-3 align-top';
