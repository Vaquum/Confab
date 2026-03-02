"""Prompt mode parsing domain logic."""


def parse_mode(prompt):
    """Return mode and cleaned prompt from a prefixed prompt string."""
    stripped = prompt.strip()
    lower = stripped.lower()
    prefixed_modes = (
        ('/help', 'help'),
        ('/?', 'help'),
        ('/doc+', 'doc_plus'),
        ('/doc', 'doc'),
        ('/pr', 'pr'),
        ('/consensus', 'consensus'),
    )
    for prefix, mode in prefixed_modes:
        if lower.startswith(prefix):
            cleaned_prompt = stripped[len(prefix):].strip()
            return mode, cleaned_prompt
    for model in ('grok', 'gemini', 'gpt', 'claude'):
        if lower.startswith(f'@{model}'):
            mode = 'chat' if model == 'claude' else model
            return mode, stripped[len(model) + 1:].strip()
    return None, stripped
