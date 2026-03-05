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

test('keeps preview consistent with current document before edit acceptance', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPane')).toHaveClass(/open/);

  await page.locator('#btnDocEdit').click();
  await page.locator('#btnDocPreview').click();
  await expect(page.locator('#docContent')).toContainText('Initial draft.');

  await page.locator('#input').fill('/doc propose edits');
  await page.keyboard.press('Enter');
  await expect(page.locator('.edit-card').first()).toBeVisible();
  await expect(page.locator('#docContent')).toContainText('Initial draft.');

  await page.locator('#docContent').evaluate((node) => {
    node.innerHTML = '<p>Initial draft improved.</p>';
  });
  await expect(page.locator('#docContent')).toContainText('Initial draft improved.');

  await page.locator('#btnDocEdit').click();
  await page.locator('#btnDocPreview').click();
  await expect(page.locator('#docContent')).toContainText('Initial draft.');
  await expect(page.locator('#docContent')).not.toContainText('Initial draft improved.');
});

test('appends explicit end-insert edits at document end', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPane')).toHaveClass(/open/);

  await page
    .locator('#input')
    .fill('/doc propose edits to append a short call-to-action at the end');
  await page.keyboard.press('Enter');
  await expect(page.locator('.edit-card').first()).toBeVisible();

  await page.locator('.btn-accept').first().click();
  await expect(page.locator('#docContent')).toContainText('Initial draft.');
  await expect(page.locator('#docContent')).toContainText('Try this:');
});

test('marks insertion edits as conflict when context anchor is missing', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPane')).toHaveClass(/open/);

  await page.locator('#input').fill('/doc propose edits for conflict insertion');
  await page.keyboard.press('Enter');
  const card = page.locator('.edit-card').first();
  await expect(card).toBeVisible();

  await card.locator('.btn-accept').click();
  await expect(card.locator('.edit-status')).toHaveText('Conflict');
  await expect(card).toHaveClass(/declined/);
  await expect(page.locator('#docContent')).not.toContainText('Insertion conflict:');
});

test('marks replacement edits as conflict when old text is missing', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPane')).toHaveClass(/open/);

  await page.locator('#input').fill('/doc propose edits for conflict replacement');
  await page.keyboard.press('Enter');
  const card = page.locator('.edit-card').first();
  await expect(card).toBeVisible();

  await card.locator('.btn-accept').click();
  await expect(card.locator('.edit-status')).toHaveText('Conflict');
  await expect(card).toHaveClass(/declined/);
  await expect(page.locator('#docContent')).not.toContainText('Replacement conflict:');
});

test('keeps preview deterministic when the accepted document is empty', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc Create a release note');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPane')).toHaveClass(/open/);

  await page.locator('#btnDocEdit').click();
  await page.locator('#docEditor').evaluate((node) => {
    const editor = node as HTMLTextAreaElement;
    editor.value = '';
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
            entry.method === 'PUT'
            && entry.pathname.endsWith('/document')
            && (entry.body as { document?: string }).document === '',
        ).length,
    )
    .toBeGreaterThan(0);

  await page.locator('#docContent').evaluate((node) => {
    node.innerHTML = '<p>Stale preview text</p>';
  });
  await page.locator('#btnDocPreview').click();

  await expect(page.locator('#docContent')).not.toContainText('Stale preview text');
  await expect(page.locator('#docContent')).toHaveText('');
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
