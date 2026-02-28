import importlib
import os
import pathlib
import unittest
from typing import Any
from unittest.mock import patch

import dotenv
import requests
from fastapi.testclient import TestClient


def _noop_load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
    return False


def _configure_test_environment() -> None:
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
    os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'


_configure_test_environment()
server = importlib.import_module('confab.server')


class FakeResponse:
    def __init__(self, status_code, payload=None, json_error=False) -> None:
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self._json_error = json_error

    def json(self):
        if self._json_error:
            raise ValueError('invalid json')
        return self._payload


class ApiServerTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(server.app)

    def setUp(self):
        server.app.dependency_overrides.clear()

    def tearDown(self):
        server.app.dependency_overrides.clear()

    @staticmethod
    def _auth_headers() -> dict[str, str]:
        return {'Authorization': 'Bearer test-token'}

    def _set_auth_override(self, user_id='user-1'):
        server.app.dependency_overrides[server.get_current_user] = lambda: {
            'id': user_id,
            'email': f'tester@{server.ALLOWED_EMAIL_DOMAIN}',
        }

    def test_get_index_returns_html(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/html', response.headers.get('content-type', ''))
        self.assertIn(server.ALLOWED_EMAIL_DOMAIN, response.text)

    def test_get_typography_css_returns_stylesheet(self):
        response = self.client.get('/typography.css')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/css', response.headers.get('content-type', ''))
        self.assertIn(':root', response.text)

    def test_magic_link_returns_ok_on_success(self):
        email = f'user@{server.ALLOWED_EMAIL_DOMAIN}'
        with patch.object(
            server.requests,
            'post',
            return_value=FakeResponse(200, {'ok': True}),
        ) as mock_post:
            response = self.client.post(
                '/api/auth/magic-link',
                json={
                    'email': email,
                    'email_redirect_to': 'http://localhost:8000',
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        self.assertIn('/auth/v1/otp', mock_post.call_args.args[0])
        call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(call_kwargs['json']['email'], email)
        self.assertTrue(call_kwargs['json']['create_user'])

    def test_magic_link_returns_500_when_supabase_not_configured(self):
        with patch.object(server, 'SUPABASE_URL', None):
            response = self.client.post(
                '/api/auth/magic-link',
                json={'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'},
            )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()['detail'], 'Supabase auth is not configured')

    def test_magic_link_rejects_disallowed_email_domain(self):
        response = self.client.post(
            '/api/auth/magic-link',
            json={'email': 'user@outside-domain.com'},
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('emails are allowed', response.json()['detail'])

    def test_magic_link_returns_503_on_provider_exception(self):
        with patch.object(
            server.requests,
            'post',
            side_effect=requests.RequestException('network down'),
        ):
            response = self.client.post(
                '/api/auth/magic-link',
                json={'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'},
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn('Auth provider unavailable', response.json()['detail'])

    def test_magic_link_returns_400_with_provider_message(self):
        with patch.object(
            server.requests,
            'post',
            return_value=FakeResponse(400, {'error_description': 'rate limit reached'}),
        ):
            response = self.client.post(
                '/api/auth/magic-link',
                json={'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'},
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], 'rate limit reached')

    def test_magic_link_returns_default_400_on_non_json_error(self):
        with patch.object(
            server.requests,
            'post',
            return_value=FakeResponse(400, json_error=True),
        ):
            response = self.client.post(
                '/api/auth/magic-link',
                json={'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'},
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], 'Unable to send magic link')

    def test_protected_endpoint_requires_authorization_header(self):
        response = self.client.get('/api/opinions')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['detail'], 'Missing authorization')

    def test_protected_endpoint_rejects_invalid_authorization_header(self):
        response = self.client.get(
            '/api/opinions',
            headers={'Authorization': 'Token value'},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['detail'], 'Invalid authorization header')

    def test_protected_endpoint_maps_supabase_status_codes(self):
        cases = [
            (401, 401, 'Unauthorized'),
            (403, 401, 'Unauthorized'),
            (429, 503, 'Auth provider temporarily unavailable'),
            (500, 503, 'Auth provider unavailable'),
            (502, 503, 'Auth provider unavailable'),
            (418, 503, 'Auth provider error'),
        ]
        for provider_status, expected_status, expected_detail in cases:
            with self.subTest(provider_status=provider_status):
                with patch.object(
                    server.requests,
                    'get',
                    return_value=FakeResponse(provider_status, {}),
                ):
                    response = self.client.get(
                        '/api/opinions',
                        headers=self._auth_headers(),
                    )
                self.assertEqual(response.status_code, expected_status)
                self.assertEqual(response.json()['detail'], expected_detail)

    def test_protected_endpoint_returns_503_on_provider_exception(self):
        with patch.object(
            server.requests,
            'get',
            side_effect=requests.RequestException('provider unreachable'),
        ):
            response = self.client.get('/api/opinions', headers=self._auth_headers())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['detail'], 'Auth provider unavailable')

    def test_protected_endpoint_rejects_invalid_provider_json(self):
        with patch.object(
            server.requests,
            'get',
            return_value=FakeResponse(200, json_error=True),
        ):
            response = self.client.get('/api/opinions', headers=self._auth_headers())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['detail'], 'Invalid auth provider response')

    def test_protected_endpoint_rejects_missing_user_id(self):
        payload = {'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'}
        with patch.object(
            server.requests,
            'get',
            return_value=FakeResponse(200, payload),
        ):
            response = self.client.get('/api/opinions', headers=self._auth_headers())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['detail'], 'Unauthorized')

    def test_protected_endpoint_rejects_disallowed_email_domain(self):
        payload = {'id': 'u-1', 'email': 'user@outside-domain.com'}
        with patch.object(
            server.requests,
            'get',
            return_value=FakeResponse(200, payload),
        ):
            response = self.client.get('/api/opinions', headers=self._auth_headers())
        self.assertEqual(response.status_code, 403)
        self.assertIn('emails are allowed', response.json()['detail'])

    def test_list_conversations_uses_authenticated_user_id(self):
        payload = {'id': 'user-42', 'email': f'user@{server.ALLOWED_EMAIL_DOMAIN}'}
        with (
            patch.object(
                server.requests,
                'get',
                return_value=FakeResponse(200, payload),
            ),
            patch.object(
                server,
                'list_conversations',
                return_value=[{'conversation_id': 'c-1'}],
            ) as list_mock,
        ):
            response = self.client.get('/api/opinions', headers=self._auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{'conversation_id': 'c-1'}])
        list_mock.assert_called_once_with('user-42')

    def test_get_conversation_returns_404_when_missing(self):
        self._set_auth_override()
        with patch.object(server, 'get_conversation', return_value=None):
            response = self.client.get('/api/conversations/missing')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['detail'], 'Not found')

    def test_get_conversation_returns_payload(self):
        self._set_auth_override()
        conversation = {'conversation_id': 'c-1', 'mode': 'chat', 'messages': []}
        with patch.object(server, 'get_conversation', return_value=conversation) as get_mock:
            response = self.client.get('/api/conversations/c-1')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), conversation)
        get_mock.assert_called_once_with('user-1', 'c-1')

    def test_patch_conversation_returns_404_when_missing(self):
        self._set_auth_override()
        with patch.object(server, 'get_conversation', return_value=None):
            response = self.client.patch(
                '/api/conversations/c-1',
                json={'title': 'New title'},
            )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['detail'], 'Not found')

    def test_patch_conversation_renames_with_stripped_title(self):
        self._set_auth_override()
        with (
            patch.object(server, 'get_conversation', return_value={'mode': 'chat'}),
            patch.object(server, 'rename_conversation') as rename_mock,
        ):
            response = self.client.patch(
                '/api/conversations/c-1',
                json={'title': '  New title  '},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        rename_mock.assert_called_once_with('user-1', 'c-1', 'New title')

    def test_delete_conversation_returns_404_when_missing(self):
        self._set_auth_override()
        with patch.object(server, 'get_conversation', return_value=None):
            response = self.client.delete('/api/conversations/c-1')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['detail'], 'Not found')

    def test_delete_conversation_deletes_when_present(self):
        self._set_auth_override()
        with (
            patch.object(server, 'get_conversation', return_value={'mode': 'chat'}),
            patch.object(server, 'delete_conversation') as delete_mock,
        ):
            response = self.client.delete('/api/conversations/c-1')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        delete_mock.assert_called_once_with('user-1', 'c-1')

    def test_put_document_returns_404_when_missing(self):
        self._set_auth_override()
        with patch.object(server, 'get_conversation', return_value=None):
            response = self.client.put(
                '/api/conversations/c-1/document',
                json={'document': '# Doc'},
            )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['detail'], 'Not found')

    def test_put_document_returns_400_for_non_doc_mode(self):
        self._set_auth_override()
        with patch.object(server, 'get_conversation', return_value={'mode': 'chat'}):
            response = self.client.put(
                '/api/conversations/c-1/document',
                json={'document': '# Doc'},
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['detail'], 'Not a doc conversation')

    def test_put_document_updates_latest_document(self):
        self._set_auth_override()
        with (
            patch.object(server, 'get_conversation', return_value={'mode': 'doc'}),
            patch.object(server, 'update_latest_document') as update_mock,
        ):
            response = self.client.put(
                '/api/conversations/c-1/document',
                json={'document': '# Updated'},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        update_mock.assert_called_once_with('user-1', 'c-1', '# Updated')

    def test_get_settings_returns_empty_dict_when_missing(self):
        self._set_auth_override()
        with patch.object(server, 'get_user_settings', return_value=None):
            response = self.client.get('/api/settings')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'settings': {}})

    def test_get_settings_returns_saved_values(self):
        self._set_auth_override()
        saved = {'fontSize': 18}
        with patch.object(server, 'get_user_settings', return_value=saved):
            response = self.client.get('/api/settings')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'settings': saved})

    def test_put_settings_persists_values(self):
        self._set_auth_override()
        payload = {'fontSize': 17, 'lineHeight': 1.8}
        with patch.object(server, 'save_user_settings') as save_mock:
            response = self.client.put('/api/settings', json={'settings': payload})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        save_mock.assert_called_once_with('user-1', payload)

    def test_post_opinions_chat_success(self):
        self._set_auth_override()
        with patch.object(server, 'run_chat', return_value=('reply', 'c-1')) as run_chat_mock:
            response = self.client.post('/api/opinions', json={'prompt': 'Hello'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {'mode': 'chat', 'conversation_id': 'c-1', 'response': 'reply'},
        )
        self.assertEqual(run_chat_mock.call_args.args[0], 'Hello')
        self.assertEqual(run_chat_mock.call_args.kwargs['mode'], 'chat')
        self.assertEqual(run_chat_mock.call_args.kwargs['user_id'], 'user-1')

    def test_post_opinions_chat_returns_500_on_error(self):
        self._set_auth_override()
        with patch.object(server, 'run_chat', side_effect=RuntimeError('chat failed')):
            response = self.client.post('/api/opinions', json={'prompt': 'Hello'})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()['detail'], 'chat failed')

    def test_post_opinions_doc_returns_document_payload(self):
        self._set_auth_override()
        run_doc_payload = {
            'chat': 'Document created.',
            'conversation_id': 'doc-1',
            'document': '# Draft',
            'edits': None,
        }
        with patch.object(server, 'run_doc', return_value=run_doc_payload):
            response = self.client.post('/api/opinions', json={'prompt': '/doc Draft this'})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['mode'], 'doc')
        self.assertEqual(body['conversation_id'], 'doc-1')
        self.assertEqual(body['document'], '# Draft')
        self.assertNotIn('edits', body)

    def test_post_opinions_doc_returns_edits_payload(self):
        self._set_auth_override()
        edits = [{'old': 'a', 'new': 'b', 'context_before': '', 'context_after': ''}]
        run_doc_payload = {
            'chat': 'Proposed edits.',
            'conversation_id': 'doc-2',
            'document': None,
            'edits': edits,
        }
        with patch.object(server, 'run_doc', return_value=run_doc_payload):
            response = self.client.post('/api/opinions', json={'prompt': '/doc improve'})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['mode'], 'doc')
        self.assertEqual(body['edits'], edits)
        self.assertNotIn('document', body)

    def test_post_opinions_doc_uses_existing_document_for_follow_up(self):
        self._set_auth_override()
        conversation = {
            'mode': 'doc',
            'messages': [
                {'prompt': 'old', 'document': '# Existing doc'},
                {'prompt': 'next', 'document': '# Existing doc'},
            ],
        }
        run_doc_payload = {
            'chat': 'Updated.',
            'conversation_id': 'doc-3',
            'document': '# Existing doc\n\nUpdated',
            'edits': None,
        }
        with (
            patch.object(
                server,
                'get_conversation',
                side_effect=[conversation, conversation],
            ),
            patch.object(server, 'run_doc', return_value=run_doc_payload) as run_doc_mock,
        ):
            response = self.client.post(
                '/api/opinions',
                json={'prompt': 'Continue this', 'conversation_id': 'doc-3'},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(run_doc_mock.call_args.kwargs['document'], '# Existing doc')

    def test_post_opinions_doc_returns_500_on_error(self):
        self._set_auth_override()
        with patch.object(server, 'run_doc', side_effect=RuntimeError('doc failed')):
            response = self.client.post('/api/opinions', json={'prompt': '/doc draft'})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()['detail'], 'doc failed')

    def test_post_opinions_consensus_returns_sse_stream(self):
        self._set_auth_override()
        events = [
            {'event': 'models_started'},
            {
                'event': 'done',
                'mode': 'consensus',
                'conversation_id': 'cons-1',
                'response': 'Final synthesis',
                'individual': {},
                'errors': {},
            },
        ]
        with patch.object(server, 'run_opinions_stream', return_value=iter(events)):
            response = self.client.post('/api/opinions', json={'prompt': '/consensus evaluate'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/event-stream', response.headers.get('content-type', ''))
        self.assertIn('"models_started"', response.text)
        self.assertIn('"done"', response.text)

    def test_post_opinions_pr_returns_sse_and_renames_on_done(self):
        self._set_auth_override()
        events = [
            {
                'event': 'done',
                'mode': 'pr',
                'conversation_id': 'pr-1',
                'response': 'PR synthesis',
                'individual': {},
                'errors': {},
            },
        ]
        with (
            patch.object(server, 'run_pr_review_stream', return_value=iter(events)),
            patch.object(server, 'rename_conversation') as rename_mock,
        ):
            response = self.client.post(
                '/api/opinions',
                json={'prompt': '/pr https://github.com/org/repo/pull/1'},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/event-stream', response.headers.get('content-type', ''))
        self.assertIn('"pr-1"', response.text)
        rename_mock.assert_called_once_with(
            'user-1',
            'pr-1',
            'PR: https://github.com/org/repo/pull/1',
        )

    def test_post_opinions_honors_mode_lock_for_existing_consensus_thread(self):
        self._set_auth_override()
        existing = {
            'mode': 'consensus',
            'messages': [{'mode': 'consensus', 'prompt': 'previous', 'synthesis': 'answer'}],
        }
        events = [
            {
                'event': 'done',
                'mode': 'consensus',
                'conversation_id': 'cons-2',
                'response': 'Follow-up synthesis',
                'individual': {},
                'errors': {},
            },
        ]
        with (
            patch.object(server, 'get_conversation', return_value=existing),
            patch.object(server, 'run_opinions_stream', return_value=iter(events)) as stream_mock,
        ):
            response = self.client.post(
                '/api/opinions',
                json={'prompt': 'follow up', 'conversation_id': 'cons-2'},
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn('"Follow-up synthesis"', response.text)
        self.assertEqual(stream_mock.call_args.args[0], 'follow up')


if __name__ == '__main__':
    unittest.main(verbosity=2)
