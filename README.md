<h1 align="center">
  <br>
  <a href="https://github.com/Vaquum"><img src="https://github.com/Vaquum/Home/raw/main/assets/Logo.png" alt="Vaquum" width="150"></a>
  <br>
</h1>

<h3 align="center">Confab is for multi-model research conversations and document workflows.</h3>

<p align="center">
  <a href="#value-proposition">Value Proposition</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>
<hr>

# Value Proposition

Confab collapses multi-model chat, consensus synthesis, PR review, and document iteration into one cohesive app with persistent history and strict per-user workspace isolation.

# Quick Start

If your environment is already configured, use these three examples:

1) Running the app

```bash
source venv/bin/activate
uvicorn confab.server:app --reload
```

2) Using the REST API

```bash
curl -X POST "http://localhost:8000/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@<your-domain>","email_redirect_to":"http://localhost:8000"}'
```

3) Using the CLI

```bash
source venv/bin/activate
python -m confab "Compare the strategic pros and cons of launching this week vs next week."
```

If you change files under `frontend/src/`, rebuild shipped browser assets:

```bash
source venv/bin/activate
pnpm install --frozen-lockfile
pnpm run check:frontend
```

For complete setup, API auth flow, and deployment instructions, see [Get Started](docs/Developer/Get-Started.md).
For internal module boundaries after the refactor, see [Architecture](docs/Developer/Architecture.md).

# Contributing

The simplest way to contribute is by joining open discussions or picking up an issue:

- [Open discussions](https://github.com/Vaquum/Confab/issues?q=is%3Aissue%20state%3Aopen%20label%3Aquestion%2Fdiscussion)
- [Open issues](https://github.com/Vaquum/Confab/issues)

Before contributing, start with [Get Started](docs/Developer/Get-Started.md).

# Vulnerabilities

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/Vaquum/Confab/security/advisories/new).

# Citations

If you use Confab for published work, please cite:

Confab [Computer software]. (2026). Retrieved from http://github.com/vaquum/confab.

# License

[MIT License](LICENSE).
