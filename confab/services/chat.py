"""Chat workflow service."""

import uuid

from ..providers import query_claude, query_gemini, query_gpt, query_grok
from ..repositories.opinions import save_chat
from ..domain.history import build_history

QUERY_MAP = {
    'chat': ('claude', query_claude),
    'gpt': ('gpt', query_gpt),
    'grok': ('grok', query_grok),
    'gemini': ('gemini', query_gemini),
}


def run_chat(prompt, keys, conversation_id=None, mode='chat', user_id='cli-local'):
    """Run one chat turn and persist it."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, user_id=user_id)
    messages = history + [{'role': 'user', 'content': prompt}]
    position = len(history) // 2

    key_name, query_fn = QUERY_MAP[mode]
    response, usage = query_fn(keys[key_name], messages)
    save_chat(
        user_id,
        conversation_id,
        position,
        prompt,
        response,
        mode=mode,
        input_tokens=usage.get('input'),
        output_tokens=usage.get('output'),
    )
    return response, conversation_id
