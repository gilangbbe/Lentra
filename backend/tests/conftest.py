"""
Pytest Configuration and Fixtures

Shared fixtures for all backend tests.
"""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Create a synchronous test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an asynchronous test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def sample_prompt() -> str:
    """Sample prompt for testing."""
    return "Explain quantum computing in simple terms."


@pytest.fixture
def sample_model_response() -> dict[str, Any]:
    """Sample model response for testing."""
    return {
        "model_id": "test-model",
        "text": "Quantum computing uses quantum mechanics to perform calculations.",
        "latency_ms": 500.0,
        "tokens": 10,
        "prompt_tokens": 8,
        "finish_reason": "stop",
        "metadata": {},
    }


@pytest.fixture
def sample_responses(sample_model_response: dict[str, Any]) -> list[dict[str, Any]]:
    """Multiple sample responses for comparison testing."""
    return [
        sample_model_response,
        {
            **sample_model_response,
            "model_id": "test-model-2",
            "text": "Quantum computers leverage quantum bits (qubits) that can exist in multiple states simultaneously.",
            "latency_ms": 750.0,
            "tokens": 15,
        },
    ]


@pytest.fixture
def mock_ollama_response() -> dict[str, Any]:
    """Mock response from Ollama API."""
    return {
        "model": "llama3.1:8b",
        "response": "This is a test response.",
        "done": True,
        "prompt_eval_count": 10,
        "eval_count": 20,
        "total_duration": 1000000000,
        "context": [1, 2, 3],
    }


@pytest.fixture
def mock_ollama_models() -> dict[str, Any]:
    """Mock model list from Ollama API."""
    return {
        "models": [
            {
                "name": "llama3.1:8b",
                "modified_at": "2024-01-01T00:00:00Z",
                "size": 4000000000,
                "details": {
                    "format": "gguf",
                    "family": "llama",
                    "context_length": 4096,
                },
            },
            {
                "name": "mistral:7b",
                "modified_at": "2024-01-01T00:00:00Z",
                "size": 3500000000,
                "details": {
                    "format": "gguf",
                    "family": "mistral",
                    "context_length": 8192,
                },
            },
        ]
    }
