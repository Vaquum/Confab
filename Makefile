.PHONY: dev

dev:
	UVICORN_TIMEOUT_GRACEFUL_SHUTDOWN=2 venv/bin/uvicorn confab.server:app --reload --port 7777
