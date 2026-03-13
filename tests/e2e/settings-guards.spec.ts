import { test, expect } from '@playwright/test';

test('protected settings sections stay unavailable without admin mode', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.goto('/settings/team');
  await expect(page.getByText(/включите админ-режим|режим администратора/i)).toBeVisible();
  await page.getByRole('button', { name: /режим администратора|рабочий режим/i }).click();
  await page.goto('/settings/team');
  await expect(page.getByText('Участники команды')).toBeVisible();
});
