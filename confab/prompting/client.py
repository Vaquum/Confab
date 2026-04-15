"""Frontend-facing prompting config builders."""

from .attachments import build_attachment_prompting_config
from .doc_plus import build_doc_plus_prompting_config


def build_prompting_client_config() -> dict[str, dict]:
    """Return prompting config injected into the browser client."""
    return {
        'attachments': build_attachment_prompting_config(),
        'docPlus': build_doc_plus_prompting_config(),
    }
