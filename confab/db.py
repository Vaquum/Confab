"""Database models and helpers."""

import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(override=True)


def _resolve_database_url():
    """Resolve database URL with Supabase preference and safe defaults."""
    raw_url = (
        os.environ.get('SUPABASE_DB')
        or os.environ.get('SUPABASE_DB_URL')
        or os.environ.get('DATABASE_URL')
        or 'sqlite:///confab.db'
    ).strip()

    if raw_url.startswith('postgres://'):
        raw_url = raw_url.replace('postgres://', 'postgresql://', 1)

    if raw_url.startswith('postgresql://'):
        raw_url = raw_url.replace('postgresql://', 'postgresql+psycopg://', 1)

    if raw_url.startswith('postgresql+psycopg://') and 'sslmode=' not in raw_url:
        separator = '&' if '?' in raw_url else '?'
        raw_url = f"{raw_url}{separator}sslmode=require"

    return raw_url


DATABASE_URL = _resolve_database_url()

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class Opinion(Base):
    __tablename__ = 'opinions'

    id = Column(Integer, primary_key=True)
    conversation_id = Column(String, nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    mode = Column(String, nullable=False, default='chat')
    prompt = Column(Text, nullable=False)
    response = Column(Text)
    claude_response = Column(Text)
    gpt_response = Column(Text)
    grok_response = Column(Text)
    gemini_response = Column(Text)
    synthesis = Column(Text)
    title = Column(Text)
    document = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Token tracking — single-model chats
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    # Token tracking — consensus individual models
    claude_input_tokens = Column(Integer)
    claude_output_tokens = Column(Integer)
    gpt_input_tokens = Column(Integer)
    gpt_output_tokens = Column(Integer)
    grok_input_tokens = Column(Integer)
    grok_output_tokens = Column(Integer)
    gemini_input_tokens = Column(Integer)
    gemini_output_tokens = Column(Integer)
    # Token tracking — consensus synthesis
    synthesis_input_tokens = Column(Integer)
    synthesis_output_tokens = Column(Integer)


def _migrate_db():
    """Add conversation_id and position columns if missing, backfill existing rows."""
    insp = inspect(engine)
    if 'opinions' not in insp.get_table_names():
        return
    columns = [c['name'] for c in insp.get_columns('opinions')]
    if 'conversation_id' in columns:
        return  # already migrated

    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE opinions ADD COLUMN conversation_id TEXT'))
        conn.execute(text('ALTER TABLE opinions ADD COLUMN position INTEGER DEFAULT 0'))
        # Backfill: each existing row becomes its own conversation
        rows = conn.execute(text('SELECT id FROM opinions WHERE conversation_id IS NULL')).fetchall()
        for row in rows:
            cid = str(uuid.uuid4())
            conn.execute(
                text('UPDATE opinions SET conversation_id = :cid, position = 0 WHERE id = :id'),
                {'cid': cid, 'id': row[0]},
            )


def _migrate_title():
    """Add title column if missing."""
    insp = inspect(engine)
    if 'opinions' not in insp.get_table_names():
        return
    columns = [c['name'] for c in insp.get_columns('opinions')]
    if 'title' in columns:
        return
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE opinions ADD COLUMN title TEXT'))


def _migrate_tokens():
    """Add token tracking columns if missing."""
    insp = inspect(engine)
    if 'opinions' not in insp.get_table_names():
        return
    columns = [c['name'] for c in insp.get_columns('opinions')]
    if 'input_tokens' in columns:
        return
    with engine.begin() as conn:
        for col in [
            'input_tokens', 'output_tokens',
            'claude_input_tokens', 'claude_output_tokens',
            'gpt_input_tokens', 'gpt_output_tokens',
            'grok_input_tokens', 'grok_output_tokens',
            'gemini_input_tokens', 'gemini_output_tokens',
            'synthesis_input_tokens', 'synthesis_output_tokens',
        ]:
            conn.execute(text(f'ALTER TABLE opinions ADD COLUMN {col} INTEGER'))


def _migrate_document():
    """Add document column if missing."""
    insp = inspect(engine)
    if 'opinions' not in insp.get_table_names():
        return
    columns = [c['name'] for c in insp.get_columns('opinions')]
    if 'document' in columns:
        return
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE opinions ADD COLUMN document TEXT'))


def init_db():
    Base.metadata.create_all(engine)
    _migrate_db()
    _migrate_title()
    _migrate_tokens()
    _migrate_document()


def save_chat(conversation_id, position, prompt, response, mode='chat',
              input_tokens=None, output_tokens=None, document=None):
    session = Session()
    try:
        row = Opinion(
            conversation_id=conversation_id,
            position=position,
            mode=mode,
            prompt=prompt,
            response=response,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            document=document,
        )
        session.add(row)
        session.commit()
        return row.id
    finally:
        session.close()


def save_opinion(conversation_id, position, prompt, responses, synthesis,
                 usages=None, synthesis_usage=None, mode='consensus'):
    usages = usages or {}
    synthesis_usage = synthesis_usage or {}
    session = Session()
    try:
        row = Opinion(
            conversation_id=conversation_id,
            position=position,
            mode=mode,
            prompt=prompt,
            claude_response=responses.get('claude'),
            gpt_response=responses.get('gpt'),
            grok_response=responses.get('grok'),
            gemini_response=responses.get('gemini'),
            synthesis=synthesis,
            claude_input_tokens=usages.get('claude', {}).get('input'),
            claude_output_tokens=usages.get('claude', {}).get('output'),
            gpt_input_tokens=usages.get('gpt', {}).get('input'),
            gpt_output_tokens=usages.get('gpt', {}).get('output'),
            grok_input_tokens=usages.get('grok', {}).get('input'),
            grok_output_tokens=usages.get('grok', {}).get('output'),
            gemini_input_tokens=usages.get('gemini', {}).get('input'),
            gemini_output_tokens=usages.get('gemini', {}).get('output'),
            synthesis_input_tokens=synthesis_usage.get('input'),
            synthesis_output_tokens=synthesis_usage.get('output'),
        )
        session.add(row)
        session.commit()
        return row.id
    finally:
        session.close()


def list_conversations():
    """Return one entry per conversation: first prompt as title, latest timestamp."""
    session = Session()
    try:
        rows = (
            session.query(Opinion)
            .filter(Opinion.position == 0)
            .order_by(Opinion.created_at.desc())
            .all()
        )
        return [
            {
                'conversation_id': r.conversation_id,
                'mode': r.mode or 'consensus',
                'title': r.title or r.prompt,
                'prompt': r.prompt,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        session.close()


def rename_conversation(conversation_id, title):
    """Set a custom title on a conversation (stored on position=0 row)."""
    session = Session()
    try:
        row = (
            session.query(Opinion)
            .filter(Opinion.conversation_id == conversation_id, Opinion.position == 0)
            .first()
        )
        if row:
            row.title = title
            session.commit()
    finally:
        session.close()


def delete_conversation(conversation_id):
    """Delete all messages in a conversation."""
    session = Session()
    try:
        session.query(Opinion).filter(
            Opinion.conversation_id == conversation_id
        ).delete()
        session.commit()
    finally:
        session.close()


def get_conversation(conversation_id):
    """Return all messages in a conversation, ordered by position."""
    session = Session()
    try:
        rows = (
            session.query(Opinion)
            .filter(Opinion.conversation_id == conversation_id)
            .order_by(Opinion.position)
            .all()
        )
        if not rows:
            return None

        first_mode = rows[0].mode or 'consensus'
        messages = []
        for r in rows:
            msg_mode = r.mode or first_mode
            msg = {
                'id': r.id,
                'position': r.position,
                'mode': msg_mode,
                'prompt': r.prompt,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            }
            if msg_mode in ('consensus', 'pr'):
                msg['synthesis'] = r.synthesis
            else:
                msg['response'] = r.response
            if r.document is not None:
                msg['document'] = r.document
            messages.append(msg)

        return {
            'conversation_id': conversation_id,
            'mode': first_mode,
            'messages': messages,
        }
    finally:
        session.close()


def update_latest_document(conversation_id, document):
    """Update the document content on the latest turn of a conversation."""
    session = Session()
    try:
        row = (
            session.query(Opinion)
            .filter(Opinion.conversation_id == conversation_id)
            .order_by(Opinion.position.desc())
            .first()
        )
        if row:
            row.document = document
            session.commit()
    finally:
        session.close()
