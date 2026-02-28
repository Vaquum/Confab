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
