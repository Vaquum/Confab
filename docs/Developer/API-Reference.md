# API Reference

This document describes the current HTTP API exposed by `confab.server:app`.

## Base URL

- Local: `http://localhost:8000`
- Production: `https://chat.<your-domain>`

## Authentication

All `/api/*` endpoints except `POST /api/auth/magic-link` require:

- `Authorization: Bearer <supabase_access_token>`

Token validation flow:

1. Backend calls Supabase `GET /auth/v1/user`.
2. Backend extracts user id + email.
3. Backend enforces login domain restriction (`DOMAIN` in `.env`).

If the token is missing/invalid, requests fail with `401`.
If email domain is not allowed, requests fail with `403`.

## Content Types

- Request body: `application/json`
- Standard responses: `application/json`
- Streaming responses: `text/event-stream` (SSE)

## Public Endpoints

### `GET /`

Returns the packaged web UI HTML.

- Auth: No
- Response: HTML

### `GET /typography.css`

Returns packaged typography stylesheet.

- Auth: No
- Response: CSS

### `GET /app/{asset_path:path}`

Returns generated frontend assets bundled from `frontend/src/`.

- Auth: No
- Response: static asset (`.js`, `.css`, or other bundled file)
- Notes:
  - Current primary assets are `/app/gui.js` and `/app/gui.css`.
  - Path traversal is blocked and unknown assets return `404`.

## Auth Endpoint

### `POST /api/auth/magic-link`

Triggers a Supabase OTP/magic-link send for the provided email.

- Auth: No
- Request body:

```json
{
  "email": "you@<your-domain>",
  "email_redirect_to": "http://localhost:8000"
}
```

- Behavior:
  - Rejects if `email` domain does not match `DOMAIN`.
  - Forwards to Supabase `POST /auth/v1/otp`.
- Success response:

```json
{
  "ok": true
}
```

- Common errors:
  - `400`: provider error or invalid request
  - `403`: domain not allowed
  - `500`: Supabase auth not configured
  - `503`: Supabase request failure

## Conversation Endpoints

### `GET /api/opinions`

Returns conversation summaries for the authenticated user.

- Auth: Yes
- Success response:

```json
[
  {
    "conversation_id": "uuid",
    "mode": "chat",
    "title": "First prompt or custom title",
    "prompt": "Original first prompt",
    "created_at": "2026-02-28T12:34:56.000000+00:00"
  }
]
```

### `GET /api/conversations/{conversation_id}`

Returns full conversation history for one conversation.

- Auth: Yes
- Success response:

```json
{
  "conversation_id": "uuid",
  "mode": "doc",
  "messages": [
    {
      "id": 1,
      "position": 0,
      "mode": "doc",
      "prompt": "Create a draft",
      "response": "Draft created.",
      "document": "# Draft",
      "created_at": "2026-02-28T12:34:56.000000+00:00"
    }
  ]
}
```

- Common errors:
  - `404`: conversation not found for user

### `PATCH /api/conversations/{conversation_id}`

Renames conversation title.

- Auth: Yes
- Request body:

```json
{
  "title": "New title"
}
```

- Success response:

```json
{
  "ok": true
}
```

### `DELETE /api/conversations/{conversation_id}`

Deletes all messages in conversation.

- Auth: Yes
- Success response:

```json
{
  "ok": true
}
```

### `PUT /api/conversations/{conversation_id}/document`

Updates latest stored document body for a `doc` or `doc_plus` conversation.

- Auth: Yes
- Request body:

```json
{
  "document": "# Updated document"
}
```

- Success response:

```json
{
  "ok": true
}
```

- Common errors:
  - `400`: target conversation is not `doc` or `doc_plus` mode
  - `404`: conversation not found

## Settings Endpoints

### `GET /api/settings`

Returns persisted settings map for authenticated user.

- Auth: Yes
- Success response:

```json
{
  "settings": {
    "fontFamily": "system",
    "fontSize": 15
  }
}
```

### `PUT /api/settings`

Upserts user settings map.

- Auth: Yes
- Request body:

```json
{
  "settings": {
    "fontFamily": "georgia",
    "lineHeight": 1.8
  }
}
```

- Success response:

```json
{
  "ok": true
}
```

## Prompt Endpoint

### `POST /api/opinions`

Primary prompt endpoint for chat, help, doc, doc-plus, consensus, and PR review.

- Auth: Yes
- Request body:

```json
{
  "prompt": "Your prompt (optionally prefixed with /help, /?, /doc, /doc+, /consensus, /pr, @gpt, @grok, @gemini, @claude)",
  "conversation_id": "optional-uuid",
  "attachments": [
    {
      "name": "optional-file-name.md",
      "content": "full attachment text content"
    }
  ],
  "doc_plus_profile": {
    "Evidential texture": "A",
    "Rhetorical mode": "B"
  },
  "mode": "optional explicit mode override used by frontend mode-lock"
}
```

### Mode Resolution

- Prefix controls explicit mode:
  - `/help` or `/?` -> help mode
  - `/doc` -> doc mode
  - `/doc+` -> doc-plus mode with persistent profile context
  - `/consensus` -> consensus mode
  - `/pr` -> PR review mode
  - `@gpt`, `@grok`, `@gemini`, `@claude` -> routed single-model chat modes
- Without prefix:
  - Existing conversation: inherits conversation context/mode rules
  - New conversation: defaults to `chat` (Claude)
- Existing conversation mode lock currently applies to:
  - `consensus`, `pr`, `doc`, `doc_plus`
- If request body includes `mode`, backend validates and honors it as an explicit route override.
  - This is used by frontend mode-lock so stripped prefixes still route correctly.

### JSON Response Modes

For `chat`, `gpt`, `grok`, `gemini`:

```json
{
  "mode": "chat",
  "conversation_id": "uuid",
  "response": "Model response"
}
```

For `help`:

```json
{
  "mode": "help",
  "conversation_id": null,
  "response": "# Confab Reference\n..."
}
```

- Help mode returns the current `docs/User/Modes.md` content.
- Help mode does not call model providers.
- Help mode is ephemeral and is not persisted into conversation history.

For `doc`:

```json
{
  "mode": "doc",
  "conversation_id": "uuid",
  "response": "Assistant chat response",
  "document": "# Full document",
  "edits": [
    {
      "context_before": "",
      "old": "old text",
      "new": "new text",
      "context_after": "",
      "description": "Edit label"
    }
  ]
}
```

`document` and `edits` are mutually pattern-based depending on model output.

For `doc_plus`:

- Response payload shape matches `doc` mode (`response`, plus `document` or `edits`).
- The first `/doc+` turn must include `doc_plus_profile` in request body.
- Follow-up turns in the same `doc_plus` conversation reuse persisted profile context automatically.
- Backend compatibility note: legacy clients may still send `doc_plus_context` as a prebuilt string, but current clients send structured `doc_plus_profile`.

### SSE Streaming Modes

For `/consensus` and `/pr`, response content type is `text/event-stream`.

Each event is sent as:

```text
data: {"event":"..."}

```

Consensus events:

- `models_started`
- `model_done` (includes `model`, optional `error`)
- `synthesizing`
- `done` (includes final `response`, `conversation_id`, `individual`, `errors`)
- `error` (on stream failure)

PR events:

- `fetching_pr`
- `pr_fetched`
- then consensus event sequence above

### Common Errors

- `400`: invalid mode-specific request
- `401`: missing/invalid token
- `403`: disallowed email domain
- `404`: missing conversation (for specific operations)
- `500`: internal execution error
- `503`: auth provider unavailable

`help` mode specific `500` case:

- `Help reference is not available` when `docs/User/Modes.md` is missing at runtime.

Auth-provider mapping details:

- Supabase `401` / `403` -> API `401`
- Supabase `429` / `5xx` -> API `503`
- Other non-success auth-provider status -> API `503`

## Example Requests

### Authenticated chat request

```bash
curl -X POST "http://localhost:8000/api/opinions" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Summarize this week in 5 bullets"}'
```

### Authenticated consensus streaming request

```bash
curl -N -X POST "http://localhost:8000/api/opinions" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"/consensus Evaluate this launch plan"}'
```
