'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ShellItem } from './shell';

export function PortalNav({ items, admin }: { items: ShellItem[]; admin: boolean }) {
  const path = usePathname() ?? '';
  // Longest matching prefix wins so /admin/listings does not also highlight /admin.
  const match = items.map((i) => i.href).filter((h) => path === h || path.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.href === match ? 'page' : undefined}
          className={'flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ' + (i.href === match
            ? (admin ? 'bg-apricot-500/15 text-apricot-500' : 'bg-white/10 text-snow')
            : 'text-snow/60 hover:bg-white/5 hover:text-snow')}>
          <span>{i.label}</span>
          {!!i.badge && <span className="rounded-full bg-apricot-500 px-1.5 text-[11px] font-semibold text-ink">{i.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
