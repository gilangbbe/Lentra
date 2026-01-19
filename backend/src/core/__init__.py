"""
Core Module

Contains application configuration, logging setup, and shared utilities.
"""

from src.core.config import settings
from src.core.exceptions import (
    LentraException,
    ModelNotFoundError,
    RAGError,
    ValidationError,
)
from src.core.logging import get_logger

__all__ = [
    "settings",
    "get_logger",
    "LentraException",
    "ModelNotFoundError",
    "RAGError",
    "ValidationError",
]
