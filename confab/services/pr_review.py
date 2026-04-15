"""GitHub PR review workflow service."""

import re

import requests

from ..prompting import build_pr_review_content, build_pr_review_prompt
from .consensus import run_opinions, run_opinions_stream

GITHUB_HEADERS = {'Accept': 'application/vnd.github.v3+json'}
GITHUB_REQUEST_TIMEOUT_SECONDS = 10


def fetch_pr(url):
    """Fetch PR metadata and compact file diffs from GitHub API."""
    match = re.match(r'https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)', url)
    if not match:
        raise ValueError(f'Invalid GitHub PR URL: {url}')

    owner, repo, number = match.groups()
    api_base = f'https://api.github.com/repos/{owner}/{repo}/pulls/{number}'

    pr_response = requests.get(
        api_base,
        headers=GITHUB_HEADERS,
        timeout=GITHUB_REQUEST_TIMEOUT_SECONDS,
    )
    pr_response.raise_for_status()
    pr = pr_response.json()

    files = []
    page = 1
    while True:
        response = requests.get(
            f'{api_base}/files',
            headers=GITHUB_HEADERS,
            params={'per_page': 100, 'page': page},
            timeout=GITHUB_REQUEST_TIMEOUT_SECONDS,
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
    body = pr.get('body')
    author = pr['user']['login']
    base_branch = pr['base']['ref']
    head_branch = pr['head']['ref']
    return build_pr_review_content(
        title=title,
        body=body,
        author=author,
        base_branch=base_branch,
        head_branch=head_branch,
        files=files,
    )


def run_pr_review(url, keys, conversation_id=None, user_id='cli-local'):
    """Run PR review via consensus workflow."""
    pr_content = fetch_pr(url)
    review_prompt = build_pr_review_prompt(pr_content)
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
    review_prompt = build_pr_review_prompt(pr_content)
    yield from run_opinions_stream(
        review_prompt,
        keys,
        conversation_id=conversation_id,
        mode='pr',
        user_id=user_id,
    )
