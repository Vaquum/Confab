"""GitHub PR review workflow service."""

import re

import requests

from .consensus import run_opinions, run_opinions_stream

PR_REVIEW_PROMPT = """You are a technical auditor reviewing a pull request. Your sole task is to identify material technical defects in the code changes.

Report ONLY issues that would cause incorrect behavior, data loss, security vulnerabilities, or meaningful performance degradation in production. Every issue you report must reference specific code from the diff.

Do NOT report:
- Style preferences or alternative approaches
- Suggestions for future improvements
- Minor naming or formatting choices
- Anything that works correctly as-is

Be exhaustive. Finding every real issue matters more than being concise. If there are no material issues, say so.

---

"""

GITHUB_HEADERS = {'Accept': 'application/vnd.github.v3+json'}


def _compact_patch(patch):
    """Keep changed lines and hunk markers only."""
    lines = patch.split('\n')
    kept = []
    for line in lines:
        if not line:
            continue
        if line[0] in ('+', '-') or line.startswith('@@') or line.startswith('\\'):
            kept.append(line)
    return '\n'.join(kept)


def fetch_pr(url):
    """Fetch PR metadata and compact file diffs from GitHub API."""
    match = re.match(r'https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)', url)
    if not match:
        raise ValueError(f'Invalid GitHub PR URL: {url}')

    owner, repo, number = match.groups()
    api_base = f'https://api.github.com/repos/{owner}/{repo}/pulls/{number}'

    pr_response = requests.get(api_base, headers=GITHUB_HEADERS)
    pr_response.raise_for_status()
    pr = pr_response.json()

    files = []
    page = 1
    while True:
        response = requests.get(
            f'{api_base}/files',
            headers=GITHUB_HEADERS,
            params={'per_page': 100, 'page': page},
        )
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break
        files.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    title = pr['title']
    body = pr.get('body') or '(No description)'
    author = pr['user']['login']
    base_branch = pr['base']['ref']
    head_branch = pr['head']['ref']

    file_sections = []
    for file in files:
        raw_patch = file.get('patch', '')
        patch = _compact_patch(raw_patch) if raw_patch else '(binary or too large)'
        file_sections.append(
            f"### {file['filename']} ({file['status']}, +{file['additions']}/-{file['deletions']})\n"
            f'```diff\n{patch}\n```'
        )

    return (
        f'# Pull Request: {title}\n'
        f'**Author:** {author}\n'
        f'**Branch:** {head_branch} → {base_branch}\n\n'
        f'## Description\n{body}\n\n'
        f'## File Changes\n\n' + '\n\n'.join(file_sections)
    )


def run_pr_review(url, keys, conversation_id=None, user_id='cli-local'):
    """Run PR review via consensus workflow."""
    pr_content = fetch_pr(url)
    review_prompt = PR_REVIEW_PROMPT + pr_content
    return run_opinions(
        review_prompt,
        keys,
        conversation_id=conversation_id,
        mode='pr',
        user_id=user_id,
    )


def run_pr_review_stream(url, keys, conversation_id=None, user_id='cli-local'):
    """Stream PR review progress and result."""
    yield {'event': 'fetching_pr'}
    pr_content = fetch_pr(url)
    yield {'event': 'pr_fetched'}
    review_prompt = PR_REVIEW_PROMPT + pr_content
    yield from run_opinions_stream(
        review_prompt,
        keys,
        conversation_id=conversation_id,
        mode='pr',
        user_id=user_id,
    )
