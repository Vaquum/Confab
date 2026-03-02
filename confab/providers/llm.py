"""Model query providers."""

import anthropic
import openai
from google import genai
from google.genai import types

from ..config import (
    CLAUDE_MODEL,
    GEMINI_INCLUDE_THOUGHTS,
    GEMINI_MAX_OUTPUT_TOKENS,
    GEMINI_MODEL,
    GEMINI_THINKING_BUDGET,
    GEMINI_TIMEOUT_SECONDS,
    GPT_MODEL,
    GROK_MODEL,
    XAI_BASE_URL,
)


def extract_claude_usage(response):
    """Extract normalized usage from Anthropic response."""
    usage = getattr(response, 'usage', None)
    return {
        'input': getattr(usage, 'input_tokens', None) if usage else None,
        'output': getattr(usage, 'output_tokens', None) if usage else None,
    }


def _extract_openai_usage(response):
    """Extract normalized usage from OpenAI-compatible response."""
    usage = getattr(response, 'usage', None)
    return {
        'input': getattr(usage, 'prompt_tokens', None) if usage else None,
        'output': getattr(usage, 'completion_tokens', None) if usage else None,
    }


def query_claude(api_key, messages):
    """Run a Claude request with adaptive thinking."""
    client = anthropic.Anthropic(api_key=api_key)
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


def query_gpt(api_key, messages):
    """Run a GPT request."""
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content, _extract_openai_usage(response)


def query_grok(api_key, messages):
    """Run a Grok request over OpenAI-compatible API."""
    client = openai.OpenAI(api_key=api_key, base_url=XAI_BASE_URL)
    response = client.chat.completions.create(
        model=GROK_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content, _extract_openai_usage(response)


def _to_gemini_contents(messages):
    """Convert standard chat messages to Gemini content objects."""
    contents = []
    for message in messages:
        role = 'model' if message['role'] == 'assistant' else 'user'
        contents.append(
            types.Content(role=role, parts=[types.Part(text=message['content'])])
        )
    return contents


def _generate_gemini_response(
    client,
    messages,
    max_output_tokens,
    include_thoughts,
    thinking_budget,
):
    return client.models.generate_content(
        model=GEMINI_MODEL,
        contents=_to_gemini_contents(messages),
        config=types.GenerateContentConfig(
            max_output_tokens=max_output_tokens,
            thinking_config=types.ThinkingConfig(
                include_thoughts=include_thoughts,
                thinking_budget=thinking_budget,
            ),
        ),
    )


def query_gemini(api_key, messages):
    """Run a Gemini request with configurable thinking and timeout."""
    timeout_ms = max(1000, int(GEMINI_TIMEOUT_SECONDS * 1000))
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=timeout_ms),
    )
    response = _generate_gemini_response(
        client=client,
        messages=messages,
        max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS,
        include_thoughts=GEMINI_INCLUDE_THOUGHTS,
        thinking_budget=GEMINI_THINKING_BUDGET,
    )

    meta = getattr(response, 'usage_metadata', None)
    usage = {
        'input': getattr(meta, 'prompt_token_count', None) if meta else None,
        'output': getattr(meta, 'candidates_token_count', None) if meta else None,
    }
    return response.text, usage
