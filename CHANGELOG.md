[Deterministic CHANGELOG Update Rules](https://raw.githubusercontent.com/Vaquum/dev-docs/refs/heads/main/src/Updating-Changelog.md)

# Changelog

## v0.4.0 on 25th of February, 2026

- Add `GET /api/conversations/{conversation_id}` for conversation retrieval by `conversation_id`.
- Add conversation continuity with multi-turn history across regular chat and consensus flows.
- Add sidebar rendering of conversations (first prompt as title) instead of individual messages.
- Add support for Gemini multi-turn history via `Content` objects with `role='model'`.
- Add support for mode lock per conversation based on the first message mode.
- Refactor query functions to accept message history instead of a single prompt.
- Update database migration to add `conversation_id` and `position` and backfill existing rows.

## v0.3.0 on 25th of February, 2026

- Add `/consensus` mode for multi-model synthesis.
- Add sidebar mode labels (`chat` / `consensus`) per conversation entry.
- Add thinking indicator text variants by active mode.
- Update consensus execution to query all four models before synthesis.
- Update database schema to add `mode` and `response` columns.
- Update default mode to regular Claude chat.
- Update regular mode to send prompts directly to Claude Opus 4.6.

## v0.2.0 on 24th of February, 2026

- Add API endpoints `GET /api/opinions`, `GET /api/opinions/{id}`, and `POST /api/opinions`.
- Add chat GUI served at `/`.
- Add left sidebar with full chat history.
- Add new chat button for revisiting past chats.
- Add thinking indicator while models are queried.

## v0.1.0 on 24th of February, 2026

- Add API key loading from `.env` files and environment variables.
- Add CLI flow that queries Claude, GPT, Grok, and Gemini in parallel.
- Add FastAPI endpoint `POST /opinions`.
- Add SQLite persistence for each query, model responses, and synthesis.
- Add synthesis step where Claude combines all four model responses.

## v0.4.1 on 27th of February, 2026

- Add compatibility module `server.py` so `uvicorn server:app` works from project root.
- Fix `confab/core.py` imports to support direct execution context inside `confab`.
- Fix `confab/server.py` imports to support both package and direct execution contexts.
- Update `confab/server.py` static asset loading to read from package resources or local `static` paths based on execution context.

## v0.5.0 on 27th of February, 2026

- Add email magic-link sign-in flow backed by Supabase auth in `confab/static/gui.html`.
- Add token validation against Supabase `auth/v1/user` for all `/api/*` data endpoints in `confab/server.py`.
- Add strict user scoping for conversation reads and writes via `opinions.user_id` in `confab/db.py`.
- Add per-user persisted typography settings with `GET /api/settings` and `PUT /api/settings`.
- Update core chat and streaming pipelines to pass `user_id` through all persistence calls.

## v0.5.1 on 27th of February, 2026

- Add backend email-domain enforcement so only `@<your-domain>` users can access authenticated API routes.
- Add frontend email-domain validation to block magic-link requests for non-`@<your-domain>` addresses.
- Add shared `ALLOWED_EMAIL_DOMAIN` injection from `confab/server.py` into `confab/static/gui.html`.

## v0.5.2 on 27th of February, 2026

- Remove root compatibility module `server.py` from the repository root.
- Standardize server startup on package entrypoint `uvicorn confab.server:app`.

## v0.5.3 on 27th of February, 2026

- Add backend endpoint `POST /api/auth/magic-link` that enforces `ALLOWED_EMAIL_DOMAIN` before requesting Supabase OTP delivery.
- Update login flow in `confab/static/gui.html` to request magic links through backend domain validation.
- Keep authenticated API-route enforcement so non-`@<your-domain>` sessions are rejected even if tokens exist.

## v0.5.4 on 28th of February, 2026

- Add root `README.md` with complete setup runbook for local development, Supabase auth configuration, Resend SMTP wiring, and Render deployment.
- Document required environment variables and redirect URL allowlist behavior for magic-link login.
- Document domain restriction behavior and troubleshooting for SMTP and auth redirect issues.

## v0.5.5 on 28th of February, 2026

- Replace hardcoded domain examples with `<your-domain>` placeholders in docs and UI copy for public repository safety.
- Update auth domain fallback default to `<your-domain>` in `confab/server.py`.

## v0.5.6 on 28th of February, 2026

- Add support for reading login domain restriction from `.env` key `DOMAIN`.
- Update domain-resolution logic in `confab/server.py` to normalize `DOMAIN` (including optional `@` prefix) and use it in auth enforcement.
- Update auth dialog text in `confab/static/gui.html` to render allowed domain dynamically from server-injected config.
- Update `README.md` to document `DOMAIN` as the primary domain configuration key.

## v0.5.7 on 28th of February, 2026

- Add Render Blueprint `render.yaml` with Python web service defaults, `frankfurt` region, and `autoDeploy` enabled.
- Declare Render environment variables for AI provider keys, Supabase credentials, and `DOMAIN`.
- Update `README.md` deployment section with blueprint-based Render setup and post-deploy URL configuration steps.

## v0.5.8 on 28th of February, 2026

- Standardize `pyproject.toml` structure to match the shared Vaquum project template.
- Add project metadata sections for `readme`, `authors`, `license`, optional dependencies, and project URLs.
- Add full Ruff lint configuration blocks aligned with template defaults and set `known-first-party` to `confab`.
- Update setuptools package discovery to template-style `find` configuration while preserving static package data.

## v0.5.9 on 28th of February, 2026

- Refactor `README.md` to strictly follow the Vaquum standard format and keep it focused on immediate app run flow.
- Move full setup and deployment instructions to `docs/Developer/Get-Started.md`.
- Link `README.md` quick start to the new developer guide for complete onboarding details.

## v0.5.10 on 28th of February, 2026

- Update `README.md` Quick Start with three explicit runnable examples for app startup, REST API usage, and CLI usage.
- Keep setup and deployment depth in `docs/Developer/Get-Started.md` while preserving lightweight README onboarding.

## v0.5.11 on 28th of February, 2026

- Add comprehensive API documentation at `docs/Developer/API-Reference.md` covering auth model, endpoint contracts, payload schemas, and SSE event flows.
- Add comprehensive CLI documentation at `docs/Developer/CLI.md` covering command behavior, environment requirements, output semantics, and troubleshooting.

## v0.5.12 on 28th of February, 2026

- Fix auth-provider handling in `confab/server.py` to map upstream outages (`429` and `5xx`) to service-unavailable responses instead of unauthorized user failures.
- Fix auth response parsing in `confab/server.py` to handle invalid JSON from upstream providers without raising internal server errors.
- Fix magic-link UI flow in `confab/static/gui.html` to always re-enable the submit button after network failures.
- Harden legacy migration in `confab/db.py` to enforce non-null `opinions.user_id` on PostgreSQL after backfill.

## v0.6.0 on 28th of February, 2026

- Add Playwright end-to-end harness with `playwright.config.ts` and deterministic browser tests under `e2e/`.
- Add reusable network mocks for Supabase auth and `/api/*` flows in `e2e/support/` to cover full GUI interaction paths without app-code changes.
- Add CI workflow `.github/workflows/pr_checks_playwright.yml` to run Playwright in pull requests and upload failure artifacts.
- Add Node/Playwright ignore rules to `.gitignore` and document local e2e execution in `docs/Developer/Get-Started.md`.

## v0.6.1 on 28th of February, 2026

- Add comprehensive backend endpoint coverage in `tests/test_api_server.py` for public routes, auth gates, magic-link delivery, settings, conversations, and mode-specific `/api/opinions` flows.
- Add deterministic test bootstrap in `tests/run.py` with isolated environment setup for API-key, domain, Supabase, and database configuration.
- Update `.github/workflows/pr_checks_tests.yml` to always execute `tests/run.py` so backend/API coverage runs on every pull request update.

## v0.6.2 on 28th of February, 2026

- Fix test hermeticity in `tests/run.py` by force-setting all test env vars and isolating `DATABASE_URL` under `test-results/` to avoid accidental non-test database usage.
- Fix standard `unittest` robustness in `tests/test_api_server.py` by configuring test environment before importing `confab.server`.
- Fix Playwright test artifact hygiene in `playwright.config.ts` by writing SQLite state to `test-results/confab-e2e.db` instead of repo root.

## v0.6.3 on 28th of February, 2026

- Refactor orchestration internals into modular packages under `confab/config/`, `confab/providers/`, and `confab/services/` to separate configuration, model clients, and workflow logic.
- Add dedicated service modules for chat, document, consensus, PR review, synthesis, mode parsing, and history construction while preserving existing API and CLI behavior.
- Keep `confab/core.py` as a thin facade entrypoint that re-exports the public orchestration surface for server and CLI callers.

## v0.7.0 on 28th of February, 2026

- Add full refactor safety rails with a new CI quality workflow at `.github/workflows/pr_checks_quality.yml` for Python compile/lint/type checks and frontend typecheck/build gates.
- Complete maintainable backend layering with explicit `confab/domain/`, `confab/repositories/`, and `confab/api/` boundaries and route-level repository usage in `confab/server.py`.
- Modularize frontend delivery by extracting inline `gui.html` script/style into `frontend/src/main.ts` and `frontend/src/styles.css`, with Vite build output shipped in `confab/static/app/`.
- Harden API contracts by centralizing request/response models in `confab/api/contracts.py`, adding typed endpoint response models, and expanding API tests to validate app asset serving and SSE done-event contract shape.
- Update developer and deployment operations in `README.md`, `docs/Developer/Get-Started.md`, and `render.yaml` for the new frontend build/check workflow.

## v0.7.1 on 28th of February, 2026

- Fix import bootstrapping in `confab/server.py` so running `uvicorn server:app --reload` from inside `confab/` resolves `confab.*` modules correctly.

## v0.7.2 on 28th of February, 2026

- Add `docs/Developer/Architecture.md` to document refactor boundaries across API, services, providers, domain, repositories, and frontend build outputs.
- Update `docs/Developer/Get-Started.md` with a developer docs map, package-local startup command, generated-asset guidance, CI workflow references, and current Render build command.
- Update `docs/Developer/API-Reference.md` to include `GET /app/{asset_path:path}` and auth-provider status mapping semantics.
- Update `docs/Developer/CLI.md` with refactor-aware module flow and frontend/CLI separation notes.
- Update `README.md` to link developers to `docs/Developer/Architecture.md`.

## v0.7.3 on 28th of February, 2026

- Add configurable Gemini latency defaults in `confab/config/settings.py` for `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_THINKING_BUDGET`, `GEMINI_INCLUDE_THOUGHTS`, and `GEMINI_TIMEOUT_SECONDS` while keeping `GEMINI_MODEL` unchanged.
- Update `confab/providers/llm.py` to apply the new Gemini defaults and an explicit SDK HTTP timeout for `query_gemini`.
- Update `docs/Developer/Get-Started.md` to document the optional Gemini tuning environment variables.

## v0.7.4 on 28th of February, 2026

- Fix Gemini timeout behavior in `confab/providers/llm.py` by retrying once on timeout with the same model, `thinking_budget=0`, and a reduced output-token cap.

## v0.7.5 on 28th of February, 2026

- Fix Gemini SDK timeout units in `confab/providers/llm.py` by converting `GEMINI_TIMEOUT_SECONDS` to milliseconds before passing `HttpOptions(timeout=...)`.
- Fix immediate timeout failures by enforcing a minimum Gemini timeout of `1000` ms.

## v0.7.6 on 28th of February, 2026

- Fix sidebar rename UX in `frontend/src/main.ts` by deferring single-click conversation loading so double-click reliably enters and stays in inline edit mode until explicit save/cancel.
- Update generated frontend bundle in `confab/static/app/gui.js` after the rename interaction fix.

## v0.7.7 on 27th of February, 2026

- Add `/doc+` mode parsing and routing in `confab/domain/modes.py` and `confab/server.py` with persisted doc-profile context enforcement on every doc+ turn.
- Add full six-level Doc+ wizard UI in `frontend/src/main.ts` and `confab/static/gui.html` covering Meta, Whole, Section, Paragraph, Sentence, and Word attribute selections.
- Add internal prompt-wrapper handling in `confab/server.py` so doc+ profile context is stored for continuity while displayed prompts remain user-clean in conversation history endpoints.
- Update `confab/services/documents.py` to support separate persisted prompt text vs. model-facing prompt context and explicit persisted mode.
- Add backend coverage for doc+ behavior in `tests/test_api_server.py` and regenerate frontend assets in `confab/static/app/gui.js` and `confab/static/app/gui.css`.

## v0.7.8 on 27th of February, 2026

- Fix `/doc+` send regression in `frontend/src/main.ts` by correcting wizard selection-state initialization so both Enter and send-button submission correctly proceed to the doc-plus wizard flow.
- Update generated frontend bundle in `confab/static/app/gui.js` after the `/doc+` send fix.

## v0.7.9 on 1st of March, 2026

- Fix doc-plus wizard footer button layout in `frontend/src/styles.css` by applying scoped action-bar overrides so Back and Next have equal height and width.
- Fix doc-plus wizard footer alignment by keeping Back left-aligned and Next right-aligned on a shared vertical centerline.
- Update generated frontend bundle in `confab/static/app/gui.css` after the button alignment and sizing fix.

## v0.7.10 on 1st of March, 2026

- Add dedicated doc-plus end-to-end coverage in `e2e/doc-plus.spec.ts` for both Enter and send-button submission paths, including wizard completion and request assertions.
- Add doc-plus follow-up coverage to ensure subsequent turns in an existing doc-plus conversation do not reopen the wizard and continue with conversation context.
- Update `e2e/support/mockApi.ts` to model `/doc+` as first-class mode (`doc_plus`) so mode-specific UI and API behavior are exercised realistically in Playwright tests.
- Add `e2e/core-paths.ts` as a core-path manifest and reusable mode-matrix scenario source of truth for Playwright coverage planning.
- Add generated mode smoke coverage in `e2e/mode-matrix.spec.ts` so all primary prompt modes (`chat`, `@gpt`, `@grok`, `@gemini`, `/doc`, `/doc+`, `/consensus`, `/pr`) validate send and first-response behavior.
- Add CI fast-fail step in `.github/workflows/pr_checks_playwright.yml` to run mode-matrix smoke tests before the full e2e suite.
- Add npm script `e2e:matrix` in `package.json` for local and CI execution of mode-matrix smoke coverage.

## v0.7.11 on 1st of March, 2026

- Add enforced e2e manifest policy checker `e2e/check-core-paths.mjs` validating core-path ownership, spec-file mapping, unique identifiers, and required mode-matrix coverage.
- Add npm script `e2e:policy` and chain it into `e2e:matrix` so mode smoke runs fail fast when manifest/spec consistency drifts.
- Update Playwright CI in `.github/workflows/pr_checks_playwright.yml` to run `npm run e2e:policy` before smoke and full suites.
- Add developer policy guide `docs/Developer/E2E-Policy.md` mandating e2e updates for feature changes with required thinking model and checklist.
- Update `docs/Developer/Get-Started.md` docs map and testing section to include the e2e policy and explicit policy/smoke commands.

## v0.7.12 on 1st of March, 2026

- Add user-level persistence for doc-plus wizard selections in `frontend/src/main.ts` by storing and loading `docPlusSelections` through existing `/api/settings`.
- Update doc-plus wizard initialization to preload each step with the authenticated user's last saved A/B/C profile choices instead of resetting defaults on every new `/doc+` run.
- Preserve non-typography settings during typography saves by merging updates into a cached settings object before `PUT /api/settings`.
- Add e2e coverage in `e2e/doc-plus.spec.ts` verifying doc-plus profile selections persist across browser refresh and are preselected on the next wizard open.
- Update generated frontend bundle in `confab/static/app/gui.js` after doc-plus profile persistence changes.

## v0.7.13 on 1st of March, 2026

- Fix Anthropic deprecation warning by updating Claude calls from `thinking.type='enabled'` to `thinking.type='adaptive'` in `confab/providers/llm.py`, `confab/services/documents.py`, and `confab/services/synthesis.py`.
- Keep existing Claude streaming flow and token limits unchanged while adopting adaptive thinking mode.

## v0.7.14 on 1st of March, 2026

- Strengthen doc-plus context verification in `e2e/doc-plus.spec.ts` by asserting the submitted `doc_plus_context` contains all six levels and the full attribute marker set before first-turn submission.
- Keep explicit assertion that user-selected override (for example `Evidential texture: A`) is present in the same context payload.

## v0.7.15 on 1st of March, 2026

- Replace the doc-plus background context in `frontend/src/main.ts` with the full style framework text and 30-attribute table content from `style.md` for stronger contrast and instruction richness in model-facing context.
- Keep existing doc-plus selected-profile injection and persistence behavior unchanged while enriching baseline context.

## v0.7.16 on 1st of March, 2026

- Fix CI quality gating in `.github/workflows/pr_checks_quality.yml` by installing `ruff` alongside `pyright` before lint/type steps.
- Fix potential hangs in `confab/services/pr_review.py` by applying explicit request timeouts to all GitHub API fetch calls.
- Fix doc-plus edit prompt wrapping in `confab/services/documents.py` by avoiding duplicate `User request:` labels when a fully-formed `model_prompt` is provided.
- Fix doc-plus wrapper leakage in `confab/server.py` by returning an empty display prompt when internal wrapper payload is malformed or empty.
- Add regression coverage in `tests/test_api_server.py` to verify empty wrapped doc-plus prompts are never exposed back to API clients.
- Harden `e2e/check-core-paths.mjs` parsing to accept both single- and double-quoted values in `e2e/core-paths.ts`.

## v0.7.17 on 1st of March, 2026

- Fix CI frontend typechecking for `vite.config.ts` by removing `__dirname` usage and resolving paths from `import.meta.url`.
- Add Node ambient typings to frontend tooling by setting `types: ['node']` in `tsconfig.frontend.json`.
- Add `@types/node` as a dev dependency in `package.json` and `package-lock.json` so GitHub Actions frontend checks match local behavior.

## v0.7.18 on 1st of March, 2026

- Update new-chat layout to start with a centered composer in `frontend/src/styles.css` and `frontend/src/main.ts`, then smoothly transition the composer to its bottom-docked position after the first send.
- Remove default welcome copy visibility during new-chat state so the centered view contains only the input composer.
- Remove the model/mode helper line under the input by deleting the `models-tag` block from `confab/static/gui.html`.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after the composer layout transition update.

## v0.7.19 on 1st of March, 2026

- Refine composer border styling in `frontend/src/styles.css` so focused and unfocused states stay in the same light-grey family with only a subtle darkening.
- Add always-on ultra-light composer shadow and tune intensity by state, keeping the bottom-docked composer shadow even more subtle than the centered state.
- Move the send button inside the composer container, reduce its size, and adjust textarea right padding so the inline button sits cleanly without overlapping text.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after the composer visual polish update.

## v0.7.20 on 1st of March, 2026

- Fine-tune composer button sizing in `frontend/src/styles.css` by reducing the inline send button dimensions and icon scale slightly for cleaner visual balance.
- Rebalance single-line textarea metrics in `frontend/src/styles.css` by adjusting line-height and padding so the text cursor sits vertically centered in the composer.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after the composer micro-alignment update.

## v0.7.21 on 1st of March, 2026

- Add inline attachment support in `frontend/src/main.ts` and `confab/static/gui.html` with a left-side plus button in the composer and file picker wiring.
- Restrict supported attachment types to `.txt`, `.csv`, `.tsv`, and `.md`, and render removable attachment chips above the composer before send.
- Include selected attachment contents in the prompt payload for `/api/opinions` requests while preserving normal mode routing and conversation flow.
- Update composer layout in `frontend/src/styles.css` so left and right action buttons are symmetrically positioned, with the attachment button styled in mid-grey.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after attachment UX updates.

## v0.7.22 on 1st of March, 2026

- Fix composer docking persistence in `frontend/src/main.ts` so auth/session refresh events do not recenter the composer after a chat has started.
- Add composer state guards in `frontend/src/main.ts` that keep the composer bottom-docked whenever a conversation is active, messages are visible, or a send is in progress.
- Keep centered composer behavior restricted to explicit reset states (`new chat` or signed-out empty state) while preserving the existing smooth center-to-bottom transition.
- Regenerate frontend static bundles in `confab/static/app/gui.js` after the composer state persistence fix.

## v0.7.23 on 1st of March, 2026

- Restyle the attachment control in `confab/static/gui.html` and `frontend/src/styles.css` from a button-like icon to a plain `+` glyph while keeping click behavior unchanged.
- Keep attachment control sizing nearly aligned with the send control while removing background/border chrome for a lighter composer aesthetic.
- Add an ultra-subtle text shadow to the `+` glyph in `frontend/src/styles.css` to provide minimal visual gravity without visible heaviness.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after attachment glyph styling updates.

## v0.7.24 on 1st of March, 2026

- Replace user-message attachment text fallback in `frontend/src/main.ts` with inline file rows that render a small file icon and truncated filename in a lighter visual tone.
- Keep attachment-only user bubbles compact by rendering just the attachment row content when no typed text is present.
- Render mixed attachment-plus-text user messages with attachment rows first and normal composer text beneath in the same bubble.
- Update attachment-related message styles in `frontend/src/styles.css` and regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js`.

## v0.7.25 on 1st of March, 2026

- Fix composer vertical stability during attachment add/remove by moving `#attachmentList` inside `input-wrap` in `confab/static/gui.html`.
- Remove attachment chip layout impact in `frontend/src/styles.css` by absolutely positioning `.attachment-list` above the composer, keeping input placement unchanged.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after attachment layout stabilization.

## v0.7.26 on 1st of March, 2026

- Fix attachment control visibility in `frontend/src/styles.css` by giving `.btn-attach` an explicit foreground layer so the `+` stays visible above the textarea.
- Keep right control parity by applying the same explicit layer level to `.btn-send`.
- Preserve non-shifting attachment chips while assigning `.attachment-list` its own layer just above the composer surface.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after attachment control layering fixes.

## v0.7.27 on 1st of March, 2026

- Add composer mode-lock UX in `confab/static/gui.html`, `frontend/src/main.ts`, and `frontend/src/styles.css` so supported prefixes (`/doc`, `/doc+`, `/pr`, `/consensus`, `@grok`, `@gemini`, `@gpt`, `@claude`) lock into a colored chip when space is pressed.
- Route send-mode resolution through the active mode-lock chip in `frontend/src/main.ts` while keeping existing prefix parsing fallback behavior intact.
- Add one-action removal for the mode-lock chip in `frontend/src/main.ts` so Backspace/Delete at the chip boundary, or Cut shortcut, clears the full label at once.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after mode-lock UI and keyboard interaction updates.

## v0.7.28 on 1st of March, 2026

- Refine the attachment control glyph in `frontend/src/styles.css` by making the `+` slightly larger while keeping the control minimal and centered.
- Shift the attachment control tone to a lighter, less saturated grey in normal and hover states for a softer visual balance with the composer.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after attachment glyph tone/size tuning.

## v0.7.29 on 1st of March, 2026

- Fix sidebar chat-title rendering for attachment prompts in `frontend/src/main.ts` so attachment-only conversations show the file name instead of `[ATTACHMENTS]` marker text.
- Keep mixed typed+attachment conversation titles clean in `frontend/src/main.ts` by using the typed segment as the title when present.
- Add lighter attachment-title styling in `frontend/src/styles.css` for sidebar entries that represent file names rather than typed message text.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after sidebar title parsing and styling updates.

## v0.7.30 on 1st of March, 2026

- Add configurable `GEMINI_FALLBACK_MODEL` in `confab/config/settings.py` (default `gemini-3-pro-preview`) and export it via `confab/config/__init__.py`.
- Fix Gemini timeout fallback in `confab/providers/llm.py` by keeping a valid non-zero thinking budget instead of forcing `thinking_budget=0` for models that require thinking mode.
- Add transient Gemini failover in `confab/providers/llm.py` so `500`/`503`/`504` provider failures on `GEMINI_MODEL` retry against `GEMINI_FALLBACK_MODEL`.
- Update `docs/Developer/Get-Started.md` to document `GEMINI_FALLBACK_MODEL` and the revised Gemini timeout/failover behavior.

## v0.7.31 on 1st of March, 2026

- Fix mode-lock caret placement in `frontend/src/main.ts` and `frontend/src/styles.css` by calculating input left padding from the actual chip width so the cursor starts immediately after the lock label.
- Set Gemini default model to `gemini-3-pro-preview` in `confab/config/settings.py` to avoid `gemini-3.1-pro-preview` instability and waiting behavior.
- Remove Gemini fallback/failover chain from `confab/providers/llm.py` and related config exports in `confab/config/__init__.py` for a direct single-model call path.
- Update `docs/Developer/Get-Started.md` Gemini notes to reflect the direct default model behavior.

## v0.7.32 on 1st of March, 2026

- Fix `/doc` insertion reliability in `frontend/src/main.ts` by using context-aware insertion/replacement matching that prefers end-anchored matches for append-style edits.
- Add interactive `/doc` suggestion targeting in `frontend/src/main.ts` so clicking an edit card highlights the corresponding section in the document pane and smoothly scrolls it into view.
- Add visual focus states in `frontend/src/styles.css` for selected edit cards and highlighted document sections to make suggestion-to-document mapping explicit for reviewers.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after `/doc` edit interaction and highlighting updates.

## v0.7.33 on 1st of March, 2026

- Fix AI response copy-control alignment in `frontend/src/styles.css` by anchoring `.btn-copy` to the left edge of the text block with non-stretched sizing.
- Remove extra left inset from `.btn-copy` so the copy icon/text baseline aligns cleanly with the response content start.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after copy-control alignment refinement.

## v0.7.34 on 1st of March, 2026

- Update `/doc` edit-action state handling in `frontend/src/main.ts` so accepted/declined cards keep their action row visible while locking both buttons against repeat clicks.
- Add explicit done-state dimming for clicked `/doc` action buttons in `frontend/src/styles.css` so Accept/Decline clearly indicate completion after single or bulk apply.
- Remove action-row hiding for accepted/declined cards in `frontend/src/styles.css` to preserve post-action visual feedback.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after `/doc` action-state styling updates.

## v0.7.35 on 2nd of March, 2026

- Fix `/doc` suggestion click targeting in `frontend/src/main.ts` by replacing single-block snippet matching with a full-document positional matcher that resolves cross-block context reliably.
- Remove the fallback that previously highlighted `docContent.firstElementChild`, preventing non-matching suggestions from jumping to the article title.
- Add token-overlap fallback targeting in `frontend/src/main.ts` so low-fidelity snippet matches still resolve to the most likely document block instead of a fixed anchor.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after `/doc` suggestion targeting updates.

## v0.7.36 on 2nd of March, 2026

- Add end-user mode reference in `docs/User/Modes.md` with concise, child-friendly guidance for each supported mode and attachment support.
- Add `/help` and `/?` aliases in `confab/domain/modes.py` and `frontend/src/main.ts`, with mode-lock support, so help mode can be selected and persisted like other prompt modes.
- Add backend help-mode handling in `confab/server.py` to return `docs/User/Modes.md` content directly and persist the turn without calling any model.
- Extend API and e2e coverage for the new mode in `tests/test_api_server.py`, `e2e/core-paths.ts`, `e2e/check-core-paths.mjs`, and `e2e/support/mockApi.ts`, and update required-mode policy in `docs/Developer/E2E-Policy.md`.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after help-mode frontend updates.

## v0.7.37 on 2nd of March, 2026

- Expand `docs/Developer/API-Reference.md` with `/help` and `/?` routing, help-mode response contract, mode-lock continuation behavior, and help-specific runtime error notes.
- Add `docs/Developer/Mode-Development.md` as the canonical maintainer checklist for mode changes across parser, API routing, frontend detection/mode-lock, tests, e2e policy, and user docs.
- Update `docs/Developer/Architecture.md` to document mode-system invariants and the runtime dependency on `docs/User/Modes.md` for `help` responses.
- Update `docs/Developer/Get-Started.md` docs map and quality-gate command list to include mode-development guidance and explicit e2e policy/matrix checks.
- Update `docs/Developer/CLI.md` and `docs/Developer/E2E-Policy.md` to reflect full mode/alias coverage expectations used in day-to-day maintenance.

## v0.7.38 on 2nd of March, 2026

- Replace the `Confab` logo slot in `confab/static/gui.html` with a dedicated theme toggle icon button (`#btnTheme`) in the sidebar header.
- Add full light/dark theme token support in `frontend/src/styles.css` via `html[data-theme='dark']` CSS variables and wire key surfaces (sidebar, auth gate, composer, attachments, and mode chip) to theme-aware variables.
- Add theme state management in `frontend/src/main.ts` with `toggleTheme()`, root `data-theme` application, local preference fallback, and persisted user-setting synchronization through `/api/settings`.
- Keep generated frontend bundles in sync by rebuilding `confab/static/app/gui.css` and `confab/static/app/gui.js` after dark mode implementation.

## v0.7.39 on 2nd of March, 2026

- Fix dark-mode document readability in `frontend/src/main.ts` by applying theme-aware typography color resolution when initializing and toggling themes.
- Standardize UI monospace rendering in `frontend/src/styles.css` to a single stack (`IBM Plex Mono`, `monospace`) for settings values and `/doc` diff/context surfaces.
- Add `IBM Plex Mono` to loaded typography families in `confab/static/typography.css` so monospace rendering stays consistent across platforms.
- Update developer docs in `docs/Developer/API-Reference.md`, `docs/Developer/Mode-Development.md`, `docs/Developer/Architecture.md`, and `docs/Developer/Get-Started.md` for explicit mode routing, mode-lock contracts, typography ownership, and `make dev` startup guidance.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after typography and UI font updates.

## v0.7.40 on 2nd of March, 2026

- Refactor `parse_mode` in `confab/domain/modes.py` to remove excessive early returns while preserving all mode prefix behavior.
- Simplify explicit mode-override routing in `confab/server.py` to a single combined condition for Ruff `SIM102` compliance.
- Restore PR quality-gate compatibility by clearing Ruff failures in both standalone Ruff and full quality workflows.

## v0.7.41 on 2nd of March, 2026

- Add root migration plan `migration-path.md` with phased delivery for monorepo tooling, strict TS/Vitest, `pytest` + `mypy`, and Alembic/observability rollout.
- Add `pnpm` workspace and Turborepo baseline via `pnpm-workspace.yaml`, `turbo.json`, and `package.json` updates (including `packageManager` and `turbo` tooling scripts).
- Replace `npm` workflow execution in CI and local docs with `pnpm`, and route frontend/e2e smoke orchestration in CI through `pnpm turbo run ...`.
- Replace `package-lock.json` with `pnpm-lock.yaml` for deterministic Node dependency resolution under the new package-manager standard.

## v0.7.42 on 2nd of March, 2026

- Restructure `migration-path.md` into explicit next-phase sequencing that separates Python toolchain standardization (`uv`) from async backend runtime migration.
- Define PR2 to standardize Python task execution under Turbo via `package.json` scripts that call `uv run ...`, with dependency locking through `uv.lock`.
- Define PR5 as async-only FastAPI execution migration (async routes, SQLAlchemy async engine/session, `asyncpg`, and no sync DB calls on async request paths).

## v0.7.43 on 2nd of March, 2026

- Add Python toolchain lockfile `uv.lock` and wire `uv` into repository workflows as the standard Python dependency/runtime manager for local and CI paths.
- Add `py:*` task scripts in `package.json` (`py:sync`, `py:quality`, `py:tests`, and supporting compile/lint/type commands) so Turbo/PNPM orchestrate Python checks through `uv run ...`.
- Update quality, tests, and Playwright GitHub workflows to initialize `uv` and execute Python setup/checks via the new script surface instead of direct `pip install` command chains.
- Update developer docs (`docs/Developer/Get-Started.md`, `docs/Developer/Mode-Development.md`, and `docs/Developer/Architecture.md`) to reflect `uv`-backed Python workflow and `venv`-scoped execution model.
- Update `migration-path.md` status to mark PR2 complete and keep PR3+ sequencing explicit.

## v0.7.44 on 2nd of March, 2026

- Update Render Blueprint `render.yaml` to use locked `uv` dependency sync (`uv.lock`) during build so cloud delivery matches the repository Python toolchain model.
- Update Render start command to run `uvicorn` from the blueprint-created `.venv` environment for consistent runtime resolution.
- Update Render deployment section in `docs/Developer/Get-Started.md` to mirror the new build and start commands.

## v0.7.45 on 2nd of March, 2026

- Fix CI bootstrap mismatch in `.github/workflows/pr_checks_quality.yml`, `.github/workflows/pr_checks_tests.yml`, and `.github/workflows/pr_checks_playwright.yml` by aligning `pnpm/action-setup` version with the repository `packageManager` pin (`pnpm@10.6.1`).
- Restore PR gate compatibility by removing pnpm version ambiguity that caused `ERR_PNPM_BAD_PM_VERSION` failures before any test steps executed.

## v0.7.46 on 2nd of March, 2026

- Remove duplicate policy execution in E2E smoke paths by changing `e2e:matrix` in `package.json` to run matrix tests only and removing the `e2e:policy` Turbo dependency from `turbo.json`.
- Enforce lockfile fidelity in local/CI Python sync by adding `--locked` to `py:sync` in `package.json`.
- Pin Render uv bootstrap in `render.yaml` and `docs/Developer/Get-Started.md` to `uv==0.10.7` for reproducible deployment toolchain behavior.

## v0.7.47 on 3rd of March, 2026

- Fix composer resize behavior in `frontend/src/main.ts` so whitespace-only input always resets to the single-line height instead of staying in multiline state.
- Keep existing multiline expansion behavior unchanged for non-empty prompts while preserving mode-lock padding refresh in resize flow.
- Regenerate frontend static bundles in `confab/static/app/gui.css` and `confab/static/app/gui.js` after composer empty-state resize fix.

## v0.7.48 on 3rd of March, 2026

- Lower the `Heading gap` slider minimum in `confab/static/gui.html` from `1.0` to `0.5` so users can choose tighter heading spacing.
- Keep default heading gap at `1em` by updating `TYPO_DEFAULTS.headingGap` in `frontend/src/main.ts` to `1`.

## v0.7.49 on 3rd of March, 2026

- Fix `/doc` edit application at document end in `frontend/src/main.ts` by falling back to true end-of-document insertion for insertion edits when trailing context is missing or mismatched.
- Add append-safe fallback in `frontend/src/main.ts` for replacement-shaped end edits (`new` starts with `old`) so accepted end additions no longer conflict.
- Extend doc-mode e2e coverage in `e2e/doc.spec.ts` and `e2e/support/mockApi.ts` with a regression test for append-at-end proposal acceptance when end context is not an exact match.

## v0.7.50 on 3rd of March, 2026

- Fix doc+ wizard footer controls by removing composer-send positioning from `#btnDocPlusNext` and styling `.doc-plus-next` as a modal action button that stays anchored to the right side.
- Update doc+ wizard step rendering in `frontend/src/main.ts` so `Back` is hidden on step 1 and appears from step 2 onward, while preserving mirrored left/right footer alignment.
- Add wizard-control regression coverage in `e2e/doc-plus.spec.ts` to assert `Next` is visible on step 1 and `Back` becomes visible on step 2.

## v0.7.51 on 3rd of March, 2026

- Fix `/doc` preview/edit synchronization in `frontend/src/main.ts` so switching back to preview always re-renders from the current document source instead of stale preview DOM content.
- Prevent unaccepted suggestion text from appearing as already applied in preview by making preview mode deterministic even when no new edit is accepted.
- Add a doc-mode regression test in `e2e/doc.spec.ts` to verify unaccepted proposal content cannot persist across preview/edit toggles.
