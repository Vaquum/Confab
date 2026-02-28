import os
import pathlib
import sys
import unittest
from typing import Any

import dotenv


def _noop_load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
    return False


def configure_test_environment():
    os.environ['PYTHON_DOTENV_DISABLED'] = '1'
    dotenv.load_dotenv = _noop_load_dotenv

    os.environ['ANTHROPIC_API_KEY'] = 'test-key'
    os.environ['OPENAI_API_KEY'] = 'test-key'
    os.environ['XAI_API_KEY'] = 'test-key'
    os.environ['GEMINI_API_KEY'] = 'test-key'

    os.environ['SUPABASE_URL'] = 'https://supabase.test'
    os.environ['SUPABASE_ANON_KEY'] = 'test-anon-key'
    os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'
    os.environ['DOMAIN'] = 'example.com'

    results_dir = pathlib.Path.cwd() / 'test-results'
    results_dir.mkdir(parents=True, exist_ok=True)
    db_path = results_dir / 'confab-test.sqlite3'
    if db_path.exists():
        db_path.unlink()
    os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'


def run():
    configure_test_environment()
    loader = unittest.TestLoader()
    suite = loader.discover('tests', pattern='test_*.py')
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run()
    sys.exit(0 if success else 1)
