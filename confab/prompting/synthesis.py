"""Synthesis prompts and builders."""


def consensus_synthesis_prompt() -> str:
    """Return the consensus synthesis prompt."""
    return """I've given you the research brief and then responses from researchers A, B, C, and D.

Each of them is from an individual researcher, where each are working on the exact same brief. I want you to look at them, and then report back in terms of:

1) Where do all four have clear consensus?
2) Where do one or more are contradicting each other or are in clear disagreement with each other?
3) Where is it unclear if there is consensus or if there is contradiction/disagreement?
4) What did they all miss?"""


def pr_synthesis_directive() -> str:
    """Return the PR review synthesis directive."""
    return """Four independent reviewers have examined this pull request. Consolidate their findings into a single clean technical audit.

- Merge duplicate findings into one
- Drop any finding that another reviewer's analysis shows to be a false positive
- Do NOT reference the individual reviewers (no "Reviewer A said...")
- Output a flat list of confirmed material issues with code references
- If no material issues survive consolidation, say so"""


def build_synthesis_prompt(
    prompt: str,
    responses: dict[str, str],
    mode: str = 'consensus',
) -> str:
    """Build the synthesis prompt from model responses."""
    labels = list(
        zip(
            ['A', 'B', 'C', 'D'],
            [
                responses['claude'],
                responses['gpt'],
                responses['grok'],
                responses['gemini'],
            ],
        )
    )
    researcher_blocks = '\n\n---\n\n'.join(
        f'Reviewer {label}:\n{text}' for label, text in labels
    )
    tail_prompt = pr_synthesis_directive() if mode == 'pr' else consensus_synthesis_prompt()
    return f"""{prompt}

---

{researcher_blocks}

---

{tail_prompt}"""
