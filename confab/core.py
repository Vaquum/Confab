"""Confab orchestration facade and CLI entrypoint."""

import argparse
import sys

from .config import get_keys
from .db import init_db
from .services import (
    parse_mode,
    run_chat,
    run_doc,
    run_opinions,
    run_opinions_stream,
    run_pr_review,
    run_pr_review_stream,
)

__all__ = [
    'get_keys',
    'main',
    'parse_mode',
    'run_chat',
    'run_doc',
    'run_opinions',
    'run_opinions_stream',
    'run_pr_review',
    'run_pr_review_stream',
]


def main():
    """Run CLI consensus workflow for a single prompt."""
    parser = argparse.ArgumentParser(description='Multi-model AI conversations.')
    parser.add_argument('prompt', help='The prompt to send to all models')
    args = parser.parse_args()

    keys, missing = get_keys()
    if missing:
        print('Missing API keys:', ', '.join(missing), file=sys.stderr)
        sys.exit(1)

    init_db()

    print('Querying all models...', file=sys.stderr)
    result, _responses, errors, _conversation_id = run_opinions(
        args.prompt,
        keys,
        user_id='cli-local',
    )
    if errors:
        print(
            f"\n{len(errors)} model(s) failed: {', '.join(errors.keys())}",
            file=sys.stderr,
        )
    print(result)


if __name__ == '__main__':
    main()
