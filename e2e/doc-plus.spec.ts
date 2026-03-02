import { expect, test, type Page } from '@playwright/test';

import { installMockApi } from './support/mockApi';
import { installSupabaseMock } from './support/mockSupabase';

async function finishDocPlusWizard(page: Page): Promise<void> {
  for (let step = 0; step < 5; step += 1) {
    await page.locator('#btnDocPlusNext').click();
  }
  await expect(page.locator('#btnDocPlusNext')).toHaveText('Finish');
  await page.locator('#btnDocPlusNext').click();
}

test('doc+ enter path opens wizard, submits profile context, and follows up without reopening', async ({
  page,
}) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc+ Draft launch memo');
  await page.keyboard.press('Enter');

  await expect(page.locator('#docPlusModal')).toBeVisible();
  await expect(page.locator('#docPlusStepCount')).toHaveText('Step 1 of 6');
  await page.locator('.doc-plus-select').first().selectOption('A');

  await finishDocPlusWizard(page);

  await expect(page.locator('#docPlusModal')).toBeHidden();
  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
        ).length,
    )
    .toBe(1);

  const postsAfterFirstSend = api.requests.filter(
    (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
  );
  const firstBody = postsAfterFirstSend[0].body as Record<string, unknown>;
  expect(firstBody.prompt).toBe('/doc+ Draft launch memo');
  expect(firstBody.conversation_id).toBeNull();
  expect(firstBody.doc_plus_context).not.toBeNull();
  const context = String(firstBody.doc_plus_context);
  const requiredMarkers = [
    'Meta:',
    'Whole:',
    'Section:',
    'Paragraph:',
    'Sentence:',
    'Word:',
    'Evidential texture:',
    'Rhetorical mode:',
    'Temporal orientation:',
    'Reflexivity:',
    'Implied reader:',
    'Conceptual framing:',
    'Connective texture:',
    'Arc:',
    'Tonal arc:',
    'Voice unity:',
    'Section weight:',
    'Section sequencing:',
    'Inter-section transition:',
    'Internal arc:',
    'Functional role:',
    'Idea density:',
    'Abstraction level:',
    'Internal structure:',
    'Paragraph length:',
    'Cohesion:',
    'Rhythm:',
    'Syntactic complexity:',
    'Information order:',
    'Agency:',
    'Epistemic stance:',
    'Economy:',
    'Precision:',
    'Lexical complexity:',
    'Connotative consistency:',
    'Register:',
  ];
  for (const marker of requiredMarkers) {
    expect(context).toContain(marker);
  }
  expect(context).toContain('Evidential texture: A:');

  await expect(page.locator('#docPane')).toHaveClass(/open/);
  await expect(page.locator('#chatList')).toContainText('doc+');

  await page.locator('#input').fill('Tighten section two');
  await page.keyboard.press('Enter');

  await expect(page.locator('#docPlusModal')).toBeHidden();
  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
        ).length,
    )
    .toBe(2);

  const postsAfterSecondSend = api.requests.filter(
    (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
  );
  const secondBody = postsAfterSecondSend[1].body as Record<string, unknown>;
  expect(secondBody.prompt).toBe('Tighten section two');
  expect(secondBody.conversation_id).toBeTruthy();
  expect(secondBody.doc_plus_context).toBeNull();
});

test('doc+ send-button path opens wizard and completes submission', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');

  await page.locator('#input').fill('/doc+ Prepare policy draft');
  await page.locator('#btnSend').click();

  await expect(page.locator('#docPlusModal')).toBeVisible();
  await finishDocPlusWizard(page);

  await expect(page.locator('#docPlusModal')).toBeHidden();
  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) => entry.method === 'POST' && entry.pathname === '/api/opinions',
        ).length,
    )
    .toBe(1);
  await expect(page.locator('#messageContainer')).toContainText('Document ready.');
});

test('doc+ wizard reuses last saved selections after refresh', async ({ page }) => {
  await installSupabaseMock(page, { authenticated: true, email: 'qa@example.com' });
  const api = await installMockApi(page);

  await page.goto('/');
  await page.locator('#input').fill('/doc+ First profile run');
  await page.keyboard.press('Enter');

  await expect(page.locator('#docPlusModal')).toBeVisible();
  await page.locator('.doc-plus-select').first().selectOption('A');
  await finishDocPlusWizard(page);

  await expect
    .poll(
      () =>
        api.requests.filter(
          (entry) => entry.method === 'PUT' && entry.pathname === '/api/settings',
        ).length,
    )
    .toBeGreaterThan(0);

  const settingsRequests = api.requests.filter(
    (entry) => entry.method === 'PUT' && entry.pathname === '/api/settings',
  );
  const lastSettingsBody = settingsRequests.at(-1)?.body as {
    settings?: Record<string, unknown>;
  };
  const docPlusSelections = (lastSettingsBody.settings?.docPlusSelections ??
    {}) as Record<string, unknown>;
  expect(docPlusSelections['Evidential texture']).toBe('A');

  await page.reload();
  await expect(page.locator('#authGate')).toBeHidden();

  await page.locator('#input').fill('/doc+ Second profile run');
  await page.keyboard.press('Enter');
  await expect(page.locator('#docPlusModal')).toBeVisible();
  await expect(page.locator('.doc-plus-select').first()).toHaveValue('A');
});
