"""Confab API server."""

import json
import os
from importlib.resources import files
from pathlib import Path

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from pydantic import BaseModel

if __package__:
    from .core import (
        get_keys,
        parse_mode,
        run_chat,
        run_doc,
        run_opinions_stream,
        run_pr_review_stream,
    )
    from .db import (
        delete_conversation,
        get_conversation,
        get_user_settings,
        init_db,
        list_conversations,
        rename_conversation,
        save_user_settings,
        update_latest_document,
    )
    STATIC_ROOT = files('confab').joinpath('static')
else:
    from core import (
        get_keys,
        parse_mode,
        run_chat,
        run_doc,
        run_opinions_stream,
        run_pr_review_stream,
    )
    from db import (
        delete_conversation,
        get_conversation,
        get_user_settings,
        init_db,
        list_conversations,
        rename_conversation,
        save_user_settings,
        update_latest_document,
    )
    STATIC_ROOT = Path(__file__).resolve().parent / 'static'

app = FastAPI(title='Confab API')

keys, missing = get_keys()
if missing:
    raise RuntimeError(f"Missing API keys: {', '.join(missing)}")

init_db()

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

GUI_HTML_TEMPLATE = STATIC_ROOT.joinpath('gui.html').read_text(encoding='utf-8')
TYPOGRAPHY_CSS = STATIC_ROOT.joinpath('typography.css').read_text(encoding='utf-8')


def _render_gui_html():
    return (
        GUI_HTML_TEMPLATE
        .replace('__SUPABASE_URL__', json.dumps(SUPABASE_URL or ''))
        .replace('__SUPABASE_ANON_KEY__', json.dumps(SUPABASE_ANON_KEY or ''))
    )


def _get_bearer_token(authorization):
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing authorization')
    parts = authorization.split(' ', 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer' or not parts[1]:
        raise HTTPException(status_code=401, detail='Invalid authorization header')
    return parts[1]


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
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail=f'Auth provider unavailable: {exc}')
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail='Unauthorized')
    data = response.json()
    user_id = data.get('id')
    if not user_id:
        raise HTTPException(status_code=401, detail='Unauthorized')
    return {
        'id': user_id,
        'email': data.get('email'),
    }


def get_current_user(authorization: str | None = Header(default=None)):
    token = _get_bearer_token(authorization)
    return _fetch_supabase_user(token)


class PromptRequest(BaseModel):
    prompt: str
    conversation_id: str | None = None


class RenameRequest(BaseModel):
    title: str


class DocumentUpdateRequest(BaseModel):
    document: str


class SettingsRequest(BaseModel):
    settings: dict


@app.get('/', response_class=HTMLResponse)
def index():
    return _render_gui_html()


@app.get('/typography.css')
def typography_css():
    return Response(content=TYPOGRAPHY_CSS, media_type='text/css')


@app.get('/api/opinions')
def api_list_conversations(user=Depends(get_current_user)):
    return list_conversations(user['id'])


@app.get('/api/conversations/{conversation_id}')
def api_get_conversation(conversation_id: str, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    return conv


@app.patch('/api/conversations/{conversation_id}')
def api_rename_conversation(conversation_id: str, req: RenameRequest, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    rename_conversation(user['id'], conversation_id, req.title.strip())
    return {'ok': True}


@app.delete('/api/conversations/{conversation_id}')
def api_delete_conversation(conversation_id: str, user=Depends(get_current_user)):
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    delete_conversation(user['id'], conversation_id)
    return {'ok': True}


@app.put('/api/conversations/{conversation_id}/document')
def api_update_document(conversation_id: str, req: DocumentUpdateRequest, user=Depends(get_current_user)):
    """Update the document content on the latest turn (user direct edit)."""
    conv = get_conversation(user['id'], conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    if conv['mode'] != 'doc':
        raise HTTPException(status_code=400, detail='Not a doc conversation')
    update_latest_document(user['id'], conversation_id, req.document)
    return {'ok': True}


@app.get('/api/settings')
def api_get_settings(user=Depends(get_current_user)):
    settings = get_user_settings(user['id']) or {}
    return {'settings': settings}


@app.put('/api/settings')
def api_save_settings(req: SettingsRequest, user=Depends(get_current_user)):
    save_user_settings(user['id'], req.settings)
    return {'ok': True}


@app.post('/api/opinions')
def api_create_opinion(req: PromptRequest, user=Depends(get_current_user)):
    user_id = user['id']
    mode, clean_prompt = parse_mode(req.prompt)

    conversation_id = req.conversation_id
    if conversation_id:
        conv = get_conversation(user_id, conversation_id)
        if conv:
            if conv['mode'] in ('consensus', 'pr'):
                mode = conv['mode']
                clean_prompt = parse_mode(req.prompt)[1]
            elif conv['mode'] == 'doc':
                mode = 'doc'
                clean_prompt = parse_mode(req.prompt)[1]
            elif mode is None:
                last_msg = conv['messages'][-1] if conv['messages'] else None
                mode = last_msg.get('mode', 'chat') if last_msg else 'chat'

    if mode is None:
        mode = 'chat'

    if mode == 'doc':
        try:
            current_doc = None
            if conversation_id:
                existing = get_conversation(user_id, conversation_id)
                if existing and existing['messages']:
                    for msg in reversed(existing['messages']):
                        if msg.get('document'):
                            current_doc = msg['document']
                            break

            result = run_doc(
                clean_prompt, keys, conversation_id, document=current_doc, user_id=user_id
            )
            resp = {
                'mode': 'doc',
                'conversation_id': result['conversation_id'],
                'response': result['chat'],
            }
            if result['edits'] is not None:
                resp['edits'] = result['edits']
            if result['document'] is not None:
                resp['document'] = result['document']
            return resp
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
