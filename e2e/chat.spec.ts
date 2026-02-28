import { expect, test } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

test('loads history, sends chat prompts, renames and deletes conversations', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page, {
    seedConversations: [
      {
        conversation_id: 'pw-seed-chat',
        mode: 'chat',
        title: 'Seed thread',
        prompt: 'Seed prompt',
        response: 'Seed response',
      },
    ],
  });

  await page.goto('/');

  await expect(page.locator('#authGate')).toBeHidden();
  await expect(page.locator('#chatList')).toContainText('Seed thread');

  await page.locator('.chat-item').first().click();
  await expect(page.locator('#messageContainer')).toContainText('Seed prompt');
  await expect(page.locator('#messageContainer')).toContainText('Seed response');

  await page.locator('#input').fill('How are we doing?');
  await page.keyboard.press('Enter');
  await expect(page.locator('#messageContainer')).toContainText(
    'Mock chat response for: How are we doing?',
  );

  await page.evaluate(() => {
    const el = document.querySelector('.chat-item-prompt');
    if (!el) {
      throw new Error('Missing chat title element');
    }
    (window as unknown as { startRename: (node: Element, id: string) => void }).startRename(
      el,
      'pw-seed-chat',
    );
  });
  const editor = page.locator('.chat-item-prompt.editing');
  await expect(editor).toBeVisible();
  await editor.fill('Renamed thread');
  await editor.blur();
  await expect
    .poll(
      () =>
        api.requests.some(
          (entry) =>
            entry.method === 'PATCH' &&
            entry.pathname === '/api/conversations/pw-seed-chat',
        ),
    )
    .toBeTruthy();
  await expect(page.locator('#chatList')).toContainText('Renamed thread');

  await page.locator('.chat-item-delete').first().click({ force: true });
  await expect(page.locator('#chatList')).toContainText('No chats yet.');
});
