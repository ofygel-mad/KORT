import { test, expect } from '@playwright/test';

test('login screen exposes primary auth actions', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('button', { name: /Войти/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Регистрация/i })).toBeVisible();
});
