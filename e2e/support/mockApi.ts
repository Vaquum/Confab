import type { Page, Request, Route } from '@playwright/test';

type ChatMode =
  | 'chat'
  | 'help'
  | 'gpt'
  | 'grok'
  | 'gemini'
  | 'consensus'
  | 'pr'
  | 'doc'
  | 'doc_plus';

const MOCK_HELP_REFERENCE = [
  '# Confab Modes Reference',
  '',
  'Use /help or /? to view this reference.',
  'Use /doc for document editing.',
].join('\n');

type ConversationMessage = {
  id: number;
  position: number;
  mode: ChatMode;
  prompt: string;
  response?: string;
  synthesis?: string;
  document?: string;
  created_at: string;
};

type Conversation = {
  conversation_id: string;
  mode: ChatMode;
  title: string;
  prompt: string;
  created_at: string;
  messages: ConversationMessage[];
};

type MockApiState = {
  settings: Record<string, unknown>;
  conversations: Map<string, Conversation>;
  nextConversationId: number;
  nextMessageId: number;
};

export type MockApiRequest = {
  method: string;
  pathname: string;
  body: unknown;
};

export type MockApiController = {
  state: MockApiState;
  requests: MockApiRequest[];
};

type SeedConversation = {
  conversation_id?: string;
  mode: ChatMode;
  title?: string;
  prompt: string;
  response?: string;
  synthesis?: string;
  document?: string;
};

type MockApiOptions = {
  initialSettings?: Record<string, unknown>;
  seedConversations?: SeedConversation[];
};

function nowIso(): string {
  return new Date().toISOString().replace('Z', '');
}

function parseMode(prompt: string): { mode: ChatMode | null; cleanPrompt: string } {
  const stripped = prompt.trim();
  const lower = stripped.toLowerCase();
  if (lower.startsWith('/help')) {
    return { mode: 'help', cleanPrompt: stripped.slice('/help'.length).trim() };
  }
  if (lower.startsWith('/?')) {
    return { mode: 'help', cleanPrompt: stripped.slice('/?'.length).trim() };
  }
  if (lower.startsWith('/doc+')) {
    return { mode: 'doc_plus', cleanPrompt: stripped.slice('/doc+'.length).trim() };
  }
  if (lower.startsWith('/doc')) {
    return { mode: 'doc', cleanPrompt: stripped.slice('/doc'.length).trim() };
  }
  if (lower.startsWith('/pr')) {
    return { mode: 'pr', cleanPrompt: stripped.slice('/pr'.length).trim() };
  }
  if (lower.startsWith('/consensus')) {
    return {
      mode: 'consensus',
      cleanPrompt: stripped.slice('/consensus'.length).trim(),
    };
  }
  if (lower.startsWith('@gpt')) {
    return { mode: 'gpt', cleanPrompt: stripped.slice('@gpt'.length).trim() };
  }
  if (lower.startsWith('@grok')) {
    return { mode: 'grok', cleanPrompt: stripped.slice('@grok'.length).trim() };
  }
  if (lower.startsWith('@gemini')) {
    return { mode: 'gemini', cleanPrompt: stripped.slice('@gemini'.length).trim() };
  }
  if (lower.startsWith('@claude')) {
    return { mode: 'chat', cleanPrompt: stripped.slice('@claude'.length).trim() };
  }
  return { mode: null, cleanPrompt: stripped };
}

function toSummary(conversation: Conversation): Record<string, unknown> {
  return {
    conversation_id: conversation.conversation_id,
    mode: conversation.mode,
    title: conversation.title,
    prompt: conversation.prompt,
    created_at: conversation.created_at,
  };
}

function toSseBody(events: Record<string, unknown>[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

function jsonResponse(route: Route, payload: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload),
  });
}

function createConversation(
  state: MockApiState,
  mode: ChatMode,
  prompt: string,
  cleanPrompt: string,
  title?: string,
): Conversation {
  const conversationId = `pw-conv-${state.nextConversationId}`;
  state.nextConversationId += 1;
  const createdAt = nowIso();
  const conversation: Conversation = {
    conversation_id: conversationId,
    mode,
    title: (title ?? cleanPrompt) || prompt || 'Untitled',
    prompt: prompt || cleanPrompt || 'Untitled',
    created_at: createdAt,
    messages: [],
  };
  state.conversations.set(conversationId, conversation);
  return conversation;
}

function appendMessage(
  state: MockApiState,
  conversation: Conversation,
  message: Omit<ConversationMessage, 'id' | 'position' | 'created_at'>,
): void {
  const row: ConversationMessage = {
    id: state.nextMessageId,
    position: conversation.messages.length,
    created_at: nowIso(),
    ...message,
  };
  state.nextMessageId += 1;
  conversation.messages.push(row);
}

function latestDocument(conversation: Conversation): string {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const candidate = conversation.messages[index].document;
    if (candidate) {
      return candidate;
    }
  }
  return '# Test Document\n\nInitial draft.';
}

function parseJsonBody(request: Request): unknown {
  const raw = request.postData();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function seedConversations(state: MockApiState, seeds: SeedConversation[]): void {
  for (const seed of seeds) {
    const conversation = createConversation(
      state,
      seed.mode,
      seed.prompt,
      seed.prompt,
      seed.title ?? seed.prompt,
    );
    if (seed.conversation_id) {
      state.conversations.delete(conversation.conversation_id);
      conversation.conversation_id = seed.conversation_id;
      state.conversations.set(seed.conversation_id, conversation);
    }
    appendMessage(state, conversation, {
      mode: seed.mode,
      prompt: seed.prompt,
      response: seed.response,
      synthesis: seed.synthesis,
      document: seed.document,
    });
  }
}

export async function installMockApi(
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApiController> {
  const state: MockApiState = {
    settings: options.initialSettings ?? {
      fontFamily: 'system',
      fontSize: 15,
      lineHeight: 1.75,
    },
    conversations: new Map<string, Conversation>(),
    nextConversationId: 1,
    nextMessageId: 1,
  };
  const requests: MockApiRequest[] = [];

  if (options.seedConversations && options.seedConversations.length > 0) {
    seedConversations(state, options.seedConversations);
  }

  await page.route('**/api/**', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const body = method === 'GET' ? null : parseJsonBody(request);

    requests.push({ method, pathname, body });

    if (pathname === '/api/auth/magic-link' && method === 'POST') {
      await jsonResponse(route, { ok: true });
      return;
    }

    if (pathname === '/api/settings' && method === 'GET') {
      await jsonResponse(route, { settings: state.settings });
      return;
    }
    if (pathname === '/api/settings' && method === 'PUT') {
      const payload = body as { settings?: Record<string, unknown> };
      state.settings = payload.settings ?? {};
      await jsonResponse(route, { ok: true });
      return;
    }

    if (pathname === '/api/opinions' && method === 'GET') {
      const list = Array.from(state.conversations.values())
        .map((conversation) => toSummary(conversation))
        .sort((left, right) =>
          String(right.created_at).localeCompare(String(left.created_at)),
        );
      await jsonResponse(route, list);
      return;
    }

    if (pathname === '/api/opinions' && method === 'POST') {
      const payload = body as {
        prompt?: string;
        conversation_id?: string | null;
        doc_plus_context?: string | null;
        mode?: ChatMode | null;
      };
      const prompt = (payload.prompt ?? '').trim();
      const parsed = parseMode(prompt);
      const requestedMode = payload.mode ?? parsed.mode;
      const cleanPrompt = parsed.cleanPrompt || prompt;

      let conversation: Conversation | undefined;
      if (payload.conversation_id) {
        conversation = state.conversations.get(payload.conversation_id) ?? undefined;
      }
      const mode = requestedMode ?? conversation?.mode ?? 'chat';

      if (mode === 'help') {
        await jsonResponse(route, {
          mode,
          conversation_id: payload.conversation_id ?? null,
          response: MOCK_HELP_REFERENCE,
        });
        return;
      }

      if (!conversation) {
        conversation = createConversation(state, mode, prompt, cleanPrompt);
      }

      if (mode === 'doc_plus' && conversation.messages.length === 0) {
        const profile = (payload.doc_plus_context ?? '').trim();
        if (!profile) {
          await jsonResponse(route, { detail: 'doc+ profile is required' }, 400);
          return;
        }
      }

      if (mode === 'consensus' || mode === 'pr') {
        const responseText =
          mode === 'pr'
            ? 'PR audit summary: no critical defects found in mocked review.'
            : 'Consensus summary: all mocked models align on the recommendation.';
        appendMessage(state, conversation, {
          mode,
          prompt,
          synthesis: responseText,
        });

        const events: Record<string, unknown>[] = [];
        if (mode === 'pr') {
          events.push({ event: 'fetching_pr' });
          events.push({ event: 'pr_fetched' });
        }
        events.push({ event: 'models_started' });
        for (const model of ['claude', 'gpt', 'grok', 'gemini']) {
          events.push({ event: 'model_done', model });
        }
        events.push({ event: 'synthesizing' });
        events.push({
          event: 'done',
          mode,
          conversation_id: conversation.conversation_id,
          response: responseText,
          individual: {
            claude: 'Mock Claude analysis',
            gpt: 'Mock GPT analysis',
            grok: 'Mock Grok analysis',
            gemini: 'Mock Gemini analysis',
          },
          errors: {},
        });

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream; charset=utf-8',
          body: toSseBody(events),
        });
        return;
      }

      if (mode === 'doc' || mode === 'doc_plus') {
        const currentDocument = latestDocument(conversation);
        const wantsEdits = /edit|revise|improve|change|propose/i.test(cleanPrompt);
        if (wantsEdits) {
          const wantsEndInsert = /end|bottom|append/i.test(cleanPrompt);
          const edits = wantsEndInsert
            ? [
                {
                  context_before: 'Initial draft sentence in prior paragraph.',
                  old: '',
                  new: '\n\n* * *\n\n**Try this:** Keep one ending thought that points to the next concrete action.',
                  context_after: '',
                  description: 'Add decorative separator and call-to-action at end',
                },
              ]
            : [
                {
                  context_before: '# Test Document\n\n',
                  old: 'Initial draft.',
                  new: 'Initial draft improved.',
                  context_after: '',
                  description: 'Improve draft sentence',
                },
              ];
          appendMessage(state, conversation, {
            mode,
            prompt,
            response: 'Proposed targeted edits.',
            document: currentDocument,
          });
          await jsonResponse(route, {
            mode,
            conversation_id: conversation.conversation_id,
            response: 'Proposed targeted edits.',
            edits,
          });
          return;
        }

        const newDocument =
          currentDocument === '# Test Document\n\nInitial draft.'
            ? '# Test Document\n\nInitial draft.'
            : `${currentDocument}\n\nAdditional section.`;
        appendMessage(state, conversation, {
          mode,
          prompt,
          response: 'Document ready.',
          document: newDocument,
        });
        await jsonResponse(route, {
          mode,
          conversation_id: conversation.conversation_id,
          response: 'Document ready.',
          document: newDocument,
        });
        return;
      }

      const answer = `Mock ${mode} response for: ${cleanPrompt}`;
      appendMessage(state, conversation, {
        mode,
        prompt,
        response: answer,
      });
      await jsonResponse(route, {
        mode,
        conversation_id: conversation.conversation_id,
        response: answer,
      });
      return;
    }

    if (pathname.startsWith('/api/conversations/') && method === 'GET') {
      const conversationId = pathname.split('/').at(-1) ?? '';
      const conversation = state.conversations.get(conversationId);
      if (!conversation) {
        await jsonResponse(route, { detail: 'Not found' }, 404);
        return;
      }
      await jsonResponse(route, {
        conversation_id: conversation.conversation_id,
        mode: conversation.mode,
        messages: conversation.messages,
      });
      return;
    }

    if (pathname.startsWith('/api/conversations/') && method === 'PATCH') {
      const conversationId = pathname.split('/').at(-1) ?? '';
      const conversation = state.conversations.get(conversationId);
      if (!conversation) {
        await jsonResponse(route, { detail: 'Not found' }, 404);
        return;
      }
      const payload = body as { title?: string };
      conversation.title = payload.title ?? conversation.title;
      await jsonResponse(route, { ok: true });
      return;
    }

    if (pathname.startsWith('/api/conversations/') && method === 'DELETE') {
      const conversationId = pathname.split('/').at(-1) ?? '';
      state.conversations.delete(conversationId);
      await jsonResponse(route, { ok: true });
      return;
    }

    if (pathname.endsWith('/document') && method === 'PUT') {
      const parts = pathname.split('/');
      const conversationId = parts[3] ?? '';
      const conversation = state.conversations.get(conversationId);
      if (!conversation) {
        await jsonResponse(route, { detail: 'Not found' }, 404);
        return;
      }
      const payload = body as { document?: string };
      const latest = conversation.messages.at(-1);
      if (latest) {
        latest.document = payload.document ?? latest.document;
      }
      await jsonResponse(route, { ok: true });
      return;
    }

    await jsonResponse(route, { detail: `Unhandled ${method} ${pathname}` }, 500);
  });

  return { state, requests };
}
