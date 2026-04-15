"""Consensus synthesis helpers."""

import anthropic

from ..config import CLAUDE_MODEL
from ..prompting import build_synthesis_prompt
from ..providers import extract_claude_usage


def synthesize(api_key, prompt, responses, history=None, mode='consensus'):
    """Synthesize multi-model responses into one final answer."""
    client = anthropic.Anthropic(api_key=api_key)
    synthesis_prompt = build_synthesis_prompt(prompt, responses, mode=mode)
    messages = (history or []) + [{'role': 'user', 'content': synthesis_prompt}]

    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'adaptive'},
        messages=messages,
    ) as stream:
        response = stream.get_final_message()

    text = '\n'.join(
        block.text for block in response.content if block.type == 'text'
    )
    return text, extract_claude_usage(response)
