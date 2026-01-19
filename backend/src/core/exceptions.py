"""
Custom Exception Classes

Defines application-specific exceptions with proper HTTP status codes
and error messages for consistent error handling.
"""

from typing import Any


class LentraException(Exception):
    """
    Base exception for all Lentra-specific errors.
    
    Attributes:
        message: Human-readable error message.
        status_code: HTTP status code to return.
        details: Additional error context.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for JSON response."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
        }


class ValidationError(LentraException):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, status_code=422, details=details)


class ModelNotFoundError(LentraException):
    """Raised when a requested model is not available."""

    def __init__(
        self,
        model_id: str,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message=message or f"Model '{model_id}' not found",
            status_code=404,
            details={"model_id": model_id},
        )


class ModelConnectionError(LentraException):
    """Raised when connection to a model backend fails."""

    def __init__(
        self,
        backend: str,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message=message or f"Failed to connect to {backend} backend",
            status_code=503,
            details={"backend": backend},
        )


class RAGError(LentraException):
    """Raised when RAG operations fail."""

    def __init__(
        self,
        operation: str,
        message: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message or f"RAG operation '{operation}' failed",
            status_code=500,
            details={"operation": operation, **(details or {})},
        )


class EvaluationError(LentraException):
    """Raised when evaluation/comparison fails."""

    def __init__(
        self,
        strategy: str,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message=message or f"Evaluation with strategy '{strategy}' failed",
            status_code=500,
            details={"strategy": strategy},
        )


class ModelTimeoutError(LentraException):
    """Raised when model generation times out."""

    def __init__(
        self,
        model_id: str,
        timeout: float,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message=message or f"Model '{model_id}' timed out after {timeout}s",
            status_code=504,
            details={"model_id": model_id, "timeout": timeout},
        )


class RateLimitExceededError(LentraException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        retry_after: int = 60,
    ) -> None:
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            status_code=429,
            details={"retry_after": retry_after},
        )
