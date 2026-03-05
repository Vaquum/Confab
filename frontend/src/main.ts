// @ts-nocheck
import './styles.css';
import { readClientConfig } from './config';

declare const marked: { parse: (value: string) => string };

type StartRenameFn = (el: Element, conversationId: string) => void;
type PendingAttachment = {
  name: string;
  content: string;
};
type ComposerModeLock = {
  token: string;
  mode: string;
};

declare global {
  interface Window {
    supabase?: {
      createClient: (url: string, anonKey: string) => unknown;
    };
    startRename?: StartRenameFn;
  }
}

const { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY, allowedEmailDomain: ALLOWED_EMAIL_DOMAIN } = readClientConfig();
const supabaseClient = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const CHAT_ITEM_CLICK_DELAY_MS = 220;
const DOC_PLUS_BACKGROUND =
  `A document's reader experience is shaped by attributes operating at six levels: four structural levels of scale (word, sentence, paragraph, section, whole), and one meta level that cuts across all of them. This framework identifies 30 attributes — each independently adjustable, each pinned to a spectrum of A, B, or C. It is not a complete theory of reader cognition; reader experience is also shaped by who the reader is and how they encounter the text. But as a practical system for designing and diagnosing consistency across documents, these 30 attributes are sufficient. Coherence comes from choosing a position on each and holding it, or shifting only with purpose. Drift — unintentional movement along any of these spectrums — is what makes a document feel wrong.

Attribute\tLevel\tA\tB\tC
Evidential texture\tMeta\tEvidence-heavy — data, examples, citations\tSelective — evidence at key moments\tAssertion-driven — claims on authority or bare statement
Rhetorical mode\tMeta\tArgumentative — making a case\tExpository — explaining and informing\tNarrative — telling a story
Temporal orientation\tMeta\tPast — retrospective, historical\tPresent — current state, what is\tFuture — projective, what will or should be
Reflexivity\tMeta\tTransparent — regularly acknowledges its own structure\tOccasional — signposts at key moments only\tInvisible — never breaks the fourth wall
Economy\tWord\tSpare — every word earns its place\tBalanced — occasional looseness tolerated\tExpansive — room to breathe, repeat, elaborate
Precision\tWord\tExacting — the only right word\tAdequate — close enough to land\tSuggestive — deliberately open, letting the reader fill in
Lexical complexity\tWord\tPlain — simplest word every time\tMixed — plain default, specialist where needed\tSpecialized — assumes reader speaks the domain
Connotative consistency\tWord\tWarm — word choices carry positive charge\tNeutral — words chosen for meaning, not feeling\tCool — detached, clinical, or critical charge
Register\tWord\tInformal — conversational, relaxed\tMid — professional but not stiff\tFormal — elevated, institutional
Rhythm\tSentence\tShort and percussive\tVaried — mixes short and long\tLong and flowing
Syntactic complexity\tSentence\tLinear — one clause, one idea\tModerate — occasional subordination\tNested — layered, recursive constructions
Information order\tSentence\tPoint first — then qualify\tMixed — varies by context\tPoint last — build up, then deliver
Agency\tSentence\tHuman — people do things\tMixed — depends on emphasis\tAbstract — systems, processes, forces act
Epistemic stance\tSentence\tAssertive — states directly\tMeasured — qualifies where appropriate\tHedged — careful, provisional throughout
Idea density\tParagraph\tSparse — one idea, fully developed\tModerate — one or two, with room\tDense — multiple ideas, tightly packed
Abstraction level\tParagraph\tConcrete — stays in specifics and examples\tBlended — moves between both\tAbstract — lives in concepts and generalizations
Internal structure\tParagraph\tTop-loaded — point first, then development\tMixed — varies by paragraph\tBottom-loaded — builds to the point
Paragraph length\tParagraph\tShort — two to three sentences\tMedium — four to six sentences\tLong — seven or more, sustained development
Cohesion\tParagraph\tChained — each sentence picks up the last\tLoose — connected but not sequential\tParallel — sentences stand side by side
Section weight\tSection\tUniform — sections roughly equal in space\tProportional — weighted to importance\tConcentrated — most weight in one or two sections
Section sequencing\tSection\tLinear — chronological or causal chain\tModular — self-contained, in logical order\tAssociative — thematic or lateral connections
Inter-section transition\tSection\tExplicit — bridging passages between sections\tSignposted — brief markers at boundaries\tHard cut — white space, no verbal bridge
Internal arc\tSection\tShaped — each section builds to something\tMixed — some sections shaped, some flat\tFlat — sections deliver information evenly
Functional role\tSection\tDifferentiated — each section has a clear, distinct job\tSemi-differentiated — roles mostly clear\tUniform — sections serve similar functions throughout
Implied reader\tWhole\tExpert — assumes deep familiarity\tInformed — knows the basics, needs the argument\tNewcomer — assumes little, explains as it goes
Conceptual framing\tWhole\tSingle frame — one governing metaphor throughout\tLight framing — occasional metaphor, not structural\tNo frame — subject treated on its own terms
Connective texture\tWhole\tExplicit — transitions stated clearly\tSelective — signposts at key turns only\tImplicit — ideas placed, reader infers the link
Arc\tWhole\tLinear — builds in one direction\tThematic — organized by topic, not sequence\tCircular — returns to where it started, transformed
Tonal arc\tWhole\tFlat — same emotional temperature throughout\tGradual — slow, deliberate shifts\tDynamic — intentional swings in emotional register
Voice unity\tWhole\tSingular — unmistakably one mind\tConsistent — cohesive but not distinctive\tComposite — multiple contributors felt, but aligned`;
const DOC_PLUS_LEVELS = [
  {
    id: "meta",
    label: "Meta",
    attributes: [
      {
        name: "Evidential texture",
        choices: {
          A: "Evidence-heavy — data, examples, citations",
          B: "Selective — evidence at key moments",
          C: "Assertion-driven — claims on authority or bare statement",
        },
      },
      {
        name: "Rhetorical mode",
        choices: {
          A: "Argumentative — making a case",
          B: "Expository — explaining and informing",
          C: "Narrative — telling a story",
        },
      },
      {
        name: "Temporal orientation",
        choices: {
          A: "Past — retrospective, historical",
          B: "Present — current state, what is",
          C: "Future — projective, what will or should be",
        },
      },
      {
        name: "Reflexivity",
        choices: {
          A: "Transparent — regularly acknowledges its own structure",
          B: "Occasional — signposts at key moments only",
          C: "Invisible — never breaks the fourth wall",
        },
      },
    ],
  },
  {
    id: "whole",
    label: "Whole",
    attributes: [
      {
        name: "Implied reader",
        choices: {
          A: "Expert — assumes deep familiarity",
          B: "Informed — knows the basics, needs the argument",
          C: "Newcomer — assumes little, explains as it goes",
        },
      },
      {
        name: "Conceptual framing",
        choices: {
          A: "Single frame — one governing metaphor throughout",
          B: "Light framing — occasional metaphor, not structural",
          C: "No frame — subject treated on its own terms",
        },
      },
      {
        name: "Connective texture",
        choices: {
          A: "Explicit — transitions stated clearly",
          B: "Selective — signposts at key turns only",
          C: "Implicit — ideas placed, reader infers the link",
        },
      },
      {
        name: "Arc",
        choices: {
          A: "Linear — builds in one direction",
          B: "Thematic — organized by topic, not sequence",
          C: "Circular — returns to where it started, transformed",
        },
      },
      {
        name: "Tonal arc",
        choices: {
          A: "Flat — same emotional temperature throughout",
          B: "Gradual — slow, deliberate shifts",
          C: "Dynamic — intentional swings in emotional register",
        },
      },
      {
        name: "Voice unity",
        choices: {
          A: "Singular — unmistakably one mind",
          B: "Consistent — cohesive but not distinctive",
          C: "Composite — multiple contributors felt, but aligned",
        },
      },
    ],
  },
  {
    id: "section",
    label: "Section",
    attributes: [
      {
        name: "Section weight",
        choices: {
          A: "Uniform — sections roughly equal in space",
          B: "Proportional — weighted to importance",
          C: "Concentrated — most weight in one or two sections",
        },
      },
      {
        name: "Section sequencing",
        choices: {
          A: "Linear — chronological or causal chain",
          B: "Modular — self-contained, in logical order",
          C: "Associative — thematic or lateral connections",
        },
      },
      {
        name: "Inter-section transition",
        choices: {
          A: "Explicit — bridging passages between sections",
          B: "Signposted — brief markers at boundaries",
          C: "Hard cut — white space, no verbal bridge",
        },
      },
      {
        name: "Internal arc",
        choices: {
          A: "Shaped — each section builds to something",
          B: "Mixed — some sections shaped, some flat",
          C: "Flat — sections deliver information evenly",
        },
      },
      {
        name: "Functional role",
        choices: {
          A: "Differentiated — each section has a clear, distinct job",
          B: "Semi-differentiated — roles mostly clear",
          C: "Uniform — sections serve similar functions throughout",
        },
      },
    ],
  },
  {
    id: "paragraph",
    label: "Paragraph",
    attributes: [
      {
        name: "Idea density",
        choices: {
          A: "Sparse — one idea, fully developed",
          B: "Moderate — one or two, with room",
          C: "Dense — multiple ideas, tightly packed",
        },
      },
      {
        name: "Abstraction level",
        choices: {
          A: "Concrete — stays in specifics and examples",
          B: "Blended — moves between both",
          C: "Abstract — lives in concepts and generalizations",
        },
      },
      {
        name: "Internal structure",
        choices: {
          A: "Top-loaded — point first, then development",
          B: "Mixed — varies by paragraph",
          C: "Bottom-loaded — builds to the point",
        },
      },
      {
        name: "Paragraph length",
        choices: {
          A: "Short — two to three sentences",
          B: "Medium — four to six sentences",
          C: "Long — seven or more, sustained development",
        },
      },
      {
        name: "Cohesion",
        choices: {
          A: "Chained — each sentence picks up the last",
          B: "Loose — connected but not sequential",
          C: "Parallel — sentences stand side by side",
        },
      },
    ],
  },
  {
    id: "sentence",
    label: "Sentence",
    attributes: [
      {
        name: "Rhythm",
        choices: {
          A: "Short and percussive",
          B: "Varied — mixes short and long",
          C: "Long and flowing",
        },
      },
      {
        name: "Syntactic complexity",
        choices: {
          A: "Linear — one clause, one idea",
          B: "Moderate — occasional subordination",
          C: "Nested — layered, recursive constructions",
        },
      },
      {
        name: "Information order",
        choices: {
          A: "Point first — then qualify",
          B: "Mixed — varies by context",
          C: "Point last — build up, then deliver",
        },
      },
      {
        name: "Agency",
        choices: {
          A: "Human — people do things",
          B: "Mixed — depends on emphasis",
          C: "Abstract — systems, processes, forces act",
        },
      },
      {
        name: "Epistemic stance",
        choices: {
          A: "Assertive — states directly",
          B: "Measured — qualifies where appropriate",
          C: "Hedged — careful, provisional throughout",
        },
      },
    ],
  },
  {
    id: "word",
    label: "Word",
    attributes: [
      {
        name: "Economy",
        choices: {
          A: "Spare — every word earns its place",
          B: "Balanced — occasional looseness tolerated",
          C: "Expansive — room to breathe, repeat, elaborate",
        },
      },
      {
        name: "Precision",
        choices: {
          A: "Exacting — the only right word",
          B: "Adequate — close enough to land",
          C: "Suggestive — deliberately open, letting the reader fill in",
        },
      },
      {
        name: "Lexical complexity",
        choices: {
          A: "Plain — simplest word every time",
          B: "Mixed — plain default, specialist where needed",
          C: "Specialized — assumes reader speaks the domain",
        },
      },
      {
        name: "Connotative consistency",
        choices: {
          A: "Warm — word choices carry positive charge",
          B: "Neutral — words chosen for meaning, not feeling",
          C: "Cool — detached, clinical, or critical charge",
        },
      },
      {
        name: "Register",
        choices: {
          A: "Informal — conversational, relaxed",
          B: "Mid — professional but not stiff",
          C: "Formal — elevated, institutional",
        },
      },
    ],
  },
];
const DOC_PLUS_SELECTIONS_SETTINGS_KEY = 'docPlusSelections';
const THEME_SETTINGS_KEY = 'theme';
const THEME_LOCAL_STORAGE_KEY = 'confab_theme';
const SUPPORTED_ATTACHMENT_EXTENSIONS = new Set(['txt', 'csv', 'tsv', 'md']);
const MODE_LOCK_TOKENS: ComposerModeLock[] = [
  { token: '/help', mode: 'help' },
  { token: '/?', mode: 'help' },
  { token: '/doc+', mode: 'doc_plus' },
  { token: '/doc', mode: 'doc' },
  { token: '/pr', mode: 'pr' },
  { token: '/consensus', mode: 'consensus' },
  { token: '@grok', mode: 'grok' },
  { token: '@gemini', mode: 'gemini' },
  { token: '@gpt', mode: 'gpt' },
  { token: '@claude', mode: 'chat' },
];
const MODE_LOCK_LEFT_OFFSET_PX = 40;
const MODE_LOCK_CURSOR_GAP_PX = 7;
const MIN_INPUT_LEFT_PADDING_PX = 46;
const COMPOSER_MULTILINE_SCROLL_THRESHOLD_PX = 50;
const COMPOSER_MULTILINE_PADDING_BOTTOM_PX = 38;
const DOC_HIGHLIGHT_BLOCK_SELECTOR =
  'p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, code, td, th';
const HISTORY_EMPTY_RETRY_LIMIT = 3;
const HISTORY_EMPTY_RETRY_DELAY_MS = 900;

  let currentConversationId = null;
  let currentMode = null;
  let loading = false;
  let sidebarCollapsed = false;
  let currentDocument = null;
  let docPaneOpen = false;
  let authSession = null;
  let authReady = false;
  let typoSaveTimer = null;
  let chatItemClickTimer = null;
  let docPlusWizardResolver = null;
  let docPlusWizardStepIndex = 0;
  let docPlusSelections = {};
  let pendingAttachments: PendingAttachment[] = [];
  let composerModeLock: ComposerModeLock | null = null;
  let historyRetryTimer = null;
  let historyEmptyRetryCount = 0;
  let persistedUserSettings = {};
  let currentTheme = 'light';

  function renderAllowedDomainBadge() {
    const badge = document.getElementById('allowedDomainBadge');
    if (!badge) return;
    badge.textContent = `@${ALLOWED_EMAIL_DOMAIN}`;
  }

  function normalizeTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      return theme;
    }
    return null;
  }

  function readLocalThemePreference() {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY));
    } catch (_error) {
      return null;
    }
  }

  function writeLocalThemePreference(theme) {
    try {
      window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, theme);
    } catch (_error) {
      // Ignore storage access failures.
    }
  }

  function resolveSystemTheme() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light';
  }

  function resolvePreferredTheme(settings) {
    const fromSettings = normalizeTheme(settings?.[THEME_SETTINGS_KEY]);
    if (fromSettings) {
      return fromSettings;
    }
    const fromLocal = readLocalThemePreference();
    if (fromLocal) {
      return fromLocal;
    }
    return resolveSystemTheme();
  }

  function applyTheme(theme) {
    const normalizedTheme = normalizeTheme(theme) || 'light';
    currentTheme = normalizedTheme;
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    const button = document.getElementById('btnTheme');
    if (!button) {
      return;
    }
    const nextThemeLabel = normalizedTheme === 'dark'
      ? 'Switch to light mode'
      : 'Switch to dark mode';
    button.setAttribute('title', nextThemeLabel);
    button.setAttribute('aria-label', nextThemeLabel);
    button.classList.toggle('active', normalizedTheme === 'dark');
  }

  async function saveThemePreference(theme) {
    writeLocalThemePreference(theme);
    if (!authSession) {
      return;
    }
    const nextSettings = Object.assign({}, persistedUserSettings, {
      [THEME_SETTINGS_KEY]: theme,
    });
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      persistedUserSettings = nextSettings;
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  async function toggleTheme() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    const currentTypography = readTypoInputs();
    const themeAwareTypography = resolveTypographyColorsForTheme(currentTypography);
    applyTypography(themeAwareTypography);
    populateTypoInputs(themeAwareTypography);
    await saveThemePreference(nextTheme);
  }

  function renderComposerModeLock() {
    const chip = document.getElementById('composerModeLock');
    const inputWrap = document.querySelector('.input-wrap');
    if (!chip || !inputWrap) {
      return;
    }
    if (!composerModeLock) {
      chip.textContent = '';
      chip.removeAttribute('data-mode');
      inputWrap.classList.remove('mode-locked');
      inputWrap.style.removeProperty('--mode-lock-input-padding-left');
      return;
    }
    chip.textContent = composerModeLock.token;
    chip.setAttribute('data-mode', composerModeLock.mode);
    inputWrap.classList.add('mode-locked');
    const nextPadding = Math.max(
      MIN_INPUT_LEFT_PADDING_PX,
      MODE_LOCK_LEFT_OFFSET_PX + chip.offsetWidth + MODE_LOCK_CURSOR_GAP_PX,
    );
    inputWrap.style.setProperty(
      '--mode-lock-input-padding-left',
      `${nextPadding}px`,
    );
  }

  function setComposerModeLock(token: string, mode: string) {
    composerModeLock = { token, mode };
    renderComposerModeLock();
  }

  function clearComposerModeLock() {
    if (!composerModeLock) {
      return;
    }
    composerModeLock = null;
    renderComposerModeLock();
  }

  function resolveModeLockToken(value: string): ComposerModeLock | null {
    const trimmed = value.trim().toLowerCase();
    for (const modeLock of MODE_LOCK_TOKENS) {
      if (trimmed === modeLock.token) {
        return modeLock;
      }
    }
    return null;
  }

  // --- Init ---
  renderAllowedDomainBadge();
  applyTheme(resolvePreferredTheme(persistedUserSettings));
  renderAttachmentList();
  renderComposerModeLock();
  autoResize(document.getElementById('input'));
  setComposerCentered(true);
  initDocPlusWizard();
  initAuth();

  function setAuthStatus(message, isError = false) {
    const el = document.getElementById('authStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!isError);
  }

  function setAuthenticatedUi(isAuthenticated) {
    document.getElementById('authGate').style.display = isAuthenticated ? 'none' : 'flex';
    document.getElementById('btnSignOut').style.display = isAuthenticated ? 'inline-flex' : 'none';
    document.getElementById('authUser').textContent = isAuthenticated ? (authSession?.user?.email || 'Signed in') : '';
    document.getElementById('input').disabled = !isAuthenticated;
    document.getElementById('btnSend').disabled = !isAuthenticated;
  }

  async function initAuth() {
    if (!supabaseClient) {
      setAuthenticatedUi(false);
      setAuthStatus('Supabase auth is not configured on the server.', true);
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      setAuthenticatedUi(false);
      setAuthStatus('Failed to initialize authentication.', true);
      return;
    }

    authSession = data.session;
    authReady = true;
    setAuthenticatedUi(!!authSession);
    syncComposerPlacement();

    if (authSession) {
      try {
        await initTypography();
      } catch (e) {
        console.error('Failed to initialize typography settings', e);
      }
      await loadHistory();
    } else {
      renderHistory([]);
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      authSession = session;
      setAuthenticatedUi(!!session);

      if (session) {
        setAuthStatus('');
        syncComposerPlacement();
        try {
          await initTypography();
        } catch (e) {
          console.error('Failed to initialize typography settings', e);
        }
        await loadHistory();
      } else {
        persistedUserSettings = {};
        currentConversationId = null;
        currentMode = null;
        currentDocument = null;
        historyEmptyRetryCount = 0;
        clearComposerModeLock();
        pendingAttachments = [];
        renderAttachmentList();
        document.getElementById('messageContainer').innerHTML = '';
        document.getElementById('messages').style.display = 'none';
        setComposerCentered(true);
        renderHistory([]);
      }
    });
  }

  async function sendMagicLink() {
    if (!supabaseClient) {
      setAuthStatus('Supabase auth is not configured on the server.', true);
      return;
    }

    const email = document.getElementById('authEmail').value.trim();
    if (!email) {
      setAuthStatus('Enter an email address.', true);
      return;
    }
    if (email.toLowerCase().split('@')[1] !== ALLOWED_EMAIL_DOMAIN) {
      setAuthStatus(`Only @${ALLOWED_EMAIL_DOMAIN} emails are allowed.`, true);
      return;
    }

    const button = document.getElementById('btnAuthMagicLink');
    button.disabled = true;
    setAuthStatus('Sending magic link...');
    let response = null;
    try {
      response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          email_redirect_to: window.location.origin,
        }),
      });
    } catch (e) {
      setAuthStatus('Unable to reach auth service. Please try again.', true);
      return;
    } finally {
      button.disabled = false;
    }

    if (!response.ok) {
      let message = 'Unable to send magic link.';
      try {
        const payload = await response.json();
        message = payload.detail || message;
      } catch (e) {
        message = 'Unable to send magic link.';
      }
      setAuthStatus(message, true);
      return;
    }
    setAuthStatus('Check your email for the sign-in link.');
  }

  async function signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }

  async function getAuthToken() {
    if (!supabaseClient) return null;
    if (!authSession) return null;
    return authSession.access_token;
  }

  async function apiFetch(url, options = {}) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('You must sign in first.');
    }
    const headers = Object.assign({}, options.headers || {}, {
      Authorization: `Bearer ${token}`,
    });
    const method = String(options.method || 'GET').toUpperCase();
    const requestOptions = Object.assign({}, options, { headers });
    if (method === 'GET' && requestOptions.cache === undefined) {
      requestOptions.cache = 'no-store';
    }
    const response = await fetch(url, requestOptions);
    if (response.status === 401) {
      await signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (response.status === 403) {
      await signOut();
      throw new Error(`Only @${ALLOWED_EMAIL_DOMAIN} emails are allowed.`);
    }
    return response;
  }

  // --- Sidebar toggle ---
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    document.querySelector('.sidebar').classList.toggle('collapsed', sidebarCollapsed);
  }

  function setComposerCentered(centered) {
    const main = document.getElementById('mainArea');
    if (!main) return;
    main.classList.toggle('composer-centered', centered);
  }

  function shouldKeepComposerDocked() {
    const messages = document.getElementById('messages');
    const container = document.getElementById('messageContainer');
    const messagesVisible = !!messages && messages.style.display === 'block';
    const hasRenderedMessages = !!container && container.childElementCount > 0;
    return loading || currentConversationId !== null || messagesVisible || hasRenderedMessages;
  }

  function syncComposerPlacement() {
    setComposerCentered(!shouldKeepComposerDocked());
  }

  function getAttachmentExtension(fileName) {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  function isSupportedAttachment(file) {
    return SUPPORTED_ATTACHMENT_EXTENSIONS.has(getAttachmentExtension(file.name));
  }

  function buildPromptWithAttachments(rawPrompt, attachments) {
    if (!attachments.length) {
      return rawPrompt;
    }
    const sections = attachments.map((attachment) => (
      `Attachment: ${attachment.name}\n---\n${attachment.content}`
    ));
    const attachmentBlock = sections.join('\n\n');
    if (!rawPrompt) {
      return `[ATTACHMENTS]\n\n${attachmentBlock}`;
    }
    return `${rawPrompt}\n\n[ATTACHMENTS]\n\n${attachmentBlock}`;
  }

  function parseAttachmentDisplayPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { text: '', attachmentNames: [] };
    }
    const marker = '\n\n[ATTACHMENTS]\n\n';
    const markerPrefix = '[ATTACHMENTS]\n\n';
    let textPart = prompt;
    let attachmentBlock = '';
    if (prompt.includes(marker)) {
      const splitAt = prompt.indexOf(marker);
      textPart = prompt.slice(0, splitAt);
      attachmentBlock = prompt.slice(splitAt + marker.length);
    } else if (prompt.startsWith(markerPrefix)) {
      textPart = '';
      attachmentBlock = prompt.slice(markerPrefix.length);
    } else {
      return { text: prompt, attachmentNames: [] };
    }

    const attachmentNames = [];
    for (const line of attachmentBlock.split('\n')) {
      if (!line.startsWith('Attachment: ')) continue;
      const attachmentName = line.slice('Attachment: '.length).trim();
      if (attachmentName) {
        attachmentNames.push(attachmentName);
      }
    }
    if (!attachmentNames.length) {
      return { text: prompt, attachmentNames: [] };
    }
    return { text: textPart.trim(), attachmentNames };
  }

  function renderUserPromptBubbleHtml(promptText, explicitAttachmentNames = []) {
    const parsed = parseAttachmentDisplayPrompt(promptText);
    const attachmentNames = explicitAttachmentNames.length ? explicitAttachmentNames : parsed.attachmentNames;
    const cleanText = (explicitAttachmentNames.length ? promptText : parsed.text).trim();
    if (!attachmentNames.length) {
      return `<div class="user-bubble-content"><div class="user-bubble-text">${esc(cleanText)}</div></div>`;
    }
    const attachmentRows = attachmentNames.map((attachmentName) => (
      `<div class="user-attachment-row" title="${esc(attachmentName)}">
        <svg class="user-attachment-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="user-attachment-name">${esc(attachmentName)}</span>
      </div>`
    )).join('');
    if (!cleanText) {
      return `<div class="user-bubble-content user-bubble-content--attachments-only"><div class="user-attachment-group">${attachmentRows}</div></div>`;
    }
    return `<div class="user-bubble-content"><div class="user-attachment-group">${attachmentRows}</div><div class="user-bubble-text">${esc(cleanText)}</div></div>`;
  }

  function renderAttachmentList() {
    const list = document.getElementById('attachmentList');
    if (!list) return;
    if (!pendingAttachments.length) {
      list.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    list.style.display = 'flex';
    list.innerHTML = pendingAttachments.map((attachment, index) => (
      `<span class="attachment-chip">
        <span class="attachment-chip-name" title="${esc(attachment.name)}">${esc(attachment.name)}</span>
        <button class="attachment-chip-remove" onclick="removeAttachment(${index})" title="Remove attachment">&times;</button>
      </span>`
    )).join('');
  }

  function removeAttachment(index) {
    if (index < 0 || index >= pendingAttachments.length) return;
    pendingAttachments.splice(index, 1);
    renderAttachmentList();
  }

  function openAttachmentPicker() {
    const input = document.getElementById('attachmentInput');
    if (!input) return;
    input.click();
  }

  async function handleAttachmentSelection(event) {
    const input = event.target;
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    const nextAttachments = [];
    for (const file of files) {
      if (!isSupportedAttachment(file)) {
        console.warn(`Unsupported attachment skipped: ${file.name}`);
        continue;
      }
      const content = await file.text();
      nextAttachments.push({
        name: file.name,
        content,
      });
    }
    if (nextAttachments.length) {
      pendingAttachments = pendingAttachments.concat(nextAttachments);
      renderAttachmentList();
    }
    input.value = '';
  }

  // --- Mode detection ---
  function detectMode(prompt) {
    const p = prompt.trim().toLowerCase();
    if (p.startsWith('/help')) return 'help';
    if (p.startsWith('/?')) return 'help';
    if (p.startsWith("/doc+")) return "doc_plus";
    if (p.startsWith("/doc")) return "doc";
    if (p.startsWith("/pr")) return "pr";
    if (p.startsWith("/consensus")) return "consensus";
    if (p.startsWith("@grok")) return "grok";
    if (p.startsWith("@gemini")) return "gemini";
    if (p.startsWith("@gpt")) return "gpt";
    if (p.startsWith("@claude")) return "chat";
    return null;  // no prefix — inherit from last message
  }

  function stripDocPromptPrefix(prompt) {
    return prompt.trim().replace(/^\/doc\+?\s*/i, "").trim();
  }

  function createDocPlusDefaultSelections() {
    const selections = {};
    for (const level of DOC_PLUS_LEVELS) {
      for (const attribute of level.attributes) {
        selections[attribute.name] = "B";
      }
    }
    return selections;
  }

  function normalizeDocPlusSelections(candidate) {
    const defaults = createDocPlusDefaultSelections();
    if (!candidate || typeof candidate !== 'object') {
      return defaults;
    }
    const normalized = Object.assign({}, defaults);
    for (const attribute of Object.keys(defaults)) {
      const value = candidate[attribute];
      if (value === 'A' || value === 'B' || value === 'C') {
        normalized[attribute] = value;
      }
    }
    return normalized;
  }

  function getSavedDocPlusSelections() {
    return normalizeDocPlusSelections(
      persistedUserSettings[DOC_PLUS_SELECTIONS_SETTINGS_KEY],
    );
  }

  async function saveDocPlusSelections(selections) {
    if (!authSession) return;
    const normalized = normalizeDocPlusSelections(selections);
    const nextSettings = Object.assign({}, persistedUserSettings, {
      [DOC_PLUS_SELECTIONS_SETTINGS_KEY]: normalized,
    });
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      persistedUserSettings = nextSettings;
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  function buildDocPlusContext() {
    const lines = [
      DOC_PLUS_BACKGROUND,
      "",
      "Use this profile for all document collaboration turns in this conversation.",
      "",
      "Selected profile:",
    ];
    for (const level of DOC_PLUS_LEVELS) {
      lines.push(`${level.label}:`);
      for (const attribute of level.attributes) {
        const choice = docPlusSelections[attribute.name] || "B";
        lines.push(`- ${attribute.name}: ${choice}: ${attribute.choices[choice]}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  function closeDocPlusWizard(result) {
    const modal = document.getElementById("docPlusModal");
    if (modal) modal.style.display = "none";
    document.body.classList.remove("doc-plus-open");
    const resolver = docPlusWizardResolver;
    docPlusWizardResolver = null;
    if (resolver) resolver(result);
  }

  function renderDocPlusWizard() {
    const level = DOC_PLUS_LEVELS[docPlusWizardStepIndex];
    const title = document.getElementById("docPlusStepTitle");
    const count = document.getElementById("docPlusStepCount");
    const progress = document.getElementById("docPlusProgress");
    const fields = document.getElementById("docPlusFields");
    const back = document.getElementById("btnDocPlusBack");
    const next = document.getElementById("btnDocPlusNext");
    if (!level || !title || !count || !progress || !fields || !back || !next) return;

    title.textContent = `${level.label} level`;
    count.textContent = `Step ${docPlusWizardStepIndex + 1} of ${DOC_PLUS_LEVELS.length}`;
    progress.innerHTML = DOC_PLUS_LEVELS.map((item, index) => {
      const state = index < docPlusWizardStepIndex ? "done" : index === docPlusWizardStepIndex ? "active" : "";
      return `<span class="doc-plus-step-chip ${state}">${item.label}</span>`;
    }).join("");

    fields.innerHTML = level.attributes.map((attribute) => {
      const options = ["A", "B", "C"].map((choice) => {
        const selected = docPlusSelections[attribute.name] === choice ? " selected" : "";
        return `<option value="${choice}"${selected}>${choice}: ${esc(attribute.choices[choice])}</option>`;
      }).join("");
      return `
        <label class="doc-plus-field">
          <span class="doc-plus-field-name">${esc(attribute.name)}</span>
          <select class="doc-plus-select" data-doc-plus-attribute="${esc(attribute.name)}">
            ${options}
          </select>
        </label>`;
    }).join("");

    fields.querySelectorAll("[data-doc-plus-attribute]").forEach((node) => {
      node.addEventListener("change", (event) => {
        const element = event.target;
        const attributeName = element.getAttribute("data-doc-plus-attribute");
        docPlusSelections[attributeName] = element.value;
      });
    });

    const showBack = docPlusWizardStepIndex > 0;
    back.hidden = false;
    back.style.display = showBack ? 'inline-flex' : 'none';
    back.disabled = !showBack;
    const actions = back.closest('.doc-plus-actions');
    if (actions) {
      actions.classList.toggle('no-back', !showBack);
    }
    next.textContent = docPlusWizardStepIndex === DOC_PLUS_LEVELS.length - 1 ? "Finish" : "Next";
  }

  function initDocPlusWizard() {
    const modal = document.getElementById("docPlusModal");
    const cancel = document.getElementById("btnDocPlusCancel");
    const back = document.getElementById("btnDocPlusBack");
    const next = document.getElementById("btnDocPlusNext");
    if (!modal || !cancel || !back || !next) return;

    cancel.addEventListener("click", () => closeDocPlusWizard(null));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDocPlusWizard(null);
    });
    back.addEventListener("click", () => {
      if (docPlusWizardStepIndex === 0) return;
      docPlusWizardStepIndex -= 1;
      renderDocPlusWizard();
    });
    next.addEventListener("click", () => {
      const lastStep = DOC_PLUS_LEVELS.length - 1;
      if (docPlusWizardStepIndex >= lastStep) {
        const context = buildDocPlusContext();
        void saveDocPlusSelections(docPlusSelections);
        closeDocPlusWizard(context);
        return;
      }
      docPlusWizardStepIndex += 1;
      renderDocPlusWizard();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (modal.style.display !== "flex") return;
      closeDocPlusWizard(null);
    });
  }

  function openDocPlusWizard() {
    const modal = document.getElementById("docPlusModal");
    if (!modal) return Promise.resolve(null);
    docPlusSelections = getSavedDocPlusSelections();
    docPlusWizardStepIndex = 0;
    renderDocPlusWizard();
    modal.style.display = "flex";
    document.body.classList.add("doc-plus-open");
    return new Promise((resolve) => {
      docPlusWizardResolver = resolve;
    });
  }

  // --- History ---
  async function loadHistory() {
    if (historyRetryTimer) {
      clearTimeout(historyRetryTimer);
      historyRetryTimer = null;
    }
    if (!authReady || !authSession) {
      renderHistory([]);
      return;
    }
    try {
      const res = await apiFetch("/api/opinions");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to load history");
      }
      if (!Array.isArray(data)) {
        throw new Error("Invalid history payload");
      }
      if (
        data.length === 0 &&
        historyEmptyRetryCount < HISTORY_EMPTY_RETRY_LIMIT &&
        !currentConversationId
      ) {
        historyEmptyRetryCount += 1;
        historyRetryTimer = setTimeout(() => {
          historyRetryTimer = null;
          void loadHistory();
        }, HISTORY_EMPTY_RETRY_DELAY_MS);
      } else {
        historyEmptyRetryCount = 0;
      }
      renderHistory(data);
    } catch (e) {
      console.error("Failed to load history", e);
      if (authReady && authSession) {
        historyRetryTimer = setTimeout(() => {
          historyRetryTimer = null;
          void loadHistory();
        }, 1200);
      }
    }
  }

  function renderHistory(items) {
    const el = document.getElementById("chatList");
    if (!items.length) {
      el.innerHTML = '<div class="sidebar-empty">No chats yet.<br>Ask something to get started.</div>';
      return;
    }
    el.innerHTML = items.map(item => {
      const d = item.created_at ? new Date(item.created_at + "Z") : null;
      const date = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
      const active = item.conversation_id === currentConversationId ? " active" : "";
      const mode = item.mode || "consensus";
      const modeLabel = mode === "doc_plus" ? "doc+" : mode;
      let title = item.title || item.prompt || '';
      let titleClass = '';
      if (!item.title) {
        const parsed = parseAttachmentDisplayPrompt(item.prompt || '');
        if (parsed.attachmentNames.length) {
          if (parsed.text) {
            title = parsed.text;
          } else {
            title = parsed.attachmentNames[0];
            titleClass = ' attachment-name';
          }
        }
      }
      return `<div class="chat-item${active}" onclick="onChatItemClick('${item.conversation_id}')">
        <button class="chat-item-delete" onclick="event.stopPropagation(); deleteChat('${item.conversation_id}')" title="Delete">&times;</button>
        <div class="chat-item-prompt${titleClass}" ondblclick="event.stopPropagation(); startRename(this, '${item.conversation_id}')">${esc(title)}</div>
        <div class="chat-item-meta">
          <span class="chat-item-mode">${modeLabel}</span>
          <span>${date}</span>
        </div>
      </div>`;
    }).join("");
  }

  function clearPendingChatItemClick() {
    if (chatItemClickTimer) {
      clearTimeout(chatItemClickTimer);
      chatItemClickTimer = null;
    }
  }

  function onChatItemClick(conversationId) {
    clearPendingChatItemClick();
    chatItemClickTimer = setTimeout(() => {
      chatItemClickTimer = null;
      if (conversationId === currentConversationId) {
        return;
      }
      loadConversation(conversationId);
    }, CHAT_ITEM_CLICK_DELAY_MS);
  }

  // --- Load conversation ---
  async function loadConversation(conversationId) {
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}`);
      if (!res.ok) return;
      const data = await res.json();

      currentConversationId = conversationId;
      clearComposerModeLock();
      pendingAttachments = [];
      renderAttachmentList();
      setComposerCentered(false);
      // Track last message's mode so follow-ups inherit it
      const lastMsg = data.messages[data.messages.length - 1];
      currentMode = lastMsg ? (lastMsg.mode || data.mode) : data.mode;

      document.getElementById("welcome").style.display = "none";
      const msgs = document.getElementById("messages");
      msgs.style.display = "block";
      const container = document.getElementById("messageContainer");
      container.innerHTML = "";

      let latestDoc = null;
      for (const msg of data.messages) {
        const msgMode = msg.mode || data.mode;
        const responseText = (msgMode === "consensus" || msgMode === "pr") ? msg.synthesis : msg.response;
        if (msg.document) latestDoc = msg.document;
        container.innerHTML += `
          <div class="message user">
            <div class="message-bubble">${renderUserPromptBubbleHtml(msg.prompt)}</div>
          </div>
          <div class="message ai">
            <div class="message-bubble prose">${md(responseText)}</div>
            ${copyBtnHtml(responseText)}
          </div>`;
      }

      // Restore doc pane for doc conversations
      if ((data.mode === "doc" || data.mode === "doc_plus") && latestDoc) {
        const docTitle = stripDocPromptPrefix(data.messages[0]?.prompt || "").substring(0, 60) || "Document";
        openDocPane(latestDoc, docTitle);
      } else if (docPaneOpen) {
        closeDocPane();
      }

      msgs.scrollTop = msgs.scrollHeight;
      loadHistory();
    } catch (e) {
      console.error("Failed to load conversation", e);
    }
  }

  // --- Delete chat ---
  async function deleteChat(conversationId) {
    try {
      await apiFetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      if (currentConversationId === conversationId) newChat();
      else loadHistory();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  }

  // --- Rename chat ---
  function startRename(el, conversationId) {
    clearPendingChatItemClick();
    el.classList.add("editing");
    el.contentEditable = true;
    el.focus();
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const save = async () => {
      el.contentEditable = false;
      el.classList.remove("editing");
      const title = el.textContent.trim();
      if (!title) { loadHistory(); return; }
      try {
        await apiFetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch (e) {
        console.error("Rename failed", e);
      }
    };

    el.onblur = save;
    el.onkeydown = (e) => {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
      if (e.key === "Escape") { el.contentEditable = false; el.classList.remove("editing"); loadHistory(); }
    };
  }

  async function copyDocument(btn) {
    if (!currentDocument) return;
    try {
      await navigator.clipboard.writeText(currentDocument);
      const svg = btn.querySelector('svg');
      svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
      setTimeout(() => {
        svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
      }, 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }

  // --- Edit proposals (approval workflow) ---
  let _editStore = {};
  let _editCounter = 0;
  let _activeDocHighlightNode = null;
  let _activeEditCardId = null;

  function clearDocSuggestionFocus() {
    if (_activeDocHighlightNode) {
      _activeDocHighlightNode.classList.remove('doc-suggestion-highlight');
      _activeDocHighlightNode = null;
    }
    if (_activeEditCardId) {
      const previousCard = document.getElementById('edit_' + _activeEditCardId);
      if (previousCard) {
        previousCard.classList.remove('focused');
      }
      _activeEditCardId = null;
    }
  }

  function normalizeDocSnippet(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function findDocBlockBySnippet(root, snippet, preferLastMatch = false) {
    const normalizedSnippet = normalizeDocSnippet(snippet);
    if (!normalizedSnippet) {
      return null;
    }
    const blocks = Array.from(root.querySelectorAll(DOC_HIGHLIGHT_BLOCK_SELECTOR));
    if (!blocks.length) {
      return null;
    }
    const compactSnippet = normalizedSnippet.length > 180
      ? normalizedSnippet.slice(0, 180)
      : normalizedSnippet;
    const indexedBlocks = [];
    let matched = null;
    for (const block of blocks) {
      const blockText = normalizeDocSnippet(block.innerText || block.textContent || '');
      if (!blockText) {
        continue;
      }
      indexedBlocks.push({ block, text: blockText });
      if (blockText.includes(normalizedSnippet) || blockText.includes(compactSnippet)) {
        matched = block;
        if (!preferLastMatch) {
          return matched;
        }
      }
    }
    if (matched) {
      return matched;
    }
    if (!indexedBlocks.length) {
      return null;
    }

    const fullText = indexedBlocks.map((entry) => entry.text).join(' ');
    const searchTerms = compactSnippet === normalizedSnippet
      ? [normalizedSnippet]
      : [normalizedSnippet, compactSnippet];
    for (const term of searchTerms) {
      const position = preferLastMatch
        ? fullText.lastIndexOf(term)
        : fullText.indexOf(term);
      if (position === -1) {
        continue;
      }
      let cursor = 0;
      for (const entry of indexedBlocks) {
        const blockStart = cursor;
        const blockEnd = blockStart + entry.text.length;
        if (position >= blockStart && position <= blockEnd) {
          return entry.block;
        }
        cursor = blockEnd + 1;
      }
      return indexedBlocks[indexedBlocks.length - 1].block;
    }

    const tokenCandidates = normalizedSnippet
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .slice(0, 16);
    if (!tokenCandidates.length) {
      return null;
    }
    let bestBlock = null;
    let bestScore = 0;
    for (const entry of indexedBlocks) {
      const lowerText = entry.text.toLowerCase();
      let score = 0;
      for (const token of tokenCandidates) {
        if (lowerText.includes(token)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestBlock = entry.block;
      }
    }
    if (bestScore >= 2) {
      return bestBlock;
    }
    return null;
  }

  function shouldPreferLastDocMatch(edit) {
    return !edit.old && !edit.context_after && !!edit.context_before;
  }

  function focusDocEditorSelection(edit) {
    const editor = document.getElementById('docEditor');
    if (!editor) {
      return;
    }
    const source = editor.value || currentDocument || '';
    if (!source) {
      return;
    }
    const snippets = [edit.old, edit.context_before, edit.context_after, edit.new];
    const preferLastMatch = shouldPreferLastDocMatch(edit);
    let targetText = '';
    let targetIndex = -1;
    for (const snippet of snippets) {
      const normalized = (snippet || '').trim();
      if (!normalized) {
        continue;
      }
      targetIndex = preferLastMatch
        ? source.lastIndexOf(normalized)
        : source.indexOf(normalized);
      if (targetIndex !== -1) {
        targetText = normalized;
        break;
      }
    }
    if (targetIndex === -1) {
      return;
    }
    const targetEnd = targetIndex + targetText.length;
    editor.focus();
    editor.setSelectionRange(targetIndex, targetEnd);
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    const precedingLines = source.slice(0, targetIndex).split('\n').length - 1;
    const scrollTop = Math.max(0, (precedingLines * lineHeight) - (editor.clientHeight / 2));
    editor.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }

  function resolveDocHighlightNode(edit) {
    const docContent = document.getElementById('docContent');
    if (!docContent) {
      return null;
    }
    const preferLastMatch = shouldPreferLastDocMatch(edit);
    const snippets = [edit.old, edit.context_before, edit.context_after, edit.new];
    for (const snippet of snippets) {
      const target = findDocBlockBySnippet(docContent, snippet, preferLastMatch);
      if (target) {
        return target;
      }
    }
    return null;
  }

  function focusEditSuggestion(editId) {
    const edit = _editStore[editId];
    const card = document.getElementById('edit_' + editId);
    if (!edit || !card || !docPaneOpen) {
      return;
    }
    clearDocSuggestionFocus();
    card.classList.add('focused');
    _activeEditCardId = editId;
    if (docEditMode) {
      focusDocEditorSelection(edit);
      return;
    }
    const target = resolveDocHighlightNode(edit);
    if (!target) {
      return;
    }
    target.classList.add('doc-suggestion-highlight');
    _activeDocHighlightNode = target;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  function renderEditCards(edits) {
    _editCounter++;
    const batchId = 'batch' + _editCounter;
    let html = '<div class="edit-proposals">';

    edits.forEach((edit, i) => {
      const editId = batchId + '_' + i;
      _editStore[editId] = edit;

      const ctxBefore = edit.context_before ? `<div class="edit-card-context">${esc(edit.context_before)}</div>` : '';
      const ctxAfter = edit.context_after ? `<div class="edit-card-context">${esc(edit.context_after)}</div>` : '';
      const oldBlock = `<div class="edit-card-old">${edit.old ? esc(edit.old) : ''}</div>`;
      const newBlock = `<div class="edit-card-new">${edit.new ? esc(edit.new) : ''}</div>`;

      html += `
        <div class="edit-card" id="edit_${editId}" onclick="focusEditSuggestion('${editId}')">
          <div class="edit-card-label">
            <span>${esc(edit.description || 'Edit ' + (i + 1))}</span>
            <span class="edit-status" id="editStatus_${editId}"></span>
          </div>
          <div class="edit-card-diff">
            ${ctxBefore}
            ${oldBlock}
            ${newBlock}
            ${ctxAfter}
          </div>
          <div class="edit-card-actions" id="editActions_${editId}">
            <button class="btn-decline" onclick="event.stopPropagation(); declineEdit('${editId}')">Decline</button>
            <button class="btn-accept" onclick="event.stopPropagation(); applyEdit('${editId}')">Accept</button>
          </div>
        </div>`;
    });

    if (edits.length > 1) {
      html += `<div style="display:flex; justify-content:flex-end; padding-top:4px;">
        <button class="btn-accept btn-accept-all"
                onclick="acceptAllEdits('${batchId}', ${edits.length})">Accept All</button>
      </div>`;
    }

    html += '</div>';
    return html;
  }

  function acceptAllEdits(batchId, count) {
    for (let i = 0; i < count; i++) {
      const editId = batchId + '_' + i;
      const card = document.getElementById('edit_' + editId);
      if (card && !card.classList.contains('accepted') && !card.classList.contains('declined')) {
        applyEdit(editId);
      }
    }
  }

  function lockEditCardActions(card, doneAction) {
    const acceptButton = card.querySelector('.btn-accept');
    const declineButton = card.querySelector('.btn-decline');
    if (acceptButton) {
      acceptButton.disabled = true;
      acceptButton.classList.toggle('done', doneAction === 'accept');
    }
    if (declineButton) {
      declineButton.disabled = true;
      declineButton.classList.toggle('done', doneAction === 'decline');
    }
  }

  function findInsertionPoint(documentText, contextBefore, contextAfter) {
    const before = contextBefore || '';
    const after = contextAfter || '';
    if (!before && !after) {
      return documentText.length;
    }
    if (before && after) {
      const exactPos = documentText.lastIndexOf(before + after);
      if (exactPos !== -1) {
        return exactPos + before.length;
      }
      const beforePos = documentText.lastIndexOf(before);
      if (beforePos !== -1) {
        const candidate = beforePos + before.length;
        const afterPos = documentText.indexOf(after, candidate);
        if (afterPos !== -1) {
          return afterPos;
        }
        return candidate;
      }
      return documentText.indexOf(after);
    }
    if (before) {
      const beforePos = documentText.lastIndexOf(before);
      if (beforePos === -1) {
        return -1;
      }
      return beforePos + before.length;
    }
    return documentText.indexOf(after);
  }

  function findReplaceIndex(documentText, oldText, contextBefore, contextAfter) {
    if (!oldText) {
      return -1;
    }
    const before = contextBefore || '';
    const after = contextAfter || '';
    const matches = [];
    let searchStart = 0;
    while (searchStart <= documentText.length) {
      const index = documentText.indexOf(oldText, searchStart);
      if (index === -1) {
        break;
      }
      const beforeMatches = !before || (
        index >= before.length
        && documentText.slice(index - before.length, index) === before
      );
      const afterMatches = !after || (
        documentText.slice(index + oldText.length, index + oldText.length + after.length) === after
      );
      if (beforeMatches && afterMatches) {
        matches.push(index);
      }
      searchStart = index + Math.max(1, oldText.length);
    }
    if (matches.length) {
      if (before && !after) {
        return matches[matches.length - 1];
      }
      return matches[0];
    }
    if (before && !after) {
      return documentText.lastIndexOf(oldText);
    }
    return documentText.indexOf(oldText);
  }

  function applyEdit(editId) {
    const edit = _editStore[editId];
    if (!edit || currentDocument == null) return;

    const card = document.getElementById('edit_' + editId);
    const status = document.getElementById('editStatus_' + editId);
    if (!card || card.classList.contains('accepted') || card.classList.contains('declined')) {
      return;
    }

    let searchStr = edit.old;
    let replaceStr = edit.new || '';

    if (searchStr === '' || searchStr === undefined) {
      const insertPos = findInsertionPoint(
        currentDocument,
        edit.context_before,
        edit.context_after,
      );
      if (insertPos === -1) {
        markConflict(card, status);
        return;
      }
      currentDocument = (
        currentDocument.slice(0, insertPos)
        + replaceStr
        + currentDocument.slice(insertPos)
      );
    } else {
      const pos = findReplaceIndex(
        currentDocument,
        searchStr,
        edit.context_before,
        edit.context_after,
      );
      if (pos === -1) {
        markConflict(card, status);
        return;
      } else {
        currentDocument = (
          currentDocument.slice(0, pos)
          + replaceStr
          + currentDocument.slice(pos + searchStr.length)
        );
      }
    }

    document.getElementById('docContent').innerHTML = md(currentDocument);
    if (docEditMode) {
      document.getElementById('docEditor').value = currentDocument;
    }

    // Save to server
    saveDocumentEdit();

    // Visual feedback
    card.classList.add('accepted');
    status.textContent = 'Applied';
    status.className = 'edit-status status-accepted';
    lockEditCardActions(card, 'accept');
    focusEditSuggestion(editId);
  }

  function declineEdit(editId) {
    const card = document.getElementById('edit_' + editId);
    const status = document.getElementById('editStatus_' + editId);
    if (!card || card.classList.contains('accepted') || card.classList.contains('declined')) {
      return;
    }

    card.classList.add('declined');
    status.textContent = 'Declined';
    status.className = 'edit-status status-declined';
    lockEditCardActions(card, 'decline');
  }

  function markConflict(card, status) {
    card.classList.add('declined');
    status.textContent = 'Conflict';
    status.className = 'edit-status status-conflict';
  }

  // --- New chat ---
  function newChat() {
    currentConversationId = null;
    currentMode = null;
    clearComposerModeLock();
    pendingAttachments = [];
    renderAttachmentList();
    setComposerCentered(true);
    document.getElementById("welcome").style.display = "none";
    document.getElementById("messages").style.display = "none";
    document.getElementById("messageContainer").innerHTML = "";
    const input = document.getElementById("input");
    input.value = "";
    autoResize(input);
    input.focus();
    if (docPaneOpen) closeDocPane();
    loadHistory();
  }

  // --- Document pane ---
  function openDocPane(content, title) {
    clearDocSuggestionFocus();
    currentDocument = content;
    document.getElementById("docContent").innerHTML = md(content);

    // If already open, just update content — preserve user's width adjustment
    if (docPaneOpen) {
      if (docEditMode) {
        document.getElementById('docEditor').value = content;
      }
      return;
    }

    document.getElementById("docTitle").textContent = title || "Document";
    document.getElementById("docModeToggle").style.display = "flex";
    docPaneOpen = true;
    docDirty = false;
    setDocMode('preview');

    // Auto-collapse sidebar to give space
    if (!sidebarCollapsed) toggleSidebar();

    const main = document.getElementById("mainArea");
    const docPane = document.getElementById("docPane");
    const divider = document.getElementById("dragDivider");

    // Lock main at its current computed width (gives the transition a start point)
    main.style.flex = 'none';
    main.style.width = main.offsetWidth + 'px';
    main.style.minWidth = '280px';

    // Open doc pane — flex:1 fills remaining space as main shrinks
    divider.classList.add("active");
    docPane.classList.add("open");
    docPane.style.minWidth = '0';   // override min-width during animation
    docPane.style.opacity = '0';

    // Force layout reflow so the browser registers the starting state
    void main.offsetWidth;

    // Animate: main shrinks, doc pane content fades in
    main.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    main.style.width = '280px';
    docPane.style.transition = 'opacity 0.45s ease 0.12s';
    docPane.style.opacity = '1';

    // After animation settles, apply final classes and clean up inline styles
    setTimeout(() => {
      main.classList.add('doc-active');
      main.style.transition = '';
      docPane.style.minWidth = '';
      docPane.style.transition = '';
      docPane.style.opacity = '';
    }, 560);
  }

  function closeDocPane() {
    clearDocSuggestionFocus();
    const main = document.getElementById("mainArea");
    const docPane = document.getElementById("docPane");
    const divider = document.getElementById("dragDivider");

    // Fade out doc content
    docPane.style.transition = 'opacity 0.25s ease';
    docPane.style.opacity = '0';

    // Expand main back to full width
    main.classList.remove("doc-active");
    const targetW = window.innerWidth - (sidebarCollapsed ? 0 : 280);
    main.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    main.style.width = targetW + 'px';

    setTimeout(() => {
      docPane.classList.remove("open");
      divider.classList.remove("active");
      document.getElementById("docModeToggle").style.display = "none";
      // Reset main to normal flex layout
      main.style.flex = '';
      main.style.width = '';
      main.style.minWidth = '';
      main.style.transition = '';
      docPane.style.transition = '';
      docPane.style.opacity = '';
      docPaneOpen = false;
      currentDocument = null;
    }, 420);
  }

  // --- Document editor (Stage 3) ---
  let docEditMode = false;
  let docDirty = false;
  let docSaveTimer = null;

  function setDocMode(mode) {
    clearDocSuggestionFocus();
    docEditMode = (mode === 'edit');
    const body = document.getElementById('docBody');

    if (docEditMode) {
      document.getElementById('docEditor').value = currentDocument ?? '';
      body.classList.add('editing');
    } else {
      const editorValue = document.getElementById('docEditor').value;
      if (docDirty) {
        currentDocument = editorValue;
        saveDocumentEdit();
      }
      const previewSource = currentDocument ?? editorValue ?? '';
      document.getElementById('docContent').innerHTML = md(previewSource);
      body.classList.remove('editing');
    }

    document.getElementById('btnDocPreview').classList.toggle('active', !docEditMode);
    document.getElementById('btnDocEdit').classList.toggle('active', docEditMode);
  }

  function onDocEdit() {
    docDirty = true;
    document.getElementById('docSaveStatus').textContent = 'Unsaved changes';
    clearTimeout(docSaveTimer);
    docSaveTimer = setTimeout(() => {
      currentDocument = document.getElementById('docEditor').value;
      saveDocumentEdit();
    }, 2000);
  }

  async function saveDocumentEdit() {
    if (!currentConversationId || currentDocument == null) return;
    try {
      await apiFetch(`/api/conversations/${currentConversationId}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: currentDocument }),
      });
      docDirty = false;
      document.getElementById('docSaveStatus').textContent = 'Saved';
      setTimeout(() => {
        document.getElementById('docSaveStatus').textContent = '';
      }, 2000);
    } catch (e) {
      console.error('Failed to save document', e);
      document.getElementById('docSaveStatus').textContent = 'Save failed';
    }
  }

  // --- Drag divider ---
  (function initDragDivider() {
    const divider = document.getElementById('dragDivider');
    const main = document.getElementById('mainArea');
    let dragging = false;

    divider.addEventListener('mousedown', (e) => {
      if (!docPaneOpen) return;
      dragging = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const minW = 280;
      const maxW = window.innerWidth * 0.5;
      const newW = Math.max(minW, Math.min(maxW, e.clientX));
      main.style.width = newW + 'px';
      main.style.transition = 'none';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      main.style.transition = '';
    });
  })();

  // --- Progress helpers ---
  const _CHECK_SVG = '<svg class="step-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  const _SPINNER_HTML = '<div class="step-spinner"></div>';
  const _ERROR_HTML = '<span class="step-error">✕</span>';
  const _stepTimers = {};

  function addProgressStep(id, label) {
    const steps = document.getElementById("progressSteps");
    if (!steps) return;
    _stepTimers[id] = performance.now();
    steps.insertAdjacentHTML("beforeend",
      `<div class="progress-step active" id="step-${id}">
        <span class="step-icon">${_SPINNER_HTML}</span>
        <span class="step-label">${label}</span>
      </div>`);
    const msgs = document.getElementById("messages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function completeProgressStep(id, error) {
    const step = document.getElementById("step-" + id);
    if (!step) return;
    step.classList.remove("active");
    step.classList.add("done");
    const icon = step.querySelector(".step-icon");
    if (icon) icon.innerHTML = error ? _ERROR_HTML : _CHECK_SVG;
    if (_stepTimers[id]) {
      const elapsed = ((performance.now() - _stepTimers[id]) / 1000).toFixed(1);
      const label = step.querySelector(".step-label");
      if (label) label.textContent += ` — ${elapsed}s`;
    }
  }

  // --- Send ---
  async function send() {
    const input = document.getElementById("input");
    const rawPrompt = input.value.trim();
    const attachmentsForSend = pendingAttachments.slice();
    const previousConversationId = currentConversationId;
    const previousMode = currentMode;
    if ((!rawPrompt && attachmentsForSend.length === 0) || loading || !authSession) return;
    const prompt = buildPromptWithAttachments(rawPrompt, attachmentsForSend);

    // Explicit @prefix wins, otherwise inherit last mode, default to chat
    const detected = detectMode(rawPrompt);
    const mode = (composerModeLock && composerModeLock.mode) || detected || currentMode || "chat";
    let requestConversationId = currentConversationId;
    let docPlusContext = null;
    if (mode === "doc_plus" && currentMode !== "doc_plus") {
      docPlusContext = await openDocPlusWizard();
      if (!docPlusContext) return;
      if (currentConversationId) {
        newChat();
      }
      requestConversationId = null;
    }
    const isStreaming = mode === "pr" || mode === "consensus";

    const thinkingTexts = {
      help: 'Opening help...',
      doc: "Working on document...",
      doc_plus: "Working on document...",
      pr: "Reviewing with four models",
      consensus: "Querying four models",
      grok: "Asking Grok...",
      gemini: "Asking Gemini...",
      gpt: "Asking GPT...",
      chat: "Thinking...",
    };
    const thinkingText = thinkingTexts[mode] || "Thinking...";
    const attachmentNames = attachmentsForSend.map((attachment) => attachment.name);

    loading = true;
    setComposerCentered(false);
    pendingAttachments = [];
    renderAttachmentList();
    input.value = "";
    autoResize(input);
    document.getElementById("btnSend").disabled = true;

    // Show user message
    document.getElementById("welcome").style.display = "none";
    const msgs = document.getElementById("messages");
    msgs.style.display = "block";
    const container = document.getElementById("messageContainer");

    container.innerHTML += `
      <div class="message user">
        <div class="message-bubble">${renderUserPromptBubbleHtml(rawPrompt, attachmentNames)}</div>
      </div>`;

    if (isStreaming) {
      // Progress tracker for PR / consensus
      container.innerHTML += `
        <div id="thinkingBlock" class="progress-tracker">
          <div class="progress-header">
            <div class="thinking-dots"><span></span><span></span><span></span></div>
            <span>${thinkingText}</span>
          </div>
          <div class="progress-steps" id="progressSteps"></div>
        </div>`;
    } else {
      container.innerHTML += `
        <div id="thinkingBlock" class="thinking">
          <div class="thinking-dots"><span></span><span></span><span></span></div>
          ${thinkingText}
        </div>`;
    }
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await apiFetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          conversation_id: requestConversationId,
          doc_plus_context: docPlusContext,
          mode,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // --- SSE streaming ---
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalData = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const evt = JSON.parse(line.slice(6));

            if (evt.event === "fetching_pr") {
              addProgressStep("fetch", "Fetching PR");
            } else if (evt.event === "pr_fetched") {
              completeProgressStep("fetch");
            } else if (evt.event === "models_started") {
              addProgressStep("claude", "Claude");
              addProgressStep("gpt", "GPT");
              addProgressStep("grok", "Grok");
              addProgressStep("gemini", "Gemini");
            } else if (evt.event === "model_done") {
              completeProgressStep(evt.model, evt.error);
            } else if (evt.event === "synthesizing") {
              addProgressStep("synthesis", "Synthesizing");
            } else if (evt.event === "done") {
              finalData = evt;
            } else if (evt.event === "error") {
              throw new Error(evt.detail || "Stream error");
            }
          }
        }

        if (!finalData) throw new Error("Stream ended without result");

        currentConversationId = finalData.conversation_id;
        currentMode = finalData.mode;

        const thinking = document.getElementById("thinkingBlock");
        if (thinking) thinking.remove();

        container.innerHTML += `
          <div class="message ai">
            <div class="message-bubble prose">${md(finalData.response)}</div>
            ${copyBtnHtml(finalData.response)}
          </div>`;
        msgs.scrollTop = msgs.scrollHeight;

      } else {
        // --- JSON (chat + doc modes) ---
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Request failed");

        if (data.mode === 'help') {
          currentConversationId = previousConversationId;
          currentMode = previousMode;
        } else {
          currentConversationId = data.conversation_id;
          currentMode = data.mode;
        }

        const thinking = document.getElementById("thinkingBlock");
        if (thinking) thinking.remove();

        // Build response HTML — may include edit proposal cards
        let responseHtml = `
          <div class="message ai">
            <div class="message-bubble prose">${md(data.response)}</div>`;

        if (data.edits && data.edits.length > 0) {
          responseHtml += renderEditCards(data.edits);
        }

        responseHtml += `${copyBtnHtml(data.response)}
          </div>`;

        container.innerHTML += responseHtml;
        msgs.scrollTop = msgs.scrollHeight;

        // Doc mode: open/update document pane (full doc — creation or rewrite)
        if (data.document) {
        const docTitle = stripDocPromptPrefix(rawPrompt).substring(0, 60) || attachmentsForSend[0]?.name || "Document";
          openDocPane(data.document, docTitle);
        }
      }

      await loadHistory();

    } catch (e) {
      const thinking = document.getElementById("thinkingBlock");
      if (thinking) thinking.remove();
      container.innerHTML += `
        <div class="message ai">
          <div class="message-bubble" style="color:#b91c1c">${esc(e.message)}</div>
        </div>`;
    } finally {
      loading = false;
      document.getElementById("btnSend").disabled = false;
    }
  }

  // --- Helpers ---
  function shouldClearModeLockByDeleteKey(e, input) {
    if (!composerModeLock) {
      return false;
    }
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    if (!atStart) {
      return false;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      clearComposerModeLock();
      return true;
    }
    return false;
  }

  function shouldClearModeLockByCutShortcut(e) {
    if (!composerModeLock) {
      return false;
    }
    const isCutShortcut = (e.key === 'x' || e.key === 'X') && (e.metaKey || e.ctrlKey);
    if (!isCutShortcut) {
      return false;
    }
    clearComposerModeLock();
    return true;
  }

  function shouldApplyModeLockBySpace(e, input) {
    if (composerModeLock) {
      return false;
    }
    if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey) {
      return false;
    }
    if (input.selectionStart !== input.selectionEnd) {
      return false;
    }
    if (input.selectionStart !== input.value.length) {
      return false;
    }
    const modeLock = resolveModeLockToken(input.value);
    if (!modeLock) {
      return false;
    }
    e.preventDefault();
    setComposerModeLock(modeLock.token, modeLock.mode);
    input.value = '';
    autoResize(input);
    return true;
  }

  function handleKey(e) {
    const input = e.target;
    if (!input) {
      return;
    }
    if (shouldApplyModeLockBySpace(e, input)) {
      return;
    }
    if (shouldClearModeLockByDeleteKey(e, input)) {
      return;
    }
    if (shouldClearModeLockByCutShortcut(e)) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el) {
    const inputWrap = el.closest('.input-wrap');
    if (inputWrap) {
      inputWrap.classList.remove('multiline');
    }
    el.style.height = "auto";
    const isEmpty = el.value.trim().length === 0;
    if (isEmpty) {
      const computedStyle = window.getComputedStyle(el);
      const singleLineHeight = Math.ceil(
        (parseFloat(computedStyle.lineHeight) || 20)
        + (parseFloat(computedStyle.paddingTop) || 0)
        + (parseFloat(computedStyle.paddingBottom) || 0)
        + (parseFloat(computedStyle.borderTopWidth) || 0)
        + (parseFloat(computedStyle.borderBottomWidth) || 0),
      );
      el.style.height = `${singleLineHeight}px`;
      el.style.overflowY = "hidden";
      if (composerModeLock) {
        renderComposerModeLock();
      }
      return;
    }
    const baseScrollHeight = el.scrollHeight;
    const hasExplicitLineBreak = el.value.includes('\n');
    const isMultiline = hasExplicitLineBreak || (
      baseScrollHeight > COMPOSER_MULTILINE_SCROLL_THRESHOLD_PX
    );
    if (inputWrap) {
      inputWrap.classList.toggle('multiline', isMultiline);
    }

    el.style.height = "auto";
    const max = 160;
    const fullScrollHeight = el.scrollHeight;
    const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 20;
    const paddingTop = parseFloat(window.getComputedStyle(el).paddingTop) || 0;
    const explicitLineCount = hasExplicitLineBreak
      ? el.value.split('\n').length
      : 0;
    const explicitLineHeightEstimate = explicitLineCount
      ? (explicitLineCount * lineHeight) + paddingTop + COMPOSER_MULTILINE_PADDING_BOTTOM_PX
      : 0;
    const effectiveScrollHeight = Math.max(
      fullScrollHeight,
      explicitLineHeightEstimate,
    );
    const h = Math.min(effectiveScrollHeight, max);
    el.style.height = h + "px";
    el.style.overflowY = effectiveScrollHeight > max ? "auto" : "hidden";
    if (composerModeLock) {
      renderComposerModeLock();
    }
  }

  function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function md(s) {
    if (!s) return "";
    return marked.parse(s);
  }

  // --- Copy to clipboard ---
  const _responseStore = {};
  let _responseCounter = 0;

  function storeResponse(text) {
    const id = "r" + (++_responseCounter);
    _responseStore[id] = text;
    return id;
  }

  function copyBtnHtml(rawText) {
    const id = storeResponse(rawText);
    return `<button class="btn-copy" data-rid="${id}" onclick="copyResponse(this)">
      <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      <span>Copy</span>
    </button>`;
  }

  async function copyResponse(btn) {
    const text = _responseStore[btn.getAttribute("data-rid")];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const svg = btn.querySelector("svg");
      const label = btn.querySelector("span");
      svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
      label.textContent = "Copied";
      setTimeout(() => {
        svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
        label.textContent = "Copy";
      }, 1500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  }

  // =========================================================
  // Typography settings
  // =========================================================

  const TYPO_DEFAULTS = {
    fontFamily: "engineer",
    fontSize: 15,
    lineHeight: 1.75,
    headingWeight: 600,
    headingLineHeight: 1.3,
    headingLetterSpacing: -0.02,
    headingScale: 1,
    contentWidth: 720,
    paragraphSpacing: 1.15,
    headingGap: 1,
    listIndent: 1.5,
    codeFontSize: 0.875,
    codeBlockRadius: 8,
    textColor: "#121212",
    headingColor: "#121212",
    linkColor: "#44403c",
    blockquoteBorderColor: "#d6d3d1",
    blockquoteTextColor: "#57534e",
  };

  const TYPO_LIGHT_COLOR_DEFAULTS = {
    textColor: "#121212",
    headingColor: "#121212",
    linkColor: "#44403c",
    blockquoteBorderColor: "#d6d3d1",
    blockquoteTextColor: "#57534e",
  };

  const TYPO_DARK_COLOR_DEFAULTS = {
    textColor: "#F3F3F3",
    headingColor: "#F8F8F8",
    linkColor: "#C4E8F4",
    blockquoteBorderColor: "#444444",
    blockquoteTextColor: "#D3D3D3",
  };

  const TYPO_LIGHT_COLOR_ALIASES = {
    textColor: new Set(["#121212", "#1c1917"]),
    headingColor: new Set(["#121212", "#0c0a09"]),
    linkColor: new Set(["#44403c"]),
    blockquoteBorderColor: new Set(["#d6d3d1"]),
    blockquoteTextColor: new Set(["#57534e"]),
  };

  const TYPO_ARCHETYPES = {
    engineer: {
      body: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      heading: '"Rajdhani", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    },
    editor: {
      body: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      heading: '"Playfair Display", "Lato", Georgia, "Times New Roman", serif',
    },
    minimalist: {
      body: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      heading: '"Space Grotesk", "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    },
    companion: {
      body: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      heading: '"Rubik", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    },
    auteur: {
      body: '"Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      heading: '"Syne", "Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    },
  };

  const TYPO_HEADING_BASE_SIZES = {
    h1: 22.5,
    h2: 18.75,
    h3: 16.5,
    h4: 15,
  };

  function normalizeTypoSettings(settings) {
    const normalized = Object.assign({}, TYPO_DEFAULTS, settings || {});
    if (!TYPO_ARCHETYPES[normalized.fontFamily]) {
      normalized.fontFamily = TYPO_DEFAULTS.fontFamily;
    }
    if (
      typeof normalized.headingLineHeight !== "number" ||
      Number.isNaN(normalized.headingLineHeight)
    ) {
      normalized.headingLineHeight = TYPO_DEFAULTS.headingLineHeight;
    }
    if (
      typeof normalized.headingGap !== "number" ||
      Number.isNaN(normalized.headingGap)
    ) {
      normalized.headingGap = TYPO_DEFAULTS.headingGap;
    }
    return normalized;
  }

  function normalizeColorValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function resolveTypographyColorsForTheme(settings) {
    const resolved = Object.assign({}, settings);
    const isDarkTheme = currentTheme === "dark";
    const colorKeys = [
      "textColor",
      "headingColor",
      "linkColor",
      "blockquoteBorderColor",
      "blockquoteTextColor",
    ];
    if (isDarkTheme) {
      colorKeys.forEach((key) => {
        const current = normalizeColorValue(resolved[key]);
        if (TYPO_LIGHT_COLOR_ALIASES[key].has(current)) {
          resolved[key] = TYPO_DARK_COLOR_DEFAULTS[key];
        }
      });
      return resolved;
    }
    colorKeys.forEach((key) => {
      const current = normalizeColorValue(resolved[key]);
      const darkDefault = normalizeColorValue(TYPO_DARK_COLOR_DEFAULTS[key]);
      if (current === darkDefault) {
        resolved[key] = TYPO_LIGHT_COLOR_DEFAULTS[key];
      }
    });
    return resolved;
  }

  let typographyOpen = false;

  function toggleTypography() {
    typographyOpen = !typographyOpen;
    document.getElementById("settingsPanel").classList.toggle("open", typographyOpen);
    document.getElementById("btnTypography").classList.toggle("active", typographyOpen);
  }

  function onTypoChange() {
    const s = readTypoInputs();
    applyTypography(s);
    updateValueDisplays();
    updateSliderFills();
    clearTimeout(typoSaveTimer);
    typoSaveTimer = setTimeout(() => {
      saveTypoSettings(s);
    }, 250);
  }

  function readTypoInputs() {
    return {
      fontFamily: document.getElementById("typo-font").value,
      fontSize: parseFloat(document.getElementById("typo-size").value),
      lineHeight: parseFloat(document.getElementById("typo-line-height").value),
      headingWeight: parseInt(document.getElementById("typo-heading-weight").value),
      headingLineHeight: parseFloat(document.getElementById("typo-heading-line-height").value),
      headingLetterSpacing: parseFloat(document.getElementById("typo-heading-spacing").value),
      headingScale: parseFloat(document.getElementById("typo-heading-scale").value),
      contentWidth: parseInt(document.getElementById("typo-content-width").value),
      paragraphSpacing: parseFloat(document.getElementById("typo-paragraph").value),
      headingGap: parseFloat(document.getElementById("typo-heading-gap").value),
      listIndent: parseFloat(document.getElementById("typo-list-indent").value),
      codeFontSize: parseFloat(document.getElementById("typo-code-size").value),
      codeBlockRadius: parseInt(document.getElementById("typo-code-radius").value),
      textColor: document.getElementById("typo-text-color").value,
      headingColor: document.getElementById("typo-heading-color").value,
      linkColor: document.getElementById("typo-link-color").value,
      blockquoteBorderColor: document.getElementById("typo-quote-border").value,
      blockquoteTextColor: document.getElementById("typo-quote-text").value,
    };
  }

  function applyTypography(s) {
    const root = document.documentElement;
    const themeAwareSettings = resolveTypographyColorsForTheme(s);
    const archetype = TYPO_ARCHETYPES[s.fontFamily] || TYPO_ARCHETYPES.engineer;
    const h1Weight = themeAwareSettings.headingWeight;
    const h2Weight = Math.max(300, h1Weight - 200);
    const h3Weight = Math.max(300, h1Weight - 300);
    const headingScale = themeAwareSettings.headingScale;
    root.style.setProperty("--prose-font-family", archetype.body);
    root.style.setProperty("--prose-heading-font-family", archetype.heading);
    root.style.setProperty("--prose-body-weight", "400");
    root.style.setProperty("--prose-font-size", themeAwareSettings.fontSize + "px");
    root.style.setProperty("--prose-line-height", themeAwareSettings.lineHeight);
    root.style.setProperty("--prose-color", themeAwareSettings.textColor);
    root.style.setProperty("--prose-heading-weight", themeAwareSettings.headingWeight);
    root.style.setProperty("--prose-h1-weight", h1Weight);
    root.style.setProperty("--prose-h2-weight", h2Weight);
    root.style.setProperty("--prose-h3-weight", h3Weight);
    root.style.setProperty("--prose-h4-weight", h3Weight);
    root.style.setProperty("--prose-h1-size", (TYPO_HEADING_BASE_SIZES.h1 * headingScale) + "px");
    root.style.setProperty("--prose-h2-size", (TYPO_HEADING_BASE_SIZES.h2 * headingScale) + "px");
    root.style.setProperty("--prose-h3-size", (TYPO_HEADING_BASE_SIZES.h3 * headingScale) + "px");
    root.style.setProperty("--prose-h4-size", (TYPO_HEADING_BASE_SIZES.h4 * headingScale) + "px");
    root.style.setProperty("--prose-heading-line-height", themeAwareSettings.headingLineHeight);
    root.style.setProperty("--prose-heading-letter-spacing", themeAwareSettings.headingLetterSpacing + "em");
    root.style.setProperty("--prose-heading-scale", themeAwareSettings.headingScale);
    root.style.setProperty("--prose-heading-margin-bottom", themeAwareSettings.headingGap + "em");
    root.style.setProperty("--prose-heading-color", themeAwareSettings.headingColor);
    root.style.setProperty("--prose-paragraph-spacing", themeAwareSettings.paragraphSpacing + "em");
    root.style.setProperty("--prose-list-indent", themeAwareSettings.listIndent + "em");
    root.style.setProperty("--prose-list-item-spacing", "0.35em");
    root.style.setProperty("--prose-code-font-size", themeAwareSettings.codeFontSize + "em");
    root.style.setProperty("--prose-code-block-radius", themeAwareSettings.codeBlockRadius + "px");
    root.style.setProperty("--prose-link-color", themeAwareSettings.linkColor);
    root.style.setProperty("--prose-link-underline-color", themeAwareSettings.linkColor + "4D");
    root.style.setProperty("--prose-blockquote-border-color", themeAwareSettings.blockquoteBorderColor);
    root.style.setProperty("--prose-blockquote-text-color", themeAwareSettings.blockquoteTextColor);
    root.style.setProperty("--prose-content-width", themeAwareSettings.contentWidth + "px");
  }

  function populateTypoInputs(s) {
    const safeFontFamily = TYPO_ARCHETYPES[s.fontFamily]
      ? s.fontFamily
      : TYPO_DEFAULTS.fontFamily;
    document.getElementById("typo-font").value = safeFontFamily;
    document.getElementById("typo-size").value = s.fontSize;
    document.getElementById("typo-line-height").value = s.lineHeight;
    document.getElementById("typo-heading-weight").value = s.headingWeight;
    document.getElementById("typo-heading-line-height").value = s.headingLineHeight;
    document.getElementById("typo-heading-spacing").value = s.headingLetterSpacing;
    document.getElementById("typo-heading-scale").value = s.headingScale;
    document.getElementById("typo-content-width").value = s.contentWidth;
    document.getElementById("typo-paragraph").value = s.paragraphSpacing;
    document.getElementById("typo-heading-gap").value = s.headingGap;
    document.getElementById("typo-list-indent").value = s.listIndent;
    document.getElementById("typo-code-size").value = s.codeFontSize;
    document.getElementById("typo-code-radius").value = s.codeBlockRadius;
    document.getElementById("typo-text-color").value = s.textColor;
    document.getElementById("typo-heading-color").value = s.headingColor;
    document.getElementById("typo-link-color").value = s.linkColor;
    document.getElementById("typo-quote-border").value = s.blockquoteBorderColor;
    document.getElementById("typo-quote-text").value = s.blockquoteTextColor;
    updateValueDisplays();
    updateSliderFills();
  }

  function updateValueDisplays() {
    const v = (id) => document.getElementById(id).value;
    const d = (id, text) => { const el = document.getElementById(id + "-value"); if (el) el.textContent = text; };
    d("typo-size", v("typo-size") + "px");
    d("typo-line-height", parseFloat(v("typo-line-height")).toFixed(2));
    d("typo-heading-weight", v("typo-heading-weight"));
    d("typo-heading-line-height", parseFloat(v("typo-heading-line-height")).toFixed(2));
    d("typo-heading-spacing", parseFloat(v("typo-heading-spacing")).toFixed(3));
    d("typo-heading-scale", parseFloat(v("typo-heading-scale")).toFixed(2) + "\u00d7");
    d("typo-content-width", v("typo-content-width") + "px");
    d("typo-paragraph", parseFloat(v("typo-paragraph")).toFixed(2) + "em");
    d("typo-heading-gap", parseFloat(v("typo-heading-gap")).toFixed(1) + "em");
    d("typo-list-indent", parseFloat(v("typo-list-indent")).toFixed(1) + "em");
    d("typo-code-size", parseFloat(v("typo-code-size")).toFixed(3) + "em");
    d("typo-code-radius", v("typo-code-radius") + "px");
  }

  function updateSliderFills() {
    document.querySelectorAll(".settings-panel input[type='range']").forEach(updateSliderFill);
  }

  function updateSliderFill(slider) {
    const pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = "linear-gradient(to right, var(--text-muted) " + pct + "%, var(--border) " + pct + "%)";
  }

  async function saveTypoSettings(s) {
    if (!authSession) return;
    const nextSettings = Object.assign({}, persistedUserSettings, s);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      persistedUserSettings = nextSettings;
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  async function loadTypoSettings() {
    if (!authSession) {
      persistedUserSettings = {};
      return normalizeTypoSettings();
    }
    try {
      const res = await apiFetch('/api/settings');
      if (!res.ok) {
        persistedUserSettings = {};
        return normalizeTypoSettings();
      }
      const data = await res.json();
      persistedUserSettings = data.settings || {};
      return normalizeTypoSettings(persistedUserSettings);
    } catch (e) {
      persistedUserSettings = {};
      return normalizeTypoSettings();
    }
  }

  function resetTypography() {
    populateTypoInputs(TYPO_DEFAULTS);
    applyTypography(TYPO_DEFAULTS);
    saveTypoSettings(TYPO_DEFAULTS);
  }

  async function initTypography() {
    const settings = await loadTypoSettings();
    const theme = resolvePreferredTheme(settings);
    applyTheme(theme);
    writeLocalThemePreference(theme);
    const themeAwareSettings = resolveTypographyColorsForTheme(settings);
    applyTypography(themeAwareSettings);
    populateTypoInputs(themeAwareSettings);
  }

Object.assign(window, {
  acceptAllEdits,
  applyEdit,
  autoResize,
  closeDocPane,
  copyDocument,
  copyResponse,
  declineEdit,
  deleteChat,
  focusEditSuggestion,
  handleAttachmentSelection,
  handleKey,
  loadConversation,
  newChat,
  onChatItemClick,
  onDocEdit,
  onTypoChange,
  openAttachmentPicker,
  removeAttachment,
  resetTypography,
  send,
  sendMagicLink,
  setDocMode,
  signOut,
  startRename,
  toggleSidebar,
  toggleTheme,
  toggleTypography,
});
