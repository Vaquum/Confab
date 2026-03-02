"""Runtime settings and key loading."""

import os

from dotenv import load_dotenv

load_dotenv(override=True)

CLAUDE_MODEL = 'claude-opus-4-6'
GPT_MODEL = 'gpt-5.2'
GROK_MODEL = 'grok-4-1-fast-reasoning'
GEMINI_MODEL = 'gemini-3-pro-preview'
GEMINI_MAX_OUTPUT_TOKENS = int(os.environ.get('GEMINI_MAX_OUTPUT_TOKENS', '2048'))
GEMINI_THINKING_BUDGET = int(os.environ.get('GEMINI_THINKING_BUDGET', '512'))
GEMINI_INCLUDE_THOUGHTS = (
    os.environ.get('GEMINI_INCLUDE_THOUGHTS', 'false').strip().lower()
    in {'1', 'true', 'yes', 'on'}
)
GEMINI_TIMEOUT_SECONDS = float(os.environ.get('GEMINI_TIMEOUT_SECONDS', '45'))

XAI_BASE_URL = 'https://api.x.ai/v1'


def get_keys():
    """Return API keys and missing key names."""
    keys = {
        'claude': os.environ.get('ANTHROPIC_API_KEY'),
        'gpt': os.environ.get('OPENAI_API_KEY'),
        'grok': os.environ.get('XAI_API_KEY'),
        'gemini': os.environ.get('GEMINI_API_KEY'),
    }
    missing = [name for name, value in keys.items() if not value]
    return keys, missing
