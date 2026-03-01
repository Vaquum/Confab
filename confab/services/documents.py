"""Document mode workflow service."""

import json
import uuid

import anthropic

from ..config import CLAUDE_MODEL
from ..providers import extract_claude_usage
from ..repositories.opinions import save_chat
from ..domain.history import build_doc_history

DOC_SYSTEM_PROMPT = """You are a document editor. The user is collaborating with you on a markdown document.

You MUST respond with valid JSON (no markdown fences around the JSON).

## When there is NO existing document (first message)

Return a JSON object with exactly two keys:
{"chat": "Brief conversational response (1-3 sentences)", "document": "The full markdown document"}

## When there IS an existing document (editing)

Return a JSON object with exactly two keys:
{"chat": "Brief conversational response (1-3 sentences)", "edits": [...]}

The "edits" array contains one object per proposed change. Each edit object has:
- "context_before": 1-2 sentences of text immediately before the change (for disambiguation). Empty string if at document start.
- "old": The exact text being replaced. Empty string for pure insertions.
- "new": The replacement text. Empty string for pure deletions.
- "context_after": 1-2 sentences of text immediately after the change (for disambiguation). Empty string if at document end.
- "description": A short human-readable label for this change (e.g. "Add treatment section", "Fix typo in heading").

CRITICAL RULES FOR EDITS:
- "old" must be an EXACT substring of the current document — character-for-character, including whitespace and newlines.
- "context_before" must be the exact text that appears immediately before "old" in the document.
- "context_after" must be the exact text that appears immediately after "old" in the document.
- For pure insertions (adding new content), set "old" to "" and use context_before/context_after to mark where to insert.
- For deletions, set "new" to "".
- For structural rewrites where surgical edits would be impractical, return {"chat": "...", "document": "..."} with the full rewritten document instead of edits.
- Prefer fewer, larger edits over many tiny ones. Group related changes together."""


def run_doc(
    prompt,
    keys,
    conversation_id=None,
    document=None,
    user_id='cli-local',
    mode='doc',
    model_prompt=None,
):
    """Run one document-mode turn and persist result."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_doc_history(conversation_id, user_id=user_id)
    prompt_for_model = model_prompt if model_prompt is not None else prompt
    user_content = prompt_for_model
    if document:
        request_payload = (
            prompt_for_model
            if model_prompt is not None
            else f'User request: {prompt_for_model}'
        )
        user_content = (
            f'Current document:\n\n{document}\n\n---\n\n{request_payload}'
        )

    messages = history + [{'role': 'user', 'content': user_content}]
    position = len(history) // 2

    client = anthropic.Anthropic(api_key=keys['claude'])
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'adaptive'},
        system=DOC_SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        response = stream.get_final_message()

    raw_text = '\n'.join(
        block.text for block in response.content if block.type == 'text'
    )
    usage = extract_claude_usage(response)

    try:
        parsed = json.loads(raw_text)
        chat_response = parsed.get('chat', '')
    except json.JSONDecodeError:
        chat_response = 'Document created.'
        parsed = {'document': raw_text}

    result = {
        'chat': chat_response,
        'conversation_id': conversation_id,
        'document': None,
        'edits': None,
    }

    if 'edits' in parsed:
        result['edits'] = parsed['edits']
        save_chat(
            user_id,
            conversation_id,
            position,
            prompt,
            chat_response,
            mode=mode,
            input_tokens=usage.get('input'),
            output_tokens=usage.get('output'),
            document=document,
        )
    else:
        doc_content = parsed.get('document', raw_text)
        result['document'] = doc_content
        save_chat(
            user_id,
            conversation_id,
            position,
            prompt,
            chat_response,
            mode=mode,
            input_tokens=usage.get('input'),
            output_tokens=usage.get('output'),
            document=doc_content,
        )

    return result
