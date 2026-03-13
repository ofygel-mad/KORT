import { test, expect } from '@playwright/test';

test('customer card can be edited from drawer', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.goto('/customers/1');
  await page.getByRole('button', { name: 'Изменить' }).click();
  await page.getByLabel('Имя и фамилия').fill('Тестовый клиент обновлён');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Тестовый клиент обновлён')).toBeVisible();
});

test('deal card can be edited from drawer', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('owner@demo.kz');
  await page.getByLabel('Пароль').fill('password');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.goto('/deals/1');
  await page.getByRole('button', { name: 'Редактировать' }).click();
  await page.getByLabel('Название').fill('Сделка обновлена');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Сделка обновлена')).toBeVisible();
});
