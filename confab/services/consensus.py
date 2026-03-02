"""Consensus and streaming workflows."""

import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..providers import query_claude, query_gemini, query_gpt, query_grok
from ..repositories.opinions import save_opinion
from ..domain.history import build_history
from .synthesis import synthesize


def _run_parallel_model_queries(keys, messages):
    responses = {}
    usages = {}
    errors = {}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(query_claude, keys['claude'], messages): 'claude',
            pool.submit(query_gpt, keys['gpt'], messages): 'gpt',
            pool.submit(query_grok, keys['grok'], messages): 'grok',
            pool.submit(query_gemini, keys['gemini'], messages): 'gemini',
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                text, usage = future.result()
                responses[name] = text
                usages[name] = usage
            except Exception as exc:
                errors[name] = str(exc)

    for name in ['claude', 'gpt', 'grok', 'gemini']:
        if name not in responses:
            responses[name] = f'[Error: {errors[name]}]'

    return responses, usages, errors


def run_opinions(prompt, keys, conversation_id=None, mode='consensus', user_id='cli-local'):
    """Run consensus or PR workflow and persist synthesized output."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, user_id=user_id)
    messages = history + [{'role': 'user', 'content': prompt}]
    position = len(history) // 2

    responses, usages, errors = _run_parallel_model_queries(keys, messages)
    result, synthesis_usage = synthesize(
        keys['claude'],
        prompt,
        responses,
        history,
        mode=mode,
    )
    save_opinion(
        user_id,
        conversation_id,
        position,
        prompt,
        responses,
        result,
        usages=usages,
        synthesis_usage=synthesis_usage,
        mode=mode,
    )
    return result, responses, errors, conversation_id


def run_opinions_stream(prompt, keys, conversation_id=None, mode='consensus', user_id='cli-local'):
    """Stream consensus or PR workflow progress events."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, user_id=user_id)
    messages = history + [{'role': 'user', 'content': prompt}]
    position = len(history) // 2

    yield {'event': 'models_started'}

    responses = {}
    usages = {}
    errors = {}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(query_claude, keys['claude'], messages): 'claude',
            pool.submit(query_gpt, keys['gpt'], messages): 'gpt',
            pool.submit(query_grok, keys['grok'], messages): 'grok',
            pool.submit(query_gemini, keys['gemini'], messages): 'gemini',
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                text, usage = future.result()
                responses[name] = text
                usages[name] = usage
                yield {'event': 'model_done', 'model': name}
            except Exception as exc:
                errors[name] = str(exc)
                yield {'event': 'model_done', 'model': name, 'error': True}

    for name in ['claude', 'gpt', 'grok', 'gemini']:
        if name not in responses:
            responses[name] = f'[Error: {errors[name]}]'

    yield {'event': 'synthesizing'}
    result, synthesis_usage = synthesize(
        keys['claude'],
        prompt,
        responses,
        history,
        mode=mode,
    )
    save_opinion(
        user_id,
        conversation_id,
        position,
        prompt,
        responses,
        result,
        usages=usages,
        synthesis_usage=synthesis_usage,
        mode=mode,
    )

    yield {
        'event': 'done',
        'mode': mode,
        'conversation_id': conversation_id,
        'response': result,
        'individual': responses,
        'errors': errors,
    }
