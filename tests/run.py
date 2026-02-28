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

    os.environ.setdefault('ANTHROPIC_API_KEY', 'test-key')
    os.environ.setdefault('OPENAI_API_KEY', 'test-key')
    os.environ.setdefault('XAI_API_KEY', 'test-key')
    os.environ.setdefault('GEMINI_API_KEY', 'test-key')

    os.environ.setdefault('SUPABASE_URL', 'https://supabase.test')
    os.environ.setdefault('SUPABASE_ANON_KEY', 'test-anon-key')
    os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    os.environ.setdefault('DOMAIN', 'example.com')

    db_path = pathlib.Path.cwd() / 'confab-test.sqlite3'
    os.environ.setdefault('DATABASE_URL', f'sqlite:///{db_path}')


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
