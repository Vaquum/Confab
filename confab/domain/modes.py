"""Prompt mode parsing domain logic."""


def parse_mode(prompt):
    """Return mode and cleaned prompt from a prefixed prompt string."""
    stripped = prompt.strip()
    lower = stripped.lower()
    if lower.startswith('/doc+'):
        return 'doc_plus', stripped[len('/doc+'):].strip()
    if lower.startswith('/doc'):
        return 'doc', stripped[len('/doc'):].strip()
    if lower.startswith('/pr'):
        return 'pr', stripped[len('/pr'):].strip()
    if lower.startswith('/consensus'):
        return 'consensus', stripped[len('/consensus'):].strip()
    for model in ('grok', 'gemini', 'gpt', 'claude'):
        if lower.startswith(f'@{model}'):
            mode = 'chat' if model == 'claude' else model
            return mode, stripped[len(model) + 1:].strip()
    return None, stripped
