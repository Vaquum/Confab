"""Document mode workflow service."""

import json
import uuid

import anthropic

from ..config import CLAUDE_MODEL
from ..prompting import build_document_user_prompt, document_system_directive
from ..providers import extract_claude_usage
from ..repositories.opinions import save_chat
from ..domain.history import build_doc_history


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
    user_content = build_document_user_prompt(
        prompt_for_model,
        document=document,
        prompt_is_labeled=model_prompt is not None,
    )

    messages = history + [{'role': 'user', 'content': user_content}]
    position = len(history) // 2

    client = anthropic.Anthropic(api_key=keys['claude'])
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'adaptive'},
        system=document_system_directive(),
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
