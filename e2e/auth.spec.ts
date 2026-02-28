import { expect, test, type Page } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

async function readAllowedDomain(page: Page): Promise<string> {
  const badge = (await page.locator('#allowedDomainBadge').textContent()) ?? '';
  return badge.replace('@', '').trim();
}

test('shows auth gate and blocks disallowed email domains', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: false });
  const api = await installMockApi(page);

  await page.goto('/');
  const domain = await readAllowedDomain(page);

  await expect(page.locator('#authGate')).toBeVisible();
  await page.locator('#authEmail').fill('user@outside.com');
  await page.locator('#btnAuthMagicLink').click();

  await expect(page.locator('#authStatus')).toHaveText(
    `Only @${domain} emails are allowed.`,
  );
  const magicLinkRequests = api.requests.filter(
    (entry) => entry.pathname === '/api/auth/magic-link',
  );
  expect(magicLinkRequests).toHaveLength(0);

  await page.locator('#authEmail').fill(`user@${domain}`);
  await page.locator('#btnAuthMagicLink').click();
  await expect(page.locator('#authStatus')).toHaveText(
    'Check your email for the sign-in link.',
  );
  const sentRequest = api.requests.find(
    (entry) => entry.pathname === '/api/auth/magic-link',
  );
  expect(sentRequest).toBeTruthy();
  expect((sentRequest?.body as Record<string, unknown>).email).toBe(`user@${domain}`);
});

test('keeps magic-link button usable after network failure', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: false });
  await installMockApi(page);

  await page.route('**/api/auth/magic-link', async (route) => {
    await route.abort('failed');
  });

  await page.goto('/');
  const domain = await readAllowedDomain(page);

  await page.locator('#authEmail').fill(`qa@${domain}`);
  await page.locator('#btnAuthMagicLink').click();

  await expect(page.locator('#authStatus')).toHaveText(
    'Unable to reach auth service. Please try again.',
  );
  await expect(page.locator('#btnAuthMagicLink')).toBeEnabled();
});

test('supports sign-out transitions for authenticated sessions', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await expect(page.locator('#authGate')).toBeHidden();
  await expect(page.locator('#btnSignOut')).toBeVisible();

  await page.locator('#btnSignOut').click();
  await expect(page.locator('#authGate')).toBeVisible();
});
