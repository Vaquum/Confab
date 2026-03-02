"""Confab API server."""

import json
import mimetypes
import os
import sys
from importlib.resources import files
from pathlib import Path

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse, Response, StreamingResponse

if __package__:
    from .api.contracts import (
        DocumentUpdateRequest,
        MagicLinkRequest,
        OkResponse,
        PromptRequest,
        RenameRequest,
        SettingsRequest,
        SettingsResponse,
    )
    from .core import (
        get_keys,
        parse_mode,
        run_chat,
        run_doc,
        run_opinions_stream,
        run_pr_review_stream,
    )
    from .db import init_db
    from .repositories import (
        delete_conversation,
        get_conversation,
        get_user_settings,
        list_conversations,
        rename_conversation,
        save_user_settings,
        update_latest_document,
    )
    STATIC_ROOT = files('confab').joinpath('static')
else:
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    from confab.api.contracts import (
        DocumentUpdateRequest,
        MagicLinkRequest,
        OkResponse,
        PromptRequest,
        RenameRequest,
        SettingsRequest,
        SettingsResponse,
    )
    from confab.core import (
        get_keys,
        parse_mode,
        run_chat,
        run_doc,
        run_opinions_stream,
        run_pr_review_stream,
    )
    from confab.db import init_db
    from confab.repositories import (
        delete_conversation,
        get_conversation,
        get_user_settings,
        list_conversations,
        rename_conversation,
        save_user_settings,
        update_latest_document,
    )
    STATIC_ROOT = files('confab').joinpath('static')

app = FastAPI(title='Confab API')

keys, missing = get_keys()
if missing:
    raise RuntimeError(f"Missing API keys: {', '.join(missing)}")

init_db()

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_AUTH_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or SUPABASE_ANON_KEY


def _normalize_domain(value):
    domain = (value or '').strip().lower()
    if domain.startswith('@'):
        domain = domain[1:]
    return domain


ALLOWED_EMAIL_DOMAIN = (
    _normalize_domain(os.environ.get('DOMAIN'))
    or _normalize_domain(os.environ.get('ALLOWED_EMAIL_DOMAIN'))
    or '<your-domain>'
)

GUI_HTML_TEMPLATE = STATIC_ROOT.joinpath('gui.html').read_text(encoding='utf-8')
TYPOGRAPHY_CSS = STATIC_ROOT.joinpath('typography.css').read_text(encoding='utf-8')
APP_ASSET_ROOT = STATIC_ROOT.joinpath('app')
DOC_PLUS_CONTEXT_HEADER = '[DOC_PLUS_CONTEXT]'
DOC_PLUS_CONTEXT_FOOTER = '[/DOC_PLUS_CONTEXT]'
DOC_PLUS_USER_PROMPT_HEADER = '[DOC_PLUS_USER_PROMPT]'


def _render_gui_html():
    return (
        GUI_HTML_TEMPLATE
        .replace('__SUPABASE_URL__', json.dumps(SUPABASE_URL or ''))
        .replace('__SUPABASE_ANON_KEY__', json.dumps(SUPABASE_ANON_KEY or ''))
        .replace('__ALLOWED_EMAIL_DOMAIN__', json.dumps(ALLOWED_EMAIL_DOMAIN))
    )


def _extract_doc_plus_context(prompt: str | None) -> str | None:
    if not prompt:
        return None
    start = prompt.find(DOC_PLUS_CONTEXT_HEADER)
    end = prompt.find(DOC_PLUS_CONTEXT_FOOTER)
    if start == -1 or end == -1 or end <= start:
        return None
    context = prompt[start + len(DOC_PLUS_CONTEXT_HEADER):end].strip()
    if not context:
        return None
    return context


def _extract_doc_plus_user_prompt(prompt: str | None) -> str:
    if not prompt:
        return ''
    if DOC_PLUS_USER_PROMPT_HEADER not in prompt:
        return prompt
    user_prompt = prompt.split(DOC_PLUS_USER_PROMPT_HEADER, maxsplit=1)[1].strip()
    if not user_prompt:
        return ''
    return user_prompt


def _wrap_doc_plus_prompt(context: str, user_prompt: str) -> str:
    return (
        f'{DOC_PLUS_CONTEXT_HEADER}\n{context.strip()}\n{DOC_PLUS_CONTEXT_FOOTER}\n'
        f'{DOC_PLUS_USER_PROMPT_HEADER}\n{user_prompt.strip()}'
    )


def _resolve_doc_plus_context(conversation: dict | None) -> str | None:
    if not conversation:
        return None
    messages = conversation.get('messages') or []
    for message in messages:
        context = _extract_doc_plus_context(message.get('prompt'))
        if context:
            return context
    return None


def _display_prompt(prompt: str | None) -> str:
    return _extract_doc_plus_user_prompt(prompt)


def _get_bearer_token(authorization):
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing authorization')
    parts = authorization.split(' ', 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer' or not parts[1]:
        raise HTTPException(status_code=401, detail='Invalid authorization header')
    return parts[1]


def _email_domain(email):
    return email.rpartition('@')[2].strip().lower()


def _ensure_allowed_email(email):
    if _email_domain(email) != ALLOWED_EMAIL_DOMAIN:
        raise HTTPException(
            status_code=403,
            detail=f'Only {ALLOWED_EMAIL_DOMAIN} emails are allowed',
        )


def _fetch_supabase_user(access_token):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail='Supabase auth is not configured')

    user_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'apikey': SUPABASE_ANON_KEY,
    }
    try:
        response = requests.get(user_url, headers=headers, timeout=10)
    except requests.RequestException:
        raise HTTPException(status_code=503, detail='Auth provider unavailable')

    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail='Unauthorized')
    if response.status_code == 429:
        raise HTTPException(status_code=503, detail='Auth provider temporarily unavailable')
    if 500 <= response.status_code < 600:
        raise HTTPException(status_code=503, detail='Auth provider unavailable')
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail='Auth provider error')

    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status_code=503, detail='Invalid auth provider response')

    user_id = data.get('id')
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')
    email = (data.get('email') or '').strip().lower()
    _ensure_allowed_email(email)
    return {
        'id': user_id,
        'email': email,
    }


def get_current_user(authorization: str | None = Header(default=None)):
    token = _get_bearer_token(authorization)
    return _fetch_supabase_user(token)


@app.get('/', response_class=HTMLResponse)
def index():
    return _render_gui_html()


@app.get('/typography.css')
def typography_css():
    return Response(content=TYPOGRAPHY_CSS, media_type='text/css')


@app.get('/app/{asset_path:path}')
def app_asset(asset_path: str):
    if '..' in asset_path.split('/'):
        raise HTTPException(status_code=404, detail='Not found')
    asset = APP_ASSET_ROOT.joinpath(asset_path)
    if not asset.is_file():
        raise HTTPException(status_code=404, detail='Not found')
    media_type = mimetypes.guess_type(asset_path)[0] or 'application/octet-stream'
    return Response(content=asset.read_bytes(), media_type=media_type)


@app.post('/api/auth/magic-link', response_model=OkResponse)
def api_send_magic_link(req: MagicLinkRequest):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_AUTH_KEY:
        raise HTTPException(status_code=500, detail='Supabase auth is not configured')

    email = req.email.strip().lower()
    _ensure_allowed_email(email)

    payload = {
        'email': email,
        'create_user': True,
    }
    if req.email_redirect_to:
        payload['email_redirect_to'] = req.email_redirect_to

    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_AUTH_KEY}',
        'Content-Type': 'application/json',
    }
    otp_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/otp"
    try:
        response = requests.post(otp_url, headers=headers, json=payload, timeout=10)
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f'Auth provider unavailable: {exc}')

    if response.status_code >= 400:
        detail = 'Unable to send magic link'
        try:
            data = response.json()
            detail = data.get('error_description') or data.get('msg') or detail
        except ValueError:
            pass
        raise HTTPException(status_code=400, detail=detail)
    return {'ok': True}


@app.get('/api/opinions')
def api_list_conversations(user=Depends(get_current_user)):
    rows = list_conversations(user['id'])
    for row in rows:
        if 'prompt' in row:
            row['prompt'] = _display_prompt(row.get('prompt'))
        if 'title' in row:
            row['title'] = _display_prompt(row.get('title'))
    return rows


@app.get('/api/conversations/{conversation_id}')
def api_get_conversation(conversation_id: str, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    for message in conv.get('messages', []):
        message['prompt'] = _display_prompt(message.get('prompt'))
    return conv


@app.patch('/api/conversations/{conversation_id}', response_model=OkResponse)
def api_rename_conversation(conversation_id: str, req: RenameRequest, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    rename_conversation(user['id'], conversation_id, req.title.strip())
    return {'ok': True}


@app.delete('/api/conversations/{conversation_id}', response_model=OkResponse)
def api_delete_conversation(conversation_id: str, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    delete_conversation(user['id'], conversation_id)
    return {'ok': True}


@app.put('/api/conversations/{conversation_id}/document', response_model=OkResponse)
def api_update_document(conversation_id: str, req: DocumentUpdateRequest, user=Depends(get_current_user)):
    """Update the document content on the latest turn (user direct edit)."""
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    if conv['mode'] not in ('doc', 'doc_plus'):
        raise HTTPException(status_code=400, detail='Not a doc conversation')
    update_latest_document(user['id'], conversation_id, req.document)
    return {'ok': True}


@app.get('/api/settings', response_model=SettingsResponse)
def api_get_settings(user=Depends(get_current_user)):
    settings = get_user_settings(user['id']) or {}
    return {'settings': settings}


@app.put('/api/settings', response_model=OkResponse)
def api_save_settings(req: SettingsRequest, user=Depends(get_current_user)):
    save_user_settings(user['id'], req.settings)
    return {'ok': True}


@app.post('/api/opinions')
def api_create_opinion(req: PromptRequest, user=Depends(get_current_user)):
    user_id = user['id']
    mode, clean_prompt = parse_mode(req.prompt)

    conversation_id = req.conversation_id
    existing_conversation = None
    if conversation_id:
        existing_conversation = get_conversation(user_id, conversation_id)
        if existing_conversation:
            if existing_conversation['mode'] in (
                'consensus',
                'pr',
                'doc',
                'doc_plus',
            ):
                mode = existing_conversation['mode']
                clean_prompt = parse_mode(req.prompt)[1]
            elif mode is None:
                last_msg = (
                    existing_conversation['messages'][-1]
                    if existing_conversation['messages']
                    else None
                )
                mode = last_msg.get('mode', 'chat') if last_msg else 'chat'

    if mode is None:
        mode = 'chat'

    if mode in ('doc', 'doc_plus'):
        try:
            current_doc = None
            active_conversation = existing_conversation
            if conversation_id:
                if not active_conversation:
                    active_conversation = get_conversation(user_id, conversation_id)
                if active_conversation and active_conversation['messages']:
                    for msg in reversed(active_conversation['messages']):
                        if msg.get('document'):
                            current_doc = msg['document']
                            break

            stored_prompt = clean_prompt
            model_prompt = None
            if mode == 'doc_plus':
                profile_context = _resolve_doc_plus_context(active_conversation)
                profile_from_request = (req.doc_plus_context or '').strip()
                if not profile_context:
                    profile_context = profile_from_request
                    if not profile_context:
                        raise HTTPException(status_code=400, detail='doc+ profile is required')
                    stored_prompt = _wrap_doc_plus_prompt(profile_context, clean_prompt)
                model_prompt = f'{profile_context}\n\nUser request: {clean_prompt}'

            result = run_doc(
                stored_prompt,
                keys,
                conversation_id,
                document=current_doc,
                user_id=user_id,
                mode=mode,
                model_prompt=model_prompt,
            )
            resp = {
                'mode': mode,
                'conversation_id': result['conversation_id'],
                'response': result['chat'],
            }
            if result['edits'] is not None:
                resp['edits'] = result['edits']
            if result['document'] is not None:
                resp['document'] = result['document']
            return resp
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    if mode == 'pr':
        def event_stream():
            try:
                for event in run_pr_review_stream(
                    clean_prompt, keys, conversation_id, user_id=user_id
                ):
                    yield f'data: {json.dumps(event)}\n\n'
                    if event.get('event') == 'done':
                        rename_conversation(
                            user_id, event['conversation_id'], f'PR: {clean_prompt}'
                        )
            except Exception as exc:
                yield f"data: {json.dumps({'event': 'error', 'detail': str(exc)})}\n\n"

        return StreamingResponse(event_stream(), media_type='text/event-stream')

    if mode == 'consensus':
        def event_stream():
            try:
                for event in run_opinions_stream(
                    clean_prompt, keys, conversation_id, user_id=user_id
                ):
                    yield f'data: {json.dumps(event)}\n\n'
            except Exception as exc:
                yield f"data: {json.dumps({'event': 'error', 'detail': str(exc)})}\n\n"

        return StreamingResponse(event_stream(), media_type='text/event-stream')

    try:
        result, conv_id = run_chat(
            clean_prompt, keys, conversation_id, mode=mode, user_id=user_id
        )
        return {
            'mode': mode,
            'conversation_id': conv_id,
            'response': result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
