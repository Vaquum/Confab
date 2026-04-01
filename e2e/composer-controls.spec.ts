import { expect, test } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

test('stop button aborts in-flight request and cleans up sidebar', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  let releaseRequest: (() => void) | null = null;

  await page.route('**/api/opinions', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fallback();
      return;
    }
    await new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    try {
      await route.abort();
    } catch {}
  });

  await page.goto('/');

  await page.locator('#input').fill('Hello world');
  await page.keyboard.press('Enter');

  const btnSend = page.locator('#btnSend');
  await expect(btnSend.locator('svg rect')).toBeVisible();

  await btnSend.click();

  await expect(page.locator('#messageContainer')).toContainText('Stopped.');
  await expect(page.locator('#pendingSidebarEntry')).toHaveCount(0);

  releaseRequest?.();
});

test('new chat appears in sidebar immediately on send', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  let releaseRequest: (() => void) | null = null;

  await page.route('**/api/opinions', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fallback();
      return;
    }
    await new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await route.fallback();
  });

  await page.goto('/');

  await page.locator('#input').fill('My instant sidebar test');
  await page.keyboard.press('Enter');

  await expect(page.locator('#pendingSidebarEntry')).toBeVisible();
  await expect(page.locator('#chatList')).toContainText('My instant sidebar test');

  releaseRequest?.();

  await expect(page.locator('#pendingSidebarEntry')).toHaveCount(0);
  await expect(page.locator('#chatList')).toContainText('My instant sidebar test');
});
