import { expect, test } from '@playwright/test';
import { expectDemoBanner } from './helpers';

const PAGES = ['/en', '/en/plan', '/en/destinations', '/en/destinations/karakol', '/en/map', '/en/marketplace/stay', '/en/listings/l-chui', '/en/partner', '/en/login', '/en/legal/privacy'];

test('root redirects to a locale', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(en|ru|ky)$/);
});

for (const p of PAGES) {
  test('renders ' + p, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(p);
    expect(res?.status()).toBe(200);
    await expectDemoBanner(page);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors, 'uncaught browser errors').toEqual([]);
  });
}

test('unknown destination is a 404', async ({ page }) => {
  const res = await page.goto('/en/destinations/atlantis');
  expect(res?.status()).toBe(404);
});

test('health endpoint reports demo mode honestly', async ({ request }) => {
  const r = await request.get('/api/health');
  expect(r.ok()).toBeTruthy();
  expect(JSON.stringify(await r.json())).toMatch(/demo/i);
});
