import { test, expect } from '@playwright/test';

test('create customer opens card after submit', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('button', { name: 'Новый клиент' }).click();
  await page.getByLabel('Имя и фамилия').fill('Тестовый Клиент');
  await page.getByLabel('Телефон').fill('+7 701 555 44 33');
  await page.getByRole('button', { name: 'Создать клиента' }).click();
  await expect(page).toHaveURL(/\/customers\//);
  await expect(page.getByText('Тестовый Клиент')).toBeVisible();
});

test('create deal opens card after submit', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('button', { name: 'Новая сделка' }).click();
  await page.getByLabel('Название сделки').fill('Тестовая сделка');
  await page.getByLabel('Клиент').selectOption({ index: 1 });
  await page.getByLabel('Этап сделки').selectOption({ index: 1 });
  await page.getByLabel('Сумма').fill('250000');
  await page.getByRole('button', { name: 'Создать сделку' }).click();
  await expect(page).toHaveURL(/\/deals\//);
  await expect(page.getByText('Тестовая сделка')).toBeVisible();
});
