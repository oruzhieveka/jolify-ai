'use client';
import { track } from '@/lib/client';

export function OutboundLink({ href, className, children, event }: { href: string; className?: string; children: React.ReactNode; event: Record<string, unknown> }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => track('open_in_maps_clicked', event)}>{children}</a>;
}
