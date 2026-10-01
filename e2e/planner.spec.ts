import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

test('plan → modify → save trip', async ({ page }) => {
  await signInAs(page, 'traveler', '/en/plan');
  await page.goto('/en/plan?q=' + encodeURIComponent('5 days, 2 people, mountains and lakes, mid budget'));
  await expect(page.getByTestId('trip-title')).toBeVisible({ timeout: 30_000 });
  const total1 = await page.getByTestId('trip-total').innerText();
  expect(total1).toMatch(/\$\d/);

  await page.getByTestId('planner-input').fill('make day 2 cheaper');
  await page.getByRole('button', { name: /^send$/i }).click();
  await expect(page.getByTestId('chat-log')).toContainText(/day 2/i, { timeout: 30_000 });

  await page.getByTestId('save-trip').click();
  await expect(page.getByTestId('save-trip')).toHaveText(/saved/i);
  await page.goto('/en/trips');
  await expect(page.getByTestId('saved-trip').first()).toBeVisible();
});

test('anonymous user is asked to sign in before saving', async ({ page }) => {
  await page.goto('/en/plan?q=' + encodeURIComponent('3 days culture in Bishkek'));
  await expect(page.getByTestId('trip-title')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/sign in to save/i)).toBeVisible();
});

test('AI endpoints reject cross-origin writes', async ({ request }) => {
  const r = await request.post('/api/ai/plan', { data: { text: '3 days', lang: 'en' }, headers: { origin: 'https:' + '//evil.example' } });
  expect(r.status()).toBe(403);
});
