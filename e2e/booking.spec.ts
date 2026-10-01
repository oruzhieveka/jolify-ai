import { expect, test } from '@playwright/test';
import { futureDate, signInAs, signOut } from './helpers';

test('booking request stays pending until the partner confirms', async ({ page }) => {
  const note = 'E2E request ' + Date.now();
  await signInAs(page, 'traveler', '/en/listings/l-chui');
  await page.locator('#sd').fill(futureDate(30));
  await page.locator('#ed').fill(futureDate(33));
  await page.locator('#gu').fill('2');
  await page.locator('#msg').fill(note);
  await page.getByRole('button', { name: /send booking request/i }).click();
  await expect(page.getByTestId('inquiry-sent')).toBeVisible();

  await page.goto('/en/trips');
  const mine = page.getByTestId('booking').filter({ hasText: note });
  await expect(mine.getByTestId('booking-status')).toHaveText(/pending/i);
  await expect(mine.getByRole('button', { name: /^confirm$/i })).toHaveCount(0); // travellers cannot confirm

  await signOut(page);
  await signInAs(page, 'partner', '/en/partner/dashboard');
  const req = page.getByTestId('booking').filter({ hasText: note });
  await req.getByRole('button', { name: /^confirm$/i }).click();
  await expect(req.getByTestId('booking-status')).toHaveText(/confirmed/i);

  await signOut(page);
  await signInAs(page, 'traveler', '/en/trips');
  await expect(page.getByTestId('booking').filter({ hasText: note }).getByTestId('booking-status')).toHaveText(/confirmed/i);
});
