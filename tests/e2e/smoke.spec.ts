import { test, expect } from '@playwright/test';

test('auth page opens', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page).toHaveURL(/auth\/login/);
});
