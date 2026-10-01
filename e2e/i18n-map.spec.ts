import { expect, test } from '@playwright/test';

test('language switch keeps the current page', async ({ page }) => {
  await page.goto('/en/destinations');
  await page.getByRole('group', { name: 'Language' }).getByRole('link', { name: 'RU' }).click();
  await expect(page).toHaveURL(/\/ru\/destinations$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.goto('/');
  await expect(page).toHaveURL(/\/ru$/); // choice remembered in a cookie
});

test('map page loads a map or an honest error state', async ({ page }) => {
  await page.goto('/en/map');
  // Real tiles need network access to the configured provider; either outcome must be visible.
  await expect(page.locator('canvas.maplibregl-canvas, [role="alert"]').first()).toBeVisible({ timeout: 20_000 });
});
