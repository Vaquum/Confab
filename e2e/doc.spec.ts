import { expect, test } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

test('supports document creation, editing, saving, and proposal acceptance', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');

  await expect(page.locator('#docPane')).toHaveClass(/open/);
  await expect(page.locator('#docContent')).toContainText('Test Document');

  await page.locator('#btnDocEdit').click();
  await page.locator('#docEditor').evaluate((node) => {
    const editor = node as HTMLTextAreaElement;
    editor.value = `${editor.value}\n\nLocally edited sentence.`;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(page.locator('#docSaveStatus')).toContainText('Saved', {
    timeout: 8_000,
  });
  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) =>
            entry.method === 'PUT' && entry.pathname.endsWith('/document'),
        ).length,
    )
    .toBeGreaterThan(0);

  await page.locator('#input').fill('/doc propose edits');
  await page.keyboard.press('Enter');
  await expect(page.locator('.edit-card').first()).toBeVisible();

  await page.locator('.btn-accept').first().click();
  await expect(page.locator('#docContent')).toContainText('Initial draft improved.');
});

test('opens doc mode when using locked /doc token', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').type('/doc');
  await page.keyboard.press('Space');
  await page.locator('#input').type('Create a locked doc');
  await page.keyboard.press('Enter');

  await expect(page.locator('#docPane')).toHaveClass(/open/);
  await expect(page.locator('#docContent')).toContainText('Test Document');

  const docRequest = api.requests.find(
    (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
  );
  expect(docRequest).toBeTruthy();
  expect(docRequest?.body).toMatchObject({ mode: 'doc' });
});
