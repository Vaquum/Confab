"""Attachment prompt builders."""


def attachment_marker() -> str:
    """Return the attachment block marker."""
    return '[ATTACHMENTS]'


def attachment_label_prefix() -> str:
    """Return the per-attachment label prefix."""
    return 'Attachment: '


def build_attachment_prompt(raw_prompt: str, attachments: list[dict[str, str]]) -> str:
    """Build the prompt text used for attachment-aware model input."""
    if not attachments:
        return raw_prompt
    sections = [
        f"{attachment_label_prefix()}{attachment['name']}\n---\n{attachment['content']}"
        for attachment in attachments
    ]
    attachment_block = '\n\n'.join(sections)
    if not raw_prompt:
        return f'{attachment_marker()}\n\n{attachment_block}'
    return f'{raw_prompt}\n\n{attachment_marker()}\n\n{attachment_block}'


def build_attachment_prompting_config() -> dict[str, str]:
    """Return attachment prompt config needed by the frontend."""
    return {
        'marker': attachment_marker(),
        'labelPrefix': attachment_label_prefix(),
    }
