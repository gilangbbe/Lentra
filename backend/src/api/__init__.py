"""
API Routes Package

Contains all FastAPI route handlers organized by domain.
"""

from src.api.routes import evaluate, models, prompt, rag

__all__ = ["prompt", "models", "rag", "evaluate"]
