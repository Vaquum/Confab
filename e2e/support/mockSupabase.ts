import type { Page } from '@playwright/test';

type SupabaseMockOptions = {
  authenticated?: boolean;
  email?: string;
  userId?: string;
  accessToken?: string;
};

function buildMockSession(options: SupabaseMockOptions): Record<string, unknown> | null {
  if (options.authenticated === false) {
    return null;
  }
  return {
    access_token: options.accessToken ?? 'pw-access-token',
    token_type: 'bearer',
    user: {
      id: options.userId ?? 'pw-user-1',
      email: options.email ?? 'tester@example.com',
    },
  };
}

function buildSupabaseStub(session: Record<string, unknown> | null): string {
  return `
(() => {
  const listeners = [];
  let currentSession = ${JSON.stringify(session)};

  function notify(event, session) {
    for (const callback of listeners) {
      try {
        callback(event, session);
      } catch (_error) {}
    }
  }

  window.__pwSetSupabaseSession = (session) => {
    currentSession = session;
    notify(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  };

  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() {
            return { data: { session: currentSession }, error: null };
          },
          onAuthStateChange(callback) {
            listeners.push(callback);
            return {
              data: {
                subscription: {
                  unsubscribe() {}
                }
              }
            };
          },
          async signOut() {
            currentSession = null;
            notify('SIGNED_OUT', null);
            return { error: null };
          },
        },
      };
    },
  };
})();
`;
}

export async function installSupabaseMock(
  page: Page,
  options: SupabaseMockOptions = {},
): Promise<void> {
  const session = buildMockSession(options);
  const script = buildSupabaseStub(session);
  await page.route('**/@supabase/supabase-js@2*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: script,
    });
  });
}
