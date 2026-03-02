# Mode Development

This guide is the maintainer checklist for adding or changing prompt modes.

Use it whenever behavior behind `/...` or `@...` prefixes changes.

## Mode Routing Surfaces

A mode change is not complete unless all routing surfaces stay in sync.

### Backend

- Parse prefixes in `confab/domain/modes.py` via `parse_mode()`.
- Route mode behavior in `confab/server.py` in `api_create_opinion()`.
- Persist mode on writes (`save_chat` / `save_opinion`) so history and continuation work.

### Frontend

- Parse prefixes in `frontend/src/main.ts` via `detectMode()`.
- Keep composer mode lock list in sync in `MODE_LOCK_TOKENS`.
- Add thinking label in `thinkingTexts` if user-visible.

### Tests and E2E Policy

- API unit tests: `tests/test_api_server.py`.
- Browser mock parity: `e2e/support/mockApi.ts`.
- Matrix coverage: `e2e/core-paths.ts` (`MODE_MATRIX_CASES`).
- Required-mode enforcement: `e2e/check-core-paths.mjs`.

## Help Mode Contract (`/help`, `/?`)

Current help mode behavior:

- Prefixes `/help` and `/?` both map to mode `help`.
- Backend returns `docs/User/Modes.md` content directly.
- Help mode does not call any LLM provider.
- Help turns are persisted like normal chat turns (`mode='help'`).
- Existing help conversations remain mode-locked on follow-ups.

Code references:

- Parsing: `confab/domain/modes.py`
- Runtime source load: `confab/server.py` (`HELP_REFERENCE_PATH`, `_load_help_reference()`)
- API branch: `confab/server.py` (`if mode == 'help': ...`)

## Mode-Change Checklist

For any mode addition or change, update all items below in one PR.

1. Backend parser (`confab/domain/modes.py`).
2. API routing and persistence (`confab/server.py`).
3. Frontend detection and mode lock (`frontend/src/main.ts`).
4. API reference (`docs/Developer/API-Reference.md`).
5. User reference (`docs/User/Modes.md`) if user-visible behavior changed.
6. Unit tests (`tests/test_api_server.py`).
7. Playwright mock and matrix (`e2e/support/mockApi.ts`, `e2e/core-paths.ts`).
8. E2E policy enforcement (`e2e/check-core-paths.mjs`) if required modes changed.

## Validation Commands

Run from project root:

```bash
source venv/bin/activate
python tests/run.py
npm run check:frontend
npm run e2e:policy
npm run e2e:matrix
```

## Common Failure Pattern

Most mode regressions come from updating only one side.

Typical mismatch examples:

- Backend parses a new prefix but frontend does not detect or lock it.
- Frontend supports a mode but e2e mock does not emulate it.
- Mode matrix required list is stale, so CI no longer guards the path.
