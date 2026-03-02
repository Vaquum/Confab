# Get Started

This guide covers full local setup, auth wiring, and deployment preparation.

## Developer Docs Map

- Setup and runtime: `docs/Developer/Get-Started.md`
- HTTP contracts: `docs/Developer/API-Reference.md`
- CLI behavior: `docs/Developer/CLI.md`
- Refactor architecture boundaries: `docs/Developer/Architecture.md`
- Mode implementation workflow: `docs/Developer/Mode-Development.md`
- Feature-change e2e policy: `docs/Developer/E2E-Policy.md`
- User-facing mode source document: `docs/User/Modes.md`

## Prerequisites

- Python `3.10+`
- Node.js `20+` and `npm`
- A local virtual environment named `venv`
- A Supabase project
- A Resend account with verified sending domain/subdomain
- API keys for Claude, OpenAI, XAI, and Gemini

## Local Environment

Create `venv` and install dependencies:

```bash
python3.10 -m venv venv
source venv/bin/activate
pip install -e .
```

Create `.env` in project root:

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
GEMINI_API_KEY=

SUPABASE_DB=postgresql://...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DOMAIN=<your-domain>
```

Notes:

- `SUPABASE_DB` is used for SQLAlchemy persistence.
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` are injected into the frontend.
- `SUPABASE_SERVICE_ROLE_KEY` is used for backend-triggered magic-link requests.
- `DOMAIN` controls login domain restriction in backend and UI.
- Optional Gemini tuning env vars:
  - `GEMINI_MAX_OUTPUT_TOKENS` (default `2048`)
  - `GEMINI_THINKING_BUDGET` (default `512`)
  - `GEMINI_INCLUDE_THOUGHTS` (default `false`)
  - `GEMINI_TIMEOUT_SECONDS` (default `45`)
- Confab uses `gemini-3-pro-preview` as the default Gemini model.

## Supabase Setup

### Database

- Create a Supabase project.
- Set `SUPABASE_DB` to your direct/pooled Postgres connection string.
- Confab initializes and migrates required tables on startup.

### Auth URL Configuration

In Supabase `Authentication -> URL Configuration`:

- `Site URL`: your primary app URL (local: `http://localhost:8000`, prod: `https://chat.<your-domain>`)
- `Additional Redirect URLs`:
  - `http://localhost:8000`
  - `http://127.0.0.1:8000`
  - `https://chat.<your-domain>` (and optionally temporary hostnames)

If redirect URLs are not allowlisted, Supabase falls back to `Site URL`.

## Resend SMTP Setup

Supabase default email service has strict limits and is not suitable for this app.

Configure custom SMTP in Supabase `Authentication -> SMTP`:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key
- Sender name: `Confab`
- Sender email: an address on your verified domain/subdomain, for example:
  - `noreply@mailer.<your-domain>`

Resend sending records must show as verified for external delivery.

## Run Locally

```bash
source venv/bin/activate
make dev
```

Open `http://localhost:8000`.

Direct command equivalent:

```bash
source venv/bin/activate
uvicorn confab.server:app --reload --timeout-graceful-shutdown 2
```

Alternative package-local startup (when your shell is inside `confab/`):

```bash
source ../venv/bin/activate
uvicorn server:app --reload
```

## Frontend Modular Workflow

Frontend logic lives in `frontend/src/` and is bundled to `confab/static/app/` with Vite.

Use these commands after changing frontend source:

```bash
source venv/bin/activate
npm install
npm run check:frontend
```

Notes:

- `npm run typecheck:frontend` runs TypeScript checks.
- `npm run build:frontend` emits `gui.js` and `gui.css` into `confab/static/app/`.
- `confab/static/gui.html` is now a thin shell that loads `/app/gui.js` and `/app/gui.css`.
- `confab/static/app/` is generated output; edit source in `frontend/src/` instead.

## Run End-to-End Tests

Install Playwright dependencies and run the browser suite:

```bash
source venv/bin/activate
npm install
npx playwright install chromium
npm run e2e
```

Notes:

- The suite launches `uvicorn confab.server:app` automatically through `playwright.config.ts`.
- Auth and data APIs are mocked inside Playwright for deterministic UI coverage.
- Failure artifacts are written to `playwright-report/` and `test-results/`.

Run policy and mode-smoke checks explicitly:

```bash
source venv/bin/activate
npm run e2e:policy
npm run e2e:matrix
```

## Run Full Quality Gates

```bash
source venv/bin/activate
python -m compileall confab tests
ruff check confab tests
pyright confab/config confab/providers confab/services confab/core.py
npm run check:frontend
python tests/run.py
npm run e2e:policy
npm run e2e:matrix
npm run e2e
```

CI runs these checks in workflows:

- `.github/workflows/pr_checks_quality.yml`
- `.github/workflows/pr_checks_tests.yml`
- `.github/workflows/pr_checks_playwright.yml`

## Authentication Behavior

- Login is email magic-link based.
- Magic-link requests flow through backend endpoint `POST /api/auth/magic-link`.
- Backend enforces `DOMAIN` restriction before requesting Supabase OTP delivery.
- All data endpoints are auth-protected and user-scoped.
- Conversation history and settings are isolated per user.

## Deploying on Render

This repository includes a Render Blueprint at `render.yaml`.

Blueprint defaults:

- Region: `frankfurt`
- Auto deploy: enabled
- Runtime: Python `3.10.14`
- Build command: `pip install -e . && python -m compileall confab`
- Start command: `uvicorn confab.server:app --host 0.0.0.0 --port $PORT`

Deploy with blueprint:

1. In Render, choose `New +` -> `Blueprint`.
2. Connect this repository and select branch.
3. Confirm service creation from `render.yaml`.
4. Set required secret env vars in Render dashboard:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `XAI_API_KEY`
   - `GEMINI_API_KEY`
   - `SUPABASE_DB`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DOMAIN=<your-domain>`
5. Deploy.

After deploy:

- Attach custom domain `chat.<your-domain>` in Render.
- Set Supabase `Site URL` to `https://chat.<your-domain>`.
- Add production and local origins to Supabase `Additional Redirect URLs`.

## Troubleshooting

- `Supabase auth is not configured on the server`:
  - Missing `SUPABASE_URL` or `SUPABASE_ANON_KEY`
- Magic link opens wrong host (for example `localhost:3000`):
  - Fix Supabase URL configuration allowlist + `Site URL`
- `Error sending confirmation email`:
  - Check Supabase SMTP settings
  - Confirm Resend domain verification and sender address domain
- Non-`@<your-domain>` sign-in attempts:
  - Rejected by frontend validation and backend enforcement
