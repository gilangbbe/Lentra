"""
Schemas Package

Pydantic models for request/response validation and serialization.
"""

from src.schemas.evaluation import (
    EvaluateRequest,
    EvaluateResponse,
    EvaluationScore,
)
from src.schemas.model import (
    ModelConfig,
    ModelInfo,
    ModelResponse,
)
from src.schemas.prompt import (
    PromptRequest,
    PromptResponse,
)
from src.schemas.rag import (
    DocumentChunk,
    RAGQueryRequest,
    RAGQueryResponse,
)

__all__ = [
    # Prompt
    "PromptRequest",
    "PromptResponse",
    # Model
    "ModelConfig",
    "ModelInfo",
    "ModelResponse",
    # RAG
    "RAGQueryRequest",
    "RAGQueryResponse",
    "DocumentChunk",
    # Evaluation
    "EvaluateRequest",
    "EvaluateResponse",
    "EvaluationScore",
]
