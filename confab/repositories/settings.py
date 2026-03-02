"""Settings repository wrappers."""

from ..db import get_user_settings, save_user_settings

__all__ = [
    'get_user_settings',
    'save_user_settings',
]
