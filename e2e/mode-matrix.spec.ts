import { expect, test, type Page } from '@playwright/test';

import { MODE_MATRIX_CASES, type ModeMatrixCase } from './core-paths';
import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

async function submitPrompt(
  page: Page,
  prompt: string,
  sendWith: ModeMatrixCase['sendWith'],
): Promise<void> {
  await page.locator('#input').fill(prompt);
  if (sendWith === 'button') {
    await page.locator('#btnSend').click();
    return;
  }
  await page.keyboard.press('Enter');
}

async function finishDocPlusWizard(page: Page): Promise<void> {
  for (let step = 0; step < 5; step += 1) {
    await page.locator('#btnDocPlusNext').click();
  }
  await expect(page.locator('#btnDocPlusNext')).toHaveText('Finish');
  await page.locator('#btnDocPlusNext').click();
}

for (const scenario of MODE_MATRIX_CASES) {
  test(`mode matrix: ${scenario.id}`, async ({ page }) => {
    await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
    const api = await installMockApi(page);

    await page.goto('/');
    await submitPrompt(page, scenario.prompt, scenario.sendWith);

    if (scenario.requiresDocPlusWizard) {
      await expect(page.locator('#docPlusModal')).toBeVisible();
      await finishDocPlusWizard(page);
      await expect(page.locator('#docPlusModal')).toBeHidden();
    }

    await expect
      .poll(
        () =>
          api.requests.filter(
            (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
          ).length,
      )
      .toBe(1);

    await expect(page.locator('#messageContainer')).toContainText(
      scenario.expectedResponseText,
    );
    if (scenario.persistsConversation === false) {
      await expect(page.locator('#chatList .chat-item')).toHaveCount(0);
    } else if (scenario.expectedModeBadge) {
      await expect(page.locator('#chatList')).toContainText(scenario.expectedModeBadge);
    }

    if (scenario.opensDocPane) {
      await expect(page.locator('#docPane')).toHaveClass(/open/);
    }

    const postRequest = api.requests.find(
      (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
    );
    expect(postRequest).toBeTruthy();
    const body = postRequest?.body as Record<string, unknown>;
    expect(body.prompt).toBe(scenario.prompt);

    if (scenario.requiresDocPlusWizard) {
      expect(body.doc_plus_context).toBeTruthy();
    } else {
      expect(body.doc_plus_context).toBeNull();
    }
  });
}
