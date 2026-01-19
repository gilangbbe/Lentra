"""
Tests for the /prompt endpoint.
"""

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.schemas.model import ModelResponse


class TestPromptEndpoint:
    """Tests for POST /prompt."""
    
    def test_prompt_validation_empty(self, client: TestClient) -> None:
        """Empty prompt should fail validation."""
        response = client.post(
            "/prompt",
            json={"prompt": "", "model_ids": ["test"]},
        )
        
        assert response.status_code == 422
    
    def test_prompt_validation_too_long(self, client: TestClient) -> None:
        """Very long prompt should fail validation."""
        response = client.post(
            "/prompt",
            json={"prompt": "x" * 50000, "model_ids": ["test"]},
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_prompt_success(
        self,
        async_client: Any,
        sample_prompt: str,
    ) -> None:
        """Successful prompt returns model responses."""
        mock_response = ModelResponse(
            model_id="test-model",
            text="Test response",
            latency_ms=100.0,
            tokens=10,
        )
        
        with patch(
            "src.api.routes.prompt.get_model_runner"
        ) as mock_get_runner:
            runner = AsyncMock()
            runner.list_available_models.return_value = [
                AsyncMock(id="test-model")
            ]
            runner.generate.return_value = mock_response
            mock_get_runner.return_value = runner
            
            response = await async_client.post(
                "/prompt",
                json={
                    "prompt": sample_prompt,
                    "model_ids": ["test-model"],
                },
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["prompt"] == sample_prompt
            assert len(data["responses"]) == 1
            assert data["responses"][0]["model_id"] == "test-model"
    
    @pytest.mark.asyncio
    async def test_prompt_no_models_available(
        self,
        async_client: Any,
        sample_prompt: str,
    ) -> None:
        """Returns 503 when no models available."""
        with patch(
            "src.api.routes.prompt.get_model_runner"
        ) as mock_get_runner:
            runner = AsyncMock()
            runner.list_available_models.return_value = []
            mock_get_runner.return_value = runner
            
            response = await async_client.post(
                "/prompt",
                json={"prompt": sample_prompt},
            )
            
            assert response.status_code == 503
