import { expect, test } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

test('persists typography settings through backend settings API', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page, {
    initialSettings: {
      fontFamily: 'system',
      fontSize: 15,
      lineHeight: 1.75,
    },
  });

  await page.goto('/');
  await page.locator('#btnTypography').click();

  await page.locator('#typo-size').evaluate((node) => {
    const slider = node as HTMLInputElement;
    slider.value = '18';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) =>
            entry.method === 'PUT' && entry.pathname === '/api/settings',
        ).length,
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => String(api.state.settings.fontSize))
    .toBe('18');

  await page.reload();
  await page.locator('#btnTypography').click();
  await expect(page.locator('#typo-size-value')).toHaveText('18px');
  await expect(page.locator('#typo-size')).toHaveValue('18');
});
