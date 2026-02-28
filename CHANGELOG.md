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
