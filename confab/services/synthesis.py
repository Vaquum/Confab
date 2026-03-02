"""Consensus synthesis helpers."""

import anthropic

from ..config import CLAUDE_MODEL
from ..providers import extract_claude_usage

SYNTHESIS_CONSENSUS_PROMPT = """I've given you the research brief and then responses from researchers A, B, C, and D.

Each of them is from an individual researcher, where each are working on the exact same brief. I want you to look at them, and then report back in terms of:

1) Where do all four have clear consensus?
2) Where do one or more are contradicting each other or are in clear disagreement with each other?
3) Where is it unclear if there is consensus or if there is contradiction/disagreement?
4) What did they all miss?"""

SYNTHESIS_PR_PROMPT = """Four independent reviewers have examined this pull request. Consolidate their findings into a single clean technical audit.

- Merge duplicate findings into one
- Drop any finding that another reviewer's analysis shows to be a false positive
- Do NOT reference the individual reviewers (no "Reviewer A said...")
- Output a flat list of confirmed material issues with code references
- If no material issues survive consolidation, say so"""


def synthesize(api_key, prompt, responses, history=None, mode='consensus'):
    """Synthesize multi-model responses into one final answer."""
    client = anthropic.Anthropic(api_key=api_key)
    labels = list(zip(
        ['A', 'B', 'C', 'D'],
        [responses['claude'], responses['gpt'], responses['grok'], responses['gemini']],
    ))
    researcher_blocks = '\n\n---\n\n'.join(
        f'Reviewer {label}:\n{text}' for label, text in labels
    )
    tail_prompt = SYNTHESIS_PR_PROMPT if mode == 'pr' else SYNTHESIS_CONSENSUS_PROMPT
    synthesis_prompt = f"""{prompt}

---

{researcher_blocks}

---

{tail_prompt}"""
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
