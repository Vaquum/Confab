"""Conversation history domain logic."""

import json

from ..prompting import build_document_user_prompt
from ..repositories.conversations import get_conversation


def build_history(conversation_id, user_id='cli-local'):
    """Build message history for chat and consensus flows."""
    if not conversation_id:
        return []
    conversation = get_conversation(user_id, conversation_id)
    if not conversation:
        return []

    history = []
    for message in conversation['messages']:
        history.append({'role': 'user', 'content': message['prompt']})
        message_mode = message.get('mode', 'chat')
        response = (
            message.get('synthesis')
            if message_mode in ('consensus', 'pr')
            else message.get('response')
        )
        if response:
            history.append({'role': 'assistant', 'content': response})
    return history


def build_doc_history(conversation_id, user_id='cli-local'):
    """Build message history for document workflow."""
    if not conversation_id:
        return []
    conversation = get_conversation(user_id, conversation_id)
    if not conversation:
        return []

    history = []
    for message in conversation['messages']:
        user_content = message['prompt']
        if message.get('document'):
            user_content = build_document_user_prompt(
                message['prompt'],
                document=message['document'],
            )
        history.append({'role': 'user', 'content': user_content})
        if message.get('response'):
            history.append({
                'role': 'assistant',
                'content': json.dumps({
                    'chat': message['response'],
                    'document': message.get('document', ''),
                }),
            })
    return history
