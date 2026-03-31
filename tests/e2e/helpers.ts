import { expect, type Page } from '@playwright/test';

async function setInputValue(page: Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function triggerClickByRole(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

export async function preparePage(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('kort.workspace:intro-v1', '1');
  });
}

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  // Navigate to the app to get same-origin window context, then clear storage
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

export async function navigateWithinApp(page: Page, route: string) {
  await page.evaluate((nextRoute) => {
    window.history.pushState({}, '', nextRoute);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}

export async function loginAs(page: Page, email: string, password = 'demo') {
  // Clear cookies first
  await page.context().clearCookies();

  // Navigate to login page; the app may redirect us away if localStorage still has tokens
  await preparePage(page);
  await page.goto('/auth/login', { waitUntil: 'load' });

  // Now we have a window context — clear storage and reload so the app starts fresh
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem('kort.workspace:intro-v1', '1');
  });

  // Reload so the app re-reads the now-empty storage and stays on the login page
  await page.reload({ waitUntil: 'load' });

  // Wait for form elements to be visible before interacting
  await expect(page.getByPlaceholder('Email или номер телефона')).toBeVisible({ timeout: 10000 });

  await setInputValue(page, 'Email или номер телефона', email);
  await setInputValue(page, 'Пароль', password);
  await triggerClickByRole(page, 'Войти');
  await expect(page).not.toHaveURL(/\/auth\/login/);
}
