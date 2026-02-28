import { expect, test } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

test('runs consensus and PR streaming flows end-to-end', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/consensus Evaluate this launch plan');
  await page.keyboard.press('Enter');
  await expect(page.locator('#messageContainer')).toContainText(
    'Consensus summary: all mocked models align on the recommendation.',
  );
  await expect(page.locator('#chatList')).toContainText('consensus');

  await page.locator('button[title="New chat"]').click();
  await page.locator('#input').fill('/pr https://github.com/Vaquum/Confab/pull/2');
  await page.keyboard.press('Enter');
  await expect(page.locator('#messageContainer')).toContainText(
    'PR audit summary: no critical defects found in mocked review.',
  );
  await expect(page.locator('#chatList')).toContainText('pr');
});
