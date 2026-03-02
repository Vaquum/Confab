"""API request and response contracts."""

from typing import Any

from pydantic import BaseModel


class PromptRequest(BaseModel):
    prompt: str
    conversation_id: str | None = None
    doc_plus_context: str | None = None
    mode: str | None = None


class RenameRequest(BaseModel):
    title: str


class DocumentUpdateRequest(BaseModel):
    document: str


class SettingsRequest(BaseModel):
    settings: dict[str, Any]


class MagicLinkRequest(BaseModel):
    email: str
    email_redirect_to: str | None = None


class OkResponse(BaseModel):
    ok: bool


class SettingsResponse(BaseModel):
    settings: dict[str, Any]
