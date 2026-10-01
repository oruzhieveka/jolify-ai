import { expect, test } from '@playwright/test';
import { signInAs, signOut } from './helpers';

test('partner application requires consent and is approved by an admin', async ({ page }) => {
  const name = 'E2E Yurts ' + Date.now();
  await signInAs(page, 'traveler', '/en/partner');
  await page.locator('#pa-business_name').fill(name);
  await page.locator('#pa-city').fill('Kochkor');
  await page.locator('#pa-contact_name').fill('Asel');
  await page.locator('#pa-phone').fill('+996 555 123 456');
  await page.locator('#pa-email').fill('asel@example.com');
  await page.locator('#pa-description').fill('Family yurt camp near Song-Kul with home cooking.');
  await expect(page.getByTestId('apply-submit')).toBeDisabled(); // required consents not ticked
  for (const k of ['partner_terms', 'data_processing', 'listing_accuracy']) await page.getByTestId('consent-' + k).check();
  await page.getByTestId('apply-submit').click();
  await expect(page.getByTestId('apply-done')).toBeVisible();

  await signOut(page);
  await signInAs(page, 'admin', '/en/admin');
  const card = page.getByTestId('application').filter({ hasText: name });
  await expect(card).toContainText('policy 2026-10-01');
  await card.getByRole('button', { name: /approve/i }).click();
  await expect(page.getByTestId('application').filter({ hasText: name })).toHaveCount(0); // leaves the pending queue
});

test('non-admins cannot open the admin dashboard data', async ({ page }) => {
  await signInAs(page, 'traveler', '/en/admin');
  await expect(page.getByRole('button', { name: /approve/i })).toHaveCount(0);
  const r = await page.request.get('/api/admin/summary'); // shares the traveller's cookies
  expect(r.status()).toBe(403);
});

test('a new partner listing is hidden until an admin approves it', async ({ page }) => {
  const title = 'E2E listing ' + Date.now();
  await signInAs(page, 'partner', '/en/partner/dashboard');
  const created = await page.request.post('/api/partner/listings', {
    data: { partner_id: 'p-nomad', title, category: 'yurt', destination_id: 'song-kul', price_usd: 31, price_unit: 'person-night', description: 'Yurt with dinner and breakfast by the lake shore.' },
  });
  expect(created.status()).toBe(201);
  const body = await created.json();
  const id = body.listing?.id ?? body.id;
  expect((await page.goto('/en/listings/' + id))?.status()).toBe(404);

  await signOut(page);
  await signInAs(page, 'admin', '/en/admin');
  await page.getByTestId('pending-listing').filter({ hasText: title }).getByRole('button', { name: /approve/i }).click();
  await expect(page.getByTestId('pending-listing').filter({ hasText: title })).toHaveCount(0);
  const res = await page.goto('/en/listings/' + id);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});
