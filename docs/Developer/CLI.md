# CLI Reference

This document covers the current command-line interface exposed by the package entrypoints:

- `confab`
- `python -m confab`

Both execute `confab.__main__:main`.

## Command

```bash
confab "your prompt here"
```

Equivalent:

```bash
python -m confab "your prompt here"
```

Recommended working directory: repository root.

## Positional Arguments

- `prompt` (required): prompt text to process.

Current CLI behavior is consensus-oriented:

- Runs all four models (Claude, GPT, Grok, Gemini) in parallel.
- Synthesizes outputs with Claude.
- Prints final synthesized result to stdout.

## Environment Variables

Required model keys:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `XAI_API_KEY`
- `GEMINI_API_KEY`

Database config:

- Preferred: `SUPABASE_DB` (or `SUPABASE_DB_URL`)
- Fallback: `DATABASE_URL`
- Final fallback: local SQLite `confab.db`

## Output and Streams

- Status logs are printed to stderr (for example: querying status).
- Final synthesized response is printed to stdout.
- If one or more model calls fail, CLI still returns synthesized output using available responses and logs model failures to stderr.

## Exit Codes

- `0`: successful run
- `1`: missing required API keys or fatal startup failure

## Runtime Flow

1. Parse prompt argument.
2. Load API keys from environment.
3. Initialize database schema/migrations.
4. Run consensus pipeline (`run_opinions`) with `user_id='cli-local'`.
5. Persist prompt/results to database.
6. Print final synthesis.

Internal module flow:

- CLI entrypoint: `confab.__main__:main`
- Facade layer: `confab/core.py`
- Services: `confab/services/*`
- Providers: `confab/providers/*`
- Persistence: `confab/db.py` via repository wrappers

## Data Persistence Semantics

- Each CLI invocation creates a new conversation id.
- Stored records are tagged with user id `cli-local`.
- CLI does not currently provide flags for resuming an existing conversation id.

## What CLI Supports Today

- Multi-model consensus + synthesis from a single prompt.

## What CLI Does Not Expose Yet

- Direct mode switches (`/help`, `/?`, `/doc`, `/doc+`, `/pr`, `/consensus`, `@gpt`, `@grok`, `@gemini`, `@claude`) through dedicated CLI flags.
- Conversation-id continuation flags.
- Streaming progress output format (SSE-like) in CLI mode.

## Interaction with Refactored Frontend

- CLI is backend-only and does not require `frontend/src/` build artifacts.
- Frontend bundling (`npm run check:frontend`) is independent from CLI execution.

## Examples

Basic:

```bash
confab "Create a launch memo outline for a B2B analytics product."
```

From module:

```bash
python -m confab "Review this plan: ship now or delay two weeks?"
```

With explicit virtual environment:

```bash
source venv/bin/activate
confab "Summarize likely risks in our rollout checklist."
```

## Troubleshooting

Missing keys:

```text
Missing API keys: claude, gpt, grok, gemini
```

Fix by exporting or setting the required environment variables before running the command.

Connection issues:

- Verify `SUPABASE_DB` value.
- Ensure network access to the database host.
- Confirm credentials and SSL requirements are correct.
