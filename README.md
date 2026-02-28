# Confab

Confab is a FastAPI-based multi-model chat workspace with a packaged web UI, Supabase-backed persistence, and email magic-link authentication.

Current implementation uses:

- FastAPI + packaged static frontend (`confab/static/gui.html`)
- PostgreSQL persistence through Supabase (`SUPABASE_DB`)
- Supabase Auth magic-link login
- Domain-restricted access (default: `@<your-domain>`)
- Custom SMTP via Resend for production-ready email delivery

## 1) Prerequisites

- Python `3.10+`
- A local virtual environment named `venv`
- A Supabase project
- A Resend account with verified sending domain/subdomain (for Auth emails)
- API keys for Claude, OpenAI, XAI, and Gemini

## 2) Local environment

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
- `SUPABASE_SERVICE_ROLE_KEY` is recommended for backend-triggered magic-link sending.
- `DOMAIN` controls which email domain is allowed for login in backend and UI.

## 3) Supabase project setup

### Database

- Create a Supabase project.
- Set `SUPABASE_DB` to your direct/pooled Postgres connection string.
- Confab initializes and migrates required tables on startup.

### Auth URL configuration

In Supabase `Authentication -> URL Configuration`:

- `Site URL`: your primary app URL (local: `http://localhost:8000`, prod: `https://chat.<your-domain>`)
- `Additional Redirect URLs`:
  - `http://localhost:8000`
  - `http://127.0.0.1:8000`
  - `https://chat.<your-domain>` (and optionally your temporary Render URL)

If redirect URLs are not allowlisted, Supabase falls back to `Site URL`.

## 4) Resend SMTP setup (required for reliable magic links)

Supabase default email service has strict limits and is not suitable for this app.

Configure custom SMTP in Supabase `Authentication -> SMTP`:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key
- Sender name: `Confab`
- Sender email: an address on your verified domain/subdomain, for example:
  - `noreply@mailer.<your-domain>`

Resend must show sending records as verified before external delivery works.

## 5) Run locally

```bash
source venv/bin/activate
uvicorn confab.server:app --reload
```

Open:

- `http://localhost:8000`

## 6) Authentication behavior

- Login is email magic-link based.
- Magic-link requests go through backend endpoint `POST /api/auth/magic-link`.
- Backend enforces domain restriction (`DOMAIN` from `.env`) before requesting Supabase OTP.
- All data endpoints are auth-protected and user-scoped.
- Conversation history and settings are isolated per user.

## 7) Deploying on Render (`chat.<your-domain>`)

Set these environment variables in Render:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `XAI_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_DB`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOMAIN=<your-domain>`

Start command:

```bash
uvicorn confab.server:app --host 0.0.0.0 --port $PORT
```

After deploy:

- Set Supabase `Site URL` to `https://chat.<your-domain>`
- Keep local dev URLs in `Additional Redirect URLs`

## 8) Quick troubleshooting

- `Supabase auth is not configured on the server`:
  - Missing `SUPABASE_URL` or `SUPABASE_ANON_KEY`
- Magic link opens wrong host (for example `localhost:3000`):
  - Fix Supabase URL configuration allowlist + `Site URL`
- `Error sending confirmation email`:
  - Check Supabase SMTP settings
  - Confirm Resend domain verification and sender address domain
- Non-`@<your-domain>` sign-in attempts:
  - Rejected by frontend validation and backend enforcement
