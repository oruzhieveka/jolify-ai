'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/client';

export function PageViewTracker() {
  const path = usePathname();
  useEffect(() => { track('page_view', { path }); }, [path]);
  return null;
}

/** Fires one analytics event when mounted (e.g. destination_viewed). */
export function TrackOnMount({ type, props }: { type: string; props?: Record<string, unknown> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => { track(type, props); }, [type, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
