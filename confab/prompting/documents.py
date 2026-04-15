"""Document-mode prompts and builders."""


def document_system_directive() -> str:
    """Return the system directive for document mode."""
    return """You are a document editor. The user is collaborating with you on a markdown document.

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


def build_document_request_payload(prompt: str, prompt_is_labeled: bool = False) -> str:
    """Return the user request payload for document mode."""
    if prompt_is_labeled:
        return prompt
    return f'User request: {prompt}'


def build_document_user_prompt(
    prompt: str,
    document: str | None = None,
    prompt_is_labeled: bool = False,
) -> str:
    """Build the user prompt sent to the model for document workflows."""
    if not document:
        return prompt
    request_payload = build_document_request_payload(
        prompt,
        prompt_is_labeled=prompt_is_labeled,
    )
    return f'Current document:\n\n{document}\n\n---\n\n{request_payload}'
