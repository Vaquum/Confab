export type CorePath = {
  id: string;
  description: string;
  ownerSpec: string;
};

export const CORE_PATHS: CorePath[] = [
  {
    id: 'auth-domain-guard',
    description: 'Unauthenticated user sees auth gate and domain-restricted magic link flow',
    ownerSpec: 'e2e/auth.spec.ts',
  },
  {
    id: 'chat-history-and-management',
    description: 'Authenticated user can load, send, rename, and delete chats',
    ownerSpec: 'e2e/chat.spec.ts',
  },
  {
    id: 'doc-create-edit-accept',
    description: 'Document mode supports generation, local edit save, and proposal acceptance',
    ownerSpec: 'e2e/doc.spec.ts',
  },
  {
    id: 'doc-plus-wizard-and-follow-up',
    description: 'Doc+ wizard submits profile context and supports same-thread follow-ups',
    ownerSpec: 'e2e/doc-plus.spec.ts',
  },
  {
    id: 'consensus-and-pr-streaming',
    description: 'Consensus and PR modes complete full streaming lifecycle',
    ownerSpec: 'e2e/consensus-pr.spec.ts',
  },
  {
    id: 'settings-persistence',
    description: 'Typography settings persist through backend settings API',
    ownerSpec: 'e2e/settings.spec.ts',
  },
  {
    id: 'mode-matrix-smoke',
    description: 'Every prefix mode can submit and render first response',
    ownerSpec: 'e2e/mode-matrix.spec.ts',
  },
];

export type SendMethod = 'enter' | 'button';

export type ModeMatrixCase = {
  id: string;
  prompt: string;
  sendWith: SendMethod;
  expectedModeBadge?: string;
  expectedResponseText: string;
  persistsConversation?: boolean;
  opensDocPane?: boolean;
  requiresDocPlusWizard?: boolean;
};

export const MODE_MATRIX_CASES: ModeMatrixCase[] = [
  {
    id: 'chat-default',
    prompt: 'Give me a quick status update',
    sendWith: 'enter',
    expectedModeBadge: 'chat',
    expectedResponseText: 'Mock chat response for: Give me a quick status update',
  },
  {
    id: 'help-prefix',
    prompt: '/help',
    sendWith: 'enter',
    expectedResponseText: 'Confab Modes Reference',
    persistsConversation: false,
  },
  {
    id: 'gpt-prefix',
    prompt: '@gpt Summarize this project',
    sendWith: 'enter',
    expectedModeBadge: 'gpt',
    expectedResponseText: 'Mock gpt response for: Summarize this project',
  },
  {
    id: 'grok-prefix',
    prompt: '@grok Identify key risks',
    sendWith: 'enter',
    expectedModeBadge: 'grok',
    expectedResponseText: 'Mock grok response for: Identify key risks',
  },
  {
    id: 'gemini-prefix',
    prompt: '@gemini Draft a launch plan',
    sendWith: 'enter',
    expectedModeBadge: 'gemini',
    expectedResponseText: 'Mock gemini response for: Draft a launch plan',
  },
  {
    id: 'doc-prefix',
    prompt: '/doc Draft release note',
    sendWith: 'enter',
    expectedModeBadge: 'doc',
    expectedResponseText: 'Document ready.',
    opensDocPane: true,
  },
  {
    id: 'doc-plus-prefix',
    prompt: '/doc+ Draft release note',
    sendWith: 'button',
    expectedModeBadge: 'doc+',
    expectedResponseText: 'Document ready.',
    opensDocPane: true,
    requiresDocPlusWizard: true,
  },
  {
    id: 'consensus-prefix',
    prompt: '/consensus Evaluate this roadmap',
    sendWith: 'enter',
    expectedModeBadge: 'consensus',
    expectedResponseText:
      'Consensus summary: all mocked models align on the recommendation.',
  },
  {
    id: 'pr-prefix',
    prompt: '/pr https://github.com/Vaquum/Confab/pull/2',
    sendWith: 'enter',
    expectedModeBadge: 'pr',
    expectedResponseText:
      'PR audit summary: no critical defects found in mocked review.',
  },
];
