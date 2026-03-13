import { test, expect } from '@playwright/test';

test('quick create deal works in mock mode board flow', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.goto('/deals');
  await page.getByRole('button', { name: 'Новая сделка' }).click();
  await page.getByLabel('Название сделки').fill('Mock regression deal');
  await page.getByLabel('Клиент').selectOption({ index: 1 });
  await page.getByLabel('Этап').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Создать сделку' }).click();
  await expect(page).toHaveURL(/\/deals\//);
});

test('locked settings section explains admin mode requirement', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.goto('/settings/team');
  await expect(page.getByText(/админ-режимом|админ-режим/i)).toBeVisible();
});
