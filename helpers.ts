import { expect, type Page } from '@playwright/test';

export type DemoRole = 'traveler' | 'partner' | 'admin';

/** Demo-mode sign in: the login page shows one button per demo account. */
export async function signInAs(page: Page, role: DemoRole, next = '/en') {
  await page.goto('/en/login?next=' + encodeURIComponent(next));
  await page.getByTestId('demo-' + role).click();
  await page.waitForURL((u) => u.pathname === next || u.pathname.startsWith(next));
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}

/** A date N days from today as YYYY-MM-DD (booking requests must be in the future). */
export function futureDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export async function expectDemoBanner(page: Page) {
  await expect(page.getByTestId('demo-banner')).toBeVisible();
}
