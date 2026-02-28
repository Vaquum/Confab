"""Confab API server."""

import json
from importlib.resources import files
from pathlib import Path

from fastapi import FastAPI, HTTPException
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
        init_db,
        list_conversations,
        get_conversation,
        delete_conversation,
        rename_conversation,
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
        init_db,
        list_conversations,
        get_conversation,
        delete_conversation,
        rename_conversation,
        update_latest_document,
    )
    STATIC_ROOT = Path(__file__).resolve().parent / 'static'

app = FastAPI(title='Confab API')

keys, missing = get_keys()
if missing:
    raise RuntimeError(f"Missing API keys: {', '.join(missing)}")

init_db()

GUI_HTML = STATIC_ROOT.joinpath('gui.html').read_text(encoding='utf-8')
TYPOGRAPHY_CSS = STATIC_ROOT.joinpath('typography.css').read_text(encoding='utf-8')


class PromptRequest(BaseModel):
    prompt: str
    conversation_id: str | None = None


@app.get('/', response_class=HTMLResponse)
def index():
    return GUI_HTML


@app.get('/typography.css')
def typography_css():
    return Response(content=TYPOGRAPHY_CSS, media_type='text/css')


@app.get('/api/opinions')
def api_list_conversations():
    return list_conversations()


@app.get('/api/conversations/{conversation_id}')
def api_get_conversation(conversation_id: str):
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    return conv


class RenameRequest(BaseModel):
    title: str


@app.patch('/api/conversations/{conversation_id}')
def api_rename_conversation(conversation_id: str, req: RenameRequest):
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    rename_conversation(conversation_id, req.title.strip())
    return {'ok': True}


@app.delete('/api/conversations/{conversation_id}')
def api_delete_conversation(conversation_id: str):
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    delete_conversation(conversation_id)
    return {'ok': True}


class DocumentUpdateRequest(BaseModel):
    document: str


@app.put('/api/conversations/{conversation_id}/document')
def api_update_document(conversation_id: str, req: DocumentUpdateRequest):
    """Update the document content on the latest turn (user direct edit)."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail='Not found')
    if conv['mode'] != 'doc':
        raise HTTPException(status_code=400, detail='Not a doc conversation')
    update_latest_document(conversation_id, req.document)
    return {'ok': True}


@app.post('/api/opinions')
def api_create_opinion(req: PromptRequest):
    mode, clean_prompt = parse_mode(req.prompt)

    conversation_id = req.conversation_id
    if conversation_id:
        conv = get_conversation(conversation_id)
        if conv:
            # Consensus/PR stays locked — structurally different
            if conv['mode'] in ('consensus', 'pr'):
                mode = 'consensus'
                clean_prompt = parse_mode(req.prompt)[1]
            # Doc mode stays locked
            elif conv['mode'] == 'doc':
                mode = 'doc'
                clean_prompt = parse_mode(req.prompt)[1]
            # No prefix → inherit last message's mode
            elif mode is None:
                last_msg = conv['messages'][-1] if conv['messages'] else None
                mode = last_msg.get('mode', 'chat') if last_msg else 'chat'

    # Final fallback — no conversation context and no prefix
    if mode is None:
        mode = 'chat'

    # --- Document mode ---
    if mode == 'doc':
        try:
            current_doc = None
            if conversation_id:
                existing = get_conversation(conversation_id)
                if existing and existing['messages']:
                    for msg in reversed(existing['messages']):
                        if msg.get('document'):
                            current_doc = msg['document']
                            break

            result = run_doc(
                clean_prompt, keys, conversation_id, document=current_doc
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
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- SSE streaming for PR and consensus ---
    if mode == 'pr':
        def event_stream():
            try:
                for event in run_pr_review_stream(clean_prompt, keys, conversation_id):
                    yield f'data: {json.dumps(event)}\n\n'
                    if event.get('event') == 'done':
                        rename_conversation(event['conversation_id'], f'PR: {clean_prompt}')
            except Exception as e:
                yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"

        return StreamingResponse(event_stream(), media_type='text/event-stream')

    if mode == 'consensus':
        def event_stream():
            try:
                for event in run_opinions_stream(clean_prompt, keys, conversation_id):
                    yield f'data: {json.dumps(event)}\n\n'
            except Exception as e:
                yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"

        return StreamingResponse(event_stream(), media_type='text/event-stream')

    # --- JSON for chat modes ---
    try:
        result, conv_id = run_chat(
            clean_prompt, keys, conversation_id, mode=mode
        )
        return {
            'mode': mode,
            'conversation_id': conv_id,
            'response': result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
