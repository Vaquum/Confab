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
