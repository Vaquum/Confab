"""Centralized prompting exports."""

from .attachments import (
    attachment_label_prefix,
    attachment_marker,
    build_attachment_prompt,
    build_attachment_prompting_config,
)
from .client import build_prompting_client_config
from .doc_plus import (
    build_doc_plus_context,
    build_doc_plus_model_prompt,
    build_doc_plus_prompting_config,
    default_doc_plus_profile,
    doc_plus_background,
    doc_plus_context_footer,
    doc_plus_context_header,
    doc_plus_levels,
    doc_plus_user_prompt_header,
    extract_doc_plus_context,
    extract_doc_plus_user_prompt,
    normalize_doc_plus_profile,
    wrap_doc_plus_prompt,
)
from .documents import (
    build_document_request_payload,
    build_document_user_prompt,
    document_system_directive,
)
from .pr_review import (
    build_pr_file_section,
    build_pr_review_content,
    build_pr_review_prompt,
    compact_patch,
    pr_description_fallback,
    pr_review_directive,
)
from .synthesis import (
    build_synthesis_prompt,
    consensus_synthesis_prompt,
    pr_synthesis_directive,
)

__all__ = [
    'attachment_label_prefix',
    'attachment_marker',
    'build_attachment_prompt',
    'build_attachment_prompting_config',
    'build_doc_plus_context',
    'build_doc_plus_model_prompt',
    'build_doc_plus_prompting_config',
    'build_document_request_payload',
    'build_document_user_prompt',
    'build_pr_file_section',
    'build_pr_review_content',
    'build_pr_review_prompt',
    'build_prompting_client_config',
    'build_synthesis_prompt',
    'compact_patch',
    'consensus_synthesis_prompt',
    'default_doc_plus_profile',
    'doc_plus_background',
    'doc_plus_context_footer',
    'doc_plus_context_header',
    'doc_plus_levels',
    'doc_plus_user_prompt_header',
    'document_system_directive',
    'extract_doc_plus_context',
    'extract_doc_plus_user_prompt',
    'normalize_doc_plus_profile',
    'pr_description_fallback',
    'pr_review_directive',
    'pr_synthesis_directive',
    'wrap_doc_plus_prompt',
]
