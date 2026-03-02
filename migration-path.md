# Migration Path

This document defines the phased migration path to the target stack:

- Monorepo orchestration: `pnpm` + Turborepo
- Python runtime/deps: `uv` (`pyproject.toml` + `uv.lock`)
- Frontend: TypeScript strict + Vite + Vitest
- Backend runtime: FastAPI async-first + SQLAlchemy async + `asyncpg`
- Python tests/types: `pytest` + `mypy`
- Data evolution: Alembic
- Observability: structured logs + Sentry

## Current Status

PR1 and PR2 are complete:

- `pnpm` workspace + Turborepo are in place.
- CI/docs already moved from `npm` to `pnpm`.
- Python dependency locking is now tracked in `uv.lock`.
- Python CI/docs commands are routed through `package.json` `py:*` scripts backed by `uv`.

## Delivery Principle

Ship in small PRs. Keep each PR independently releasable and low-risk.

## Next Steps (Split by Model)

### PR2 - Python Toolchain Standardization with `uv` (No behavior changes, completed)

Goal:

- Keep Turbo as the top-level orchestrator.
- Run Python tasks through `package.json` scripts that call `uv run ...`.
- Manage Python dependencies with `uv` lock state.

Scope:

- Add `uv` lockfile (`uv.lock`) from current `pyproject.toml`.
- Replace Python task invocations in docs/CI with `uv run` and `uv sync` where applicable.
- Add package scripts like `py:tests`, `py:lint`, `py:type`, each delegating to `uv run ...`.
- Keep application behavior identical.

Exit criteria:

- CI passes using `uv` for Python task execution.
- `pyproject.toml` + `uv.lock` are the only Python dependency source of truth.

### PR3 - Frontend Strictness + Vitest

Goal:

- Raise frontend correctness with strict typing and fast unit tests.

Scope:

- Enable TypeScript strict mode in staged fixes.
- Add Vitest baseline with core unit coverage (mode parsing/composer logic).
- Add CI gate for strict TS + Vitest.

Exit criteria:

- Strict TS checks pass.
- Vitest is running in CI with meaningful baseline coverage.

### PR4 - Python Test/Type Upgrade (`pytest` + `mypy`)

Goal:

- Modernize Python tests and enforce static typing incrementally.

Scope:

- Move backend test entrypoint from custom `unittest` flow to `pytest`.
- Add `mypy` config with staged module rollout.
- Add CI gate for Python type checks.

Exit criteria:

- `pytest` is the default backend test runner in CI.
- `mypy` passes for the agreed module scope.

### PR5 - FastAPI Async-Only Execution Model

Goal:

- Move to async all the way for backend request handling and persistence.

Scope:

- Use async route handlers for DB-backed paths.
- Replace SQLAlchemy sync engine/session usage with async engine/session.
- Use `asyncpg` driver for Postgres connections.
- Remove mixed sync DB access from async request paths.
- Keep behavior and API contracts unchanged.

Exit criteria:

- No sync DB calls remain in async API paths.
- Async DB stack is stable under regression and e2e coverage.

### PR6 - Alembic + Observability

Goal:

- Make schema changes explicit and improve production diagnostics.

Scope:

- Add Alembic baseline and migration workflow.
- Add structured logging for request/provider/database errors.
- Add Sentry integration with safe environment configuration.

Exit criteria:

- Schema migrations are managed via Alembic.
- Operational failures are visible with useful diagnostics in logs/Sentry.

## Guardrails for All PRs

- No fallback logic additions unless explicitly requested.
- Keep no product behavior changes unless the PR explicitly targets behavior.
- Update docs and CI in the same PR as tooling/runtime changes.
- Validate each phase with both local and CI quality gates before merging.
