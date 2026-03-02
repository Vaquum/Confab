# Architecture

This document describes the maintainable base refactor layout and developer boundaries.

## Goals

- Keep existing product capabilities unchanged.
- Make frontend and backend changes locally scoped.
- Keep runtime and CI behavior explicit and test-gated.

## Current Module Layout

### Backend

- API entrypoint: `confab/server.py`
- API contracts: `confab/api/contracts.py`
- Orchestration facade: `confab/core.py`
- Services: `confab/services/`
  - `chat.py`
  - `documents.py`
  - `consensus.py`
  - `pr_review.py`
  - `synthesis.py`
  - `modes.py`
  - `history.py`
- Providers: `confab/providers/llm.py`
- Config: `confab/config/settings.py`
- Domain utilities: `confab/domain/`
  - `modes.py`
  - `history.py`
- Repository wrappers: `confab/repositories/`
- Database implementation: `confab/db.py`
- User-facing mode reference source: `docs/User/Modes.md` (served by backend `help` mode)

### Frontend

- Source of truth: `frontend/src/`
  - `main.ts`
  - `styles.css`
  - `config.ts`
- Generated assets: `confab/static/app/`
  - `gui.js`
  - `gui.css`
- HTML shell: `confab/static/gui.html`
- Typography source: `confab/static/typography.css`
  - Hosts shared content typography variables and loaded Google Fonts.
  - Includes the shared monospace family (`IBM Plex Mono`) used by UI monospace surfaces.
- Public static routes:
  - `GET /`
  - `GET /typography.css`
  - `GET /app/{asset_path:path}`

## Request Flow

1. Browser calls API routes in `confab/server.py`.
2. Auth is validated against Supabase and restricted by `DOMAIN`.
3. Route handlers call orchestration services via `confab/core.py` exports.
4. Services call provider clients and repository wrappers.
5. Repository wrappers delegate persistence to `confab/db.py`.

## Mode System Invariants

When adding or changing modes, keep these files aligned:

- Backend parser: `confab/domain/modes.py` (`parse_mode`)
- API routing: `confab/server.py` (`api_create_opinion`)
- Frontend parser: `frontend/src/main.ts` (`detectMode`)
- Composer mode lock: `frontend/src/main.ts` (`MODE_LOCK_TOKENS`)
- E2E mock parity: `e2e/support/mockApi.ts`
- Matrix/policy coverage: `e2e/core-paths.ts`, `e2e/check-core-paths.mjs`

Current special-mode behavior:

- `/help` and `/?` map to `help` mode and return `docs/User/Modes.md` directly.
- `help` mode is ephemeral (not persisted) and should not alter long-term conversation mode state.

## Development Rules

- Add request/response models in `confab/api/contracts.py` before new API behavior.
- Keep mode parsing and history shaping in `confab/domain/`.
- Keep provider API specifics in `confab/providers/`.
- Keep workflow logic in `confab/services/`.
- Keep SQLAlchemy/data storage changes in `confab/db.py` and repository wrappers.
- Do not hand-edit `confab/static/app/*`; regenerate from `frontend/src/`.

## Build and Quality Gates

Local quality gate commands:

```bash
source venv/bin/activate
python -m compileall confab tests
ruff check confab tests
pyright confab/config confab/providers confab/services confab/core.py
npm run check:frontend
python tests/run.py
npm run e2e
```

CI workflows:

- `.github/workflows/pr_checks_quality.yml`
- `.github/workflows/pr_checks_tests.yml`
- `.github/workflows/pr_checks_playwright.yml`
