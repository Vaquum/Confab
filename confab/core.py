"""Confab - multi-model AI conversations."""

import argparse
import os
import re
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from dotenv import load_dotenv

import anthropic
import openai
from google import genai
from google.genai import types

if __package__:
    from .db import init_db, save_chat, save_opinion, get_conversation
else:
    from db import init_db, save_chat, save_opinion, get_conversation

load_dotenv(override=True)


# --- Model configs ---

CLAUDE_MODEL = 'claude-opus-4-6'
GPT_MODEL = 'gpt-5.2'
GROK_MODEL = 'grok-4-1-fast-reasoning'
GEMINI_MODEL = 'gemini-3-flash-preview'

XAI_BASE_URL = 'https://api.x.ai/v1'


# --- Query functions ---

def _claude_usage(response):
    """Extract normalized usage dict from Anthropic response."""
    usage = getattr(response, 'usage', None)
    return {
        'input': getattr(usage, 'input_tokens', None) if usage else None,
        'output': getattr(usage, 'output_tokens', None) if usage else None,
    }


def query_claude(api_key, messages):
    client = anthropic.Anthropic(api_key=api_key)
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'enabled', 'budget_tokens': 8000},
        messages=messages,
    ) as stream:
        response = stream.get_final_message()
    text = '\n'.join(
        block.text for block in response.content if block.type == 'text'
    )
    return text, _claude_usage(response)


def _openai_usage(response):
    """Extract normalized usage dict from OpenAI/X.AI response."""
    usage = getattr(response, 'usage', None)
    return {
        'input': getattr(usage, 'prompt_tokens', None) if usage else None,
        'output': getattr(usage, 'completion_tokens', None) if usage else None,
    }


def query_gpt(api_key, messages):
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content, _openai_usage(response)


def query_grok(api_key, messages):
    client = openai.OpenAI(api_key=api_key, base_url=XAI_BASE_URL)
    response = client.chat.completions.create(
        model=GROK_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content, _openai_usage(response)


def _to_gemini_contents(messages):
    """Convert standard messages to Gemini Content objects."""
    contents = []
    for msg in messages:
        role = 'model' if msg['role'] == 'assistant' else 'user'
        contents.append(
            types.Content(role=role, parts=[types.Part(text=msg['content'])])
        )
    return contents


def query_gemini(api_key, messages):
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=_to_gemini_contents(messages),
        config=types.GenerateContentConfig(
            max_output_tokens=16000,
            thinking_config=types.ThinkingConfig(
                include_thoughts=True,
                thinking_budget=8000,
            )
        ),
    )
    meta = getattr(response, 'usage_metadata', None)
    usage = {
        'input': getattr(meta, 'prompt_token_count', None) if meta else None,
        'output': getattr(meta, 'candidates_token_count', None) if meta else None,
    }
    return response.text, usage


# --- History ---

def build_history(conversation_id, mode=None):
    """Load existing conversation turns as a message list."""
    if not conversation_id:
        return []
    conv = get_conversation(conversation_id)
    if not conv:
        return []

    history = []
    for msg in conv['messages']:
        history.append({'role': 'user', 'content': msg['prompt']})
        msg_mode = msg.get('mode', 'chat')
        resp = msg.get('synthesis') if msg_mode in ('consensus', 'pr') else msg.get('response')
        if resp:
            history.append({'role': 'assistant', 'content': resp})
    return history


# --- Synthesis ---

_SYNTHESIS_CONSENSUS = """I've given you the research brief and then responses from researchers A, B, C, and D.

Each of them is from an individual researcher, where each are working on the exact same brief. I want you to look at them, and then report back in terms of:

1) Where do all four have clear consensus?
2) Where do one or more are contradicting each other or are in clear disagreement with each other?
3) Where is it unclear if there is consensus or if there is contradiction/disagreement?
4) What did they all miss?"""

_SYNTHESIS_PR = """Four independent reviewers have examined this pull request. Consolidate their findings into a single clean technical audit.

- Merge duplicate findings into one
- Drop any finding that another reviewer's analysis shows to be a false positive
- Do NOT reference the individual reviewers (no "Reviewer A said...")
- Output a flat list of confirmed material issues with code references
- If no material issues survive consolidation, say so"""


def synthesize(api_key, prompt, responses, history=None, mode='consensus'):
    client = anthropic.Anthropic(api_key=api_key)

    # Shuffle into anonymous A/B/C/D so the curator has no model bias
    labels = list(zip(
        ['A', 'B', 'C', 'D'],
        [responses['claude'], responses['gpt'], responses['grok'], responses['gemini']],
    ))

    researcher_blocks = '\n\n---\n\n'.join(
        f'Reviewer {label}:\n{text}' for label, text in labels
    )

    tail = _SYNTHESIS_PR if mode == 'pr' else _SYNTHESIS_CONSENSUS

    synthesis_prompt = f"""{prompt}

---

{researcher_blocks}

---

{tail}"""

    messages = (history or []) + [{'role': 'user', 'content': synthesis_prompt}]

    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'enabled', 'budget_tokens': 8000},
        messages=messages,
    ) as stream:
        response = stream.get_final_message()
    text = '\n'.join(
        block.text for block in response.content if block.type == 'text'
    )
    return text, _claude_usage(response)


# --- Mode parsing ---

def parse_mode(prompt):
    """Return (mode, clean_prompt). Default is 'chat' (Claude).
    /doc → document editing mode
    /consensus → multi-model synthesis
    @grok / @gemini / @gpt → direct model routing
    """
    stripped = prompt.strip()
    lower = stripped.lower()
    if lower.startswith('/doc'):
        return 'doc', stripped[len('/doc'):].strip()
    if lower.startswith('/pr'):
        return 'pr', stripped[len('/pr'):].strip()
    if lower.startswith('/consensus'):
        return 'consensus', stripped[len('/consensus'):].strip()
    for model in ('grok', 'gemini', 'gpt', 'claude'):
        if lower.startswith(f'@{model}'):
            return 'chat' if model == 'claude' else model, stripped[len(model) + 1:].strip()
    return None, stripped  # no prefix — caller decides default


# --- Core logic (shared by CLI and API) ---

_QUERY_MAP = {
    'chat': ('claude', query_claude),
    'gpt': ('gpt', query_gpt),
    'grok': ('grok', query_grok),
    'gemini': ('gemini', query_gemini),
}


def run_chat(prompt, keys, conversation_id=None, mode='chat'):
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, mode)
    messages = history + [{'role': 'user', 'content': prompt}]
    position = len(history) // 2

    key_name, query_fn = _QUERY_MAP[mode]
    response, usage = query_fn(keys[key_name], messages)
    save_chat(conversation_id, position, prompt, response, mode=mode,
              input_tokens=usage.get('input'), output_tokens=usage.get('output'))
    return response, conversation_id


# --- Document mode ---

_DOC_SYSTEM_PROMPT = """You are a document editor. The user is collaborating with you on a markdown document.

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


def build_doc_history(conversation_id):
    """Build message history for doc mode, embedding document context."""
    import json as _json
    if not conversation_id:
        return []
    conv = get_conversation(conversation_id)
    if not conv:
        return []

    history = []
    for msg in conv['messages']:
        user_content = msg['prompt']
        if msg.get('document'):
            user_content = f"Current document:\n\n{msg['document']}\n\n---\n\nUser request: {msg['prompt']}"
        history.append({'role': 'user', 'content': user_content})
        if msg.get('response'):
            history.append({'role': 'assistant', 'content': _json.dumps({
                'chat': msg['response'],
                'document': msg.get('document', ''),
            })})
    return history


def run_doc(prompt, keys, conversation_id=None, document=None):
    """Run a document editing turn.

    Returns dict with keys:
      - chat: str
      - conversation_id: str
      - document: str | None  (full doc, for creation or full rewrite)
      - edits: list | None    (surgical edits for approval)
    """
    import json as _json

    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_doc_history(conversation_id)

    # Build current turn's user message
    user_content = prompt
    if document:
        user_content = f'Current document:\n\n{document}\n\n---\n\nUser request: {prompt}'

    messages = history + [{'role': 'user', 'content': user_content}]
    position = len(history) // 2

    # Use Claude with system prompt
    client = anthropic.Anthropic(api_key=keys['claude'])
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        thinking={'type': 'enabled', 'budget_tokens': 8000},
        system=_DOC_SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        response = stream.get_final_message()

    raw_text = '\n'.join(
        block.text for block in response.content if block.type == 'text'
    )
    usage = _claude_usage(response)

    # Parse JSON response
    try:
        parsed = _json.loads(raw_text)
        chat_response = parsed.get('chat', '')
    except _json.JSONDecodeError:
        # Total fallback: treat as document on first turn
        chat_response = 'Document created.'
        parsed = {'document': raw_text}

    result = {
        'chat': chat_response,
        'conversation_id': conversation_id,
        'document': None,
        'edits': None,
    }

    if 'edits' in parsed:
        # Surgical edit mode — don't save document yet (user must approve)
        result['edits'] = parsed['edits']
        save_chat(conversation_id, position, prompt, chat_response, mode='doc',
                  input_tokens=usage.get('input'), output_tokens=usage.get('output'),
                  document=document)  # preserve current doc
    else:
        # Full document mode (creation or full rewrite)
        doc_content = parsed.get('document', raw_text)
        result['document'] = doc_content
        save_chat(conversation_id, position, prompt, chat_response, mode='doc',
                  input_tokens=usage.get('input'), output_tokens=usage.get('output'),
                  document=doc_content)

    return result


def get_keys():
    keys = {
        'claude': os.environ.get('ANTHROPIC_API_KEY'),
        'gpt': os.environ.get('OPENAI_API_KEY'),
        'grok': os.environ.get('XAI_API_KEY'),
        'gemini': os.environ.get('GEMINI_API_KEY'),
    }
    missing = [k for k, v in keys.items() if not v]
    return keys, missing


def run_opinions(prompt, keys, conversation_id=None, mode='consensus'):
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, mode)
    messages = history + [{'role': 'user', 'content': prompt}]
    position = len(history) // 2

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
            except Exception as e:
                errors[name] = str(e)

    for name in ['claude', 'gpt', 'grok', 'gemini']:
        if name not in responses:
            responses[name] = f'[Error: {errors[name]}]'

    result, synthesis_usage = synthesize(keys['claude'], prompt, responses, history, mode=mode)
    save_opinion(conversation_id, position, prompt, responses, result,
                 usages=usages, synthesis_usage=synthesis_usage, mode=mode)
    return result, responses, errors, conversation_id


# --- PR review ---

_PR_REVIEW_PROMPT = """You are a technical auditor reviewing a pull request. Your sole task is to identify material technical defects in the code changes.

Report ONLY issues that would cause incorrect behavior, data loss, security vulnerabilities, or meaningful performance degradation in production. Every issue you report must reference specific code from the diff.

Do NOT report:
- Style preferences or alternative approaches
- Suggestions for future improvements
- Minor naming or formatting choices
- Anything that works correctly as-is

Be exhaustive. Finding every real issue matters more than being concise. If there are no material issues, say so.

---

"""

_GITHUB_HEADERS = {'Accept': 'application/vnd.github.v3+json'}


def _compact_patch(patch):
    """Strip unchanged context lines from a diff patch, keeping only changes and hunk headers."""
    lines = patch.split('\n')
    kept = []
    for line in lines:
        if not line:
            continue
        # Keep: +/- lines, @@ hunk headers, "No newline" markers
        if line[0] in ('+', '-') or line.startswith('@@') or line.startswith('\\'):
            kept.append(line)
    return '\n'.join(kept)


def fetch_pr(url):
    """Fetch PR metadata and compact diff from the GitHub API (public repos)."""
    match = re.match(r'https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)', url)
    if not match:
        raise ValueError(f'Invalid GitHub PR URL: {url}')

    owner, repo, number = match.groups()
    api_base = f'https://api.github.com/repos/{owner}/{repo}/pulls/{number}'

    # PR metadata
    pr_resp = requests.get(api_base, headers=_GITHUB_HEADERS)
    pr_resp.raise_for_status()
    pr = pr_resp.json()

    # PR files (paginated)
    files = []
    page = 1
    while True:
        resp = requests.get(
            f'{api_base}/files',
            headers=_GITHUB_HEADERS,
            params={'per_page': 100, 'page': page},
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        files.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    # Format into structured markdown with compacted diffs
    title = pr['title']
    body = pr.get('body') or '(No description)'
    author = pr['user']['login']
    base_branch = pr['base']['ref']
    head_branch = pr['head']['ref']

    file_sections = []
    for f in files:
        raw_patch = f.get('patch', '')
        patch = _compact_patch(raw_patch) if raw_patch else '(binary or too large)'
        file_sections.append(
            f"### {f['filename']} ({f['status']}, +{f['additions']}/-{f['deletions']})\n"
            f'```diff\n{patch}\n```'
        )

    return (
        f'# Pull Request: {title}\n'
        f'**Author:** {author}\n'
        f'**Branch:** {head_branch} → {base_branch}\n\n'
        f'## Description\n{body}\n\n'
        f'## File Changes\n\n' + '\n\n'.join(file_sections)
    )


def run_pr_review(url, keys, conversation_id=None):
    """Fetch a GitHub PR and run a multi-model consensus code review."""
    pr_content = fetch_pr(url)
    review_prompt = _PR_REVIEW_PROMPT + pr_content
    return run_opinions(review_prompt, keys, conversation_id, mode='pr')


def run_opinions_stream(prompt, keys, conversation_id=None, mode='consensus'):
    """Generator yielding progress events, then the final result."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = build_history(conversation_id, mode)
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
            except Exception as e:
                errors[name] = str(e)
                yield {'event': 'model_done', 'model': name, 'error': True}

    for name in ['claude', 'gpt', 'grok', 'gemini']:
        if name not in responses:
            responses[name] = f'[Error: {errors[name]}]'

    yield {'event': 'synthesizing'}
    result, synthesis_usage = synthesize(keys['claude'], prompt, responses, history, mode=mode)

    save_opinion(conversation_id, position, prompt, responses, result,
                 usages=usages, synthesis_usage=synthesis_usage, mode=mode)

    yield {
        'event': 'done',
        'mode': mode,
        'conversation_id': conversation_id,
        'response': result,
        'individual': responses,
        'errors': errors,
    }


def run_pr_review_stream(url, keys, conversation_id=None):
    """Fetch a GitHub PR and stream a multi-model review with progress."""
    yield {'event': 'fetching_pr'}
    pr_content = fetch_pr(url)
    yield {'event': 'pr_fetched'}
    review_prompt = _PR_REVIEW_PROMPT + pr_content
    yield from run_opinions_stream(review_prompt, keys, conversation_id, mode='pr')


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(description='Multi-model AI conversations.')
    parser.add_argument('prompt', help='The prompt to send to all models')
    args = parser.parse_args()

    keys, missing = get_keys()
    if missing:
        print('Missing API keys:', ', '.join(missing), file=sys.stderr)
        sys.exit(1)

    init_db()

    print('Querying all models...', file=sys.stderr)
    result, responses, errors, _ = run_opinions(args.prompt, keys)

    if errors:
        print(f"\n{len(errors)} model(s) failed: {', '.join(errors.keys())}", file=sys.stderr)

    print(result)


if __name__ == '__main__':
    main()
