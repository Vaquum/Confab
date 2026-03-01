# E2E Policy

This policy is mandatory for all feature changes that affect user behavior.

## Non-Negotiable Rule

Every user-facing feature change must update end-to-end coverage in the same pull request.

No exceptions for:

- New modes
- New interaction flows
- Changed submit behavior
- Changed auth flow
- Changed visible error handling
- Changed persistence-visible behavior

If behavior changes and e2e does not change, the PR is incomplete.

## Required Thinking Model

For each feature change, evaluate impact using three questions:

1. Can the user still start the flow?
2. Can the user complete the flow?
3. Can the user repeat or continue the flow in the same conversation/session?

If any answer is uncertain, add or update e2e coverage.

## Coverage Layers

Confab uses two required e2e layers.

### Layer 1: Mode Matrix Smoke

Purpose: fast regression detection for core prompt modes and send behavior.

Owned by:

- `e2e/core-paths.ts` (`MODE_MATRIX_CASES`)
- `e2e/mode-matrix.spec.ts`

Must validate:

- Send path works (Enter or button)
- First response renders
- Correct mode badge/history behavior
- Mode-specific critical UI (for example doc pane or doc+ wizard)

### Layer 2: Journey Specs

Purpose: realistic multi-step behavior for each core user path.

Owned by:

- `e2e/core-paths.ts` (`CORE_PATHS`)
- Spec files referenced via `ownerSpec`

Must validate:

- Start, completion, and follow-up/continuation behavior
- Contract-critical request payloads where applicable
- The failure mode that motivated the feature (or bug fix)

## Core Path Manifest Contract

`e2e/core-paths.ts` is the source of truth.

Requirements:

- Every `e2e/*.spec.ts` file must have one `CORE_PATHS` owner entry.
- Every owner entry must point to a real spec file.
- `MODE_MATRIX_CASES` must cover all required modes:
  - `chat`, `gpt`, `grok`, `gemini`, `doc`, `doc_plus`, `consensus`, `pr`

Automated enforcement:

- `npm run e2e:policy`

## CI Enforcement

Playwright CI must run in this order:

1. `npm run e2e:policy`
2. `npm run e2e:matrix`
3. `npm run e2e`

This ensures manifest integrity first, smoke guardrails second, full journeys third.

## Feature-Change Checklist (Required)

For any user-visible feature PR:

1. Update or add `CORE_PATHS` entry when behavior scope changes.
2. Update or add `MODE_MATRIX_CASES` scenario when mode/submit behavior changes.
3. Add or update journey spec for continuation behavior.
4. Update mocks to reflect backend contract changes.
5. Run locally:
   - `npm run e2e:policy`
   - `npm run e2e:matrix`
   - `npm run e2e`

PR review should block merge if any checklist item is skipped.
