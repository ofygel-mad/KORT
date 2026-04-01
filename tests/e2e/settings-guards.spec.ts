import { expect, test } from '@playwright/test';
import { clearSession, preparePage } from './helpers';

test('pending first-login employee is redirected to set password step', async ({ page }) => {
  await clearSession(page);
  await preparePage(page);
  await page.goto('/auth/login');

  const fields = page.locator('form input:not([type="checkbox"])');
  await expect(fields).toHaveCount(2);
  await fields.nth(0).fill('+77010000003');
  await fields.nth(1).fill('+77010000003');
  await page.locator('form button[type="submit"]').click();

  await expect(page.locator('input[type="password"]')).toHaveCount(2);
  await expect(page.locator('[class*="submitBtn"]')).toBeVisible();
});
