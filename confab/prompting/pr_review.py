"""PR review prompts and builders."""


def pr_review_directive() -> str:
    """Return the PR review directive."""
    return """You are a technical auditor reviewing a pull request. Your sole task is to identify material technical defects in the code changes.

Report ONLY issues that would cause incorrect behavior, data loss, security vulnerabilities, or meaningful performance degradation in production. Every issue you report must reference specific code from the diff.

Do NOT report:
- Style preferences or alternative approaches
- Suggestions for future improvements
- Minor naming or formatting choices
- Anything that works correctly as-is

Be exhaustive. Finding every real issue matters more than being concise. If there are no material issues, say so.

---

"""


def pr_description_fallback() -> str:
    """Return the fallback text for an empty PR description."""
    return '(No description)'


def compact_patch(raw_patch: str) -> str:
    """Keep changed lines and hunk markers only."""
    lines = raw_patch.split('\n')
    kept = []
    for line in lines:
        if not line:
            continue
        if line[0] in ('+', '-') or line.startswith('@@') or line.startswith('\\'):
            kept.append(line)
    return '\n'.join(kept)


def build_pr_file_section(file_info: dict[str, object]) -> str:
    """Build the rendered file section for PR review input."""
    raw_patch = str(file_info.get('patch') or '')
    patch = compact_patch(raw_patch) if raw_patch else '(binary or too large)'
    return (
        f"### {file_info['filename']} ({file_info['status']}, "
        f"+{file_info['additions']}/-{file_info['deletions']})\n"
        f'```diff\n{patch}\n```'
    )


def build_pr_review_content(
    title: str,
    body: str | None,
    author: str,
    base_branch: str,
    head_branch: str,
    files: list[dict[str, object]],
) -> str:
    """Build the PR metadata and diff bundle passed to the reviewer prompt."""
    description = body or pr_description_fallback()
    file_sections = [build_pr_file_section(file_info) for file_info in files]
    return (
        f'# Pull Request: {title}\n'
        f'**Author:** {author}\n'
        f'**Branch:** {head_branch} → {base_branch}\n\n'
        f'## Description\n{description}\n\n'
        f'## File Changes\n\n' + '\n\n'.join(file_sections)
    )


def build_pr_review_prompt(pr_content: str) -> str:
    """Build the full PR review prompt."""
    return pr_review_directive() + pr_content
